'use strict';

//
//  CommonSetting
//

// Description:
// ツール選択を変えても変化しない、描画処理共通の設定を表す。

/// 新しいインスタンスを初期化する。
function CommonSetting(nlayers)
{
  // 設定値
  this.m_color = 'rgb(0, 0, 0)';        // 描画色
  this.m_thickness = 1;                 // 線幅
  this.m_curLayerNo = nlayers - 1;      // カレントレイヤー
  this.m_layerVisibility = [ ];         // レイヤーの可視属性
  for (let i = 0; i < nlayers; ++i) {
    this.m_layerVisibility[i] = true;
  }

  // Selection boxとの連動(暫定処置)
  this.m_thicknessSelector = new ThicknessSelector();
}

// Getter, Setter
CommonSetting.prototype.getColor = function() { return this.m_color; }
CommonSetting.prototype.setColor = function(value) { this.m_color = value; }
CommonSetting.prototype.getThickness = function() {
  this.m_thickness = this.m_thicknessSelector.getThickness();
  return this.m_thickness;
}
CommonSetting.prototype.setThickness = function(value) {
  this.m_thickness = value;
  this.m_thicknessSelector.setThickness(this.m_thickness);
}

//
//  ToolChain
//

// Description:
// ツールパレット上で同一区画(bounds)を占めるツール群を保持する。
// ツールへのイベント発行を行う。

/// 新しいインスタンスを初期化する。
function ToolChain(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_tools = [];
  this.m_curToolNo = 0;
  this.m_bActive = false;
  this.m_lastEvent = null;
}

/// ツール選択時にツールパレットから呼ばれる。
ToolChain.prototype.OnSelection = function(e)
{
  let bHit = false;
  let bIncludes = rect_includes(this.m_iconBounds, e.m_point);
  // console.dir(this.m_iconBounds);
  // console.dir(e.m_point);

  // 場合分け
  let action = null;
  let cur_idx = null;
  let nxt_idx = null;
  if (!this.m_bActive) {  // (非選択状態)
    if (bIncludes && this.m_tools.length > 0) {
      bHit = true;
      action = 1;         // カレントツールのアクティブ化
      cur_idx = this.m_curToolNo;
    }
  } else {                // (選択状態)
    cur_idx = this.m_curToolNo;
    if (bIncludes) {
      bHit = true;

      // 次のツールがあるか?
      nxt_idx = (cur_idx + 1) % this.m_tools.length;
      if (nxt_idx == cur_idx) {
        action = 2;       // カレントツールのpick
      } else {
        action = 3;       // 当ツールチェーン内の次のツールに変更
      }
    } else {
      action = 4;         // 当ツールチェーンの選択解除
    }
  }
  // console.log("action=" + action);

  // イベント発行
  if (action != null) {
    // イベントオブジェクト構成
    // ツールからgetIconBounds()を呼べるように、
    // e.m_senderは当オブジェクトに書き換える。
    let mod_e = Object.assign({}, e);
    this.m_lastEvent = Object.assign({}, mod_e);		 // 値コピー
    mod_e.m_sender = this;  // e.m_sender書き換え。
    // this.m_lastEvent.m_senderは書き換え前の値を保持する。

    // イベント発行
    switch (action) {
    case 1:   // カレントツールのアクティブ化
      this.m_bActive = true;
      this.m_tools[cur_idx].OnSelected(mod_e);
      break;
    case 2:   // カレントツールのpick
      assert(this.m_bActive);
      this.m_tools[cur_idx].OnPicked(mod_e);
      break;
    case 3:   // 当ツールチェーン内の次のツールに変更
      assert(this.m_bActive);
      this.m_tools[cur_idx].OnDiselected(mod_e);
      this.m_curToolNo = nxt_idx;
      this.m_tools[nxt_idx].OnSelected(mod_e);
      break;
    case 4:   // 当ツールチェーンの選択解除
      this.m_tools[cur_idx].OnDiselected(mod_e);
      this.m_bActive = false;
      break;
    default:
      assert(false);
      break;
    }
  }

  return bHit;
}

/// ツールを追加する。
/// toolObjはOnSelected(), OnPicked(), OnDiselected()の3メソッドを備える前提。
ToolChain.prototype.addTool = function(toolObj)
{
  let end_idx = this.m_tools.length;
  this.m_tools[end_idx] = toolObj;
}

/// 描画ツールを設定する。
/// イベント通知を受けたツールから呼ばれる想定。
ToolChain.prototype.setDrawer = function(drawer)
{
  return this.m_lastEvent.m_sender.setDrawer(drawer);
}

/// ツールパレットのキャンバス(ツールアイコンの描画先)を取得する。
/// イベント通知を受けたツールから呼ばれる想定。
ToolChain.prototype.getToolPaletteCanvas = function()
{
  return this.m_lastEvent.m_sender.getToolPaletteCanvas();
}

/// ツールに対しアイコン用に割り当てられた領域を取得する。
/// 座標はキャンバスローカルな座標。(そのまま描画に使える。)
/// イベント通知を受けたツールから呼ばれる想定。
ToolChain.prototype.getIconBounds = function()
{
  return this.m_iconBounds;
}

//
//  ToolPalette
//

// ■ ToolPalette
// 複数のツールを保持し、アクティブか否かを変更する。
// ツールに対するポインタイベントがあれば、当該ツールや関連するツールに通知する。
// アクティブなツールにキャンバスからのポインタイベントを配送する。

const g_toolMap = [
  // px1'	py1'	width	height
  [  0,   0, 50, 21 ],  // [ 0] 鉛筆 ...
  [  0,  22, 50, 21 ],  // [ 1] トーン ...
  [  0,  44, 50, 21 ],  // [ 2] 四角 ...
  [  0,  66, 50, 21 ],  // [ 3] コピー ...
  [  0,  88, 50, 21 ],  // [ 4] 消しペン ...
  [  0, 110, 50, 21 ],  // [ 5] 手書き ...
  [  0, 132, 50, 21 ],  // [ 6] 通常 ...
  [  0, 154, 24, 20 ],  // [ 7] 白色
  [ 26, 154, 24, 20 ],  // [ 8] 黒色
  [  0, 175, 24, 20 ],  // [ 9] 灰色
  [ 26, 175, 24, 20 ],  // [10] 茶色
  [  0, 196, 24, 20 ],  // [11] 紫色
  [ 26, 196, 24, 20 ],  // [12] 紅色
  [  0, 217, 24, 20 ],  // [13] 青色
  [ 26, 217, 24, 20 ],  // [14] ピンク色
  [  0, 238, 24, 20 ],  // [15] 黄色
  [ 26, 238, 24, 20 ],  // [16] 水色
  [  0, 259, 24, 20 ],  // [17] 緑色
  [ 26, 259, 24, 20 ],  // [18] 橙色
  [  0, 280, 24, 20 ],  // [19] 肌色1
  [ 26, 280, 24, 20 ],  // [20] 肌色2
  [  0, 301, 50, 15 ],  // [21] R
  [  0, 317, 50, 15 ],  // [22] G
  [  0, 333, 50, 15 ],  // [23] B
  [  0, 349, 50, 15 ],  // [24] A
  [  0, 365, 50, 35 ],  // [25] px_width
  [  0, 402, 50, 15 ],  // [26] bk_wt1_wt5
  [  0, 421, 50, 22 ]   // [27] Layer
];

/// ツール登録のためのヘルパ関数。
function addToolHelper(toolChain, toolName)
{
  let iconBounds = toolChain.getIconBounds();
  let cmd = "toolChain.addTool(new " + toolName + "(iconBounds))";
  eval(cmd);
}

/// 新しいインスタンスを初期化する。
function ToolPalette(pictCanvas)
{
  // DOMオブジェクト取得
	this.m_palette = document.getElementById("tool_palette");

  // 関連オブジェクト記憶
  this.m_pictCanvas = pictCanvas;

  // 初期化パラメータ
  const n = g_toolMap.length;
  const nlayers = this.m_pictCanvas.m_layers.length;

  // ツールマップ作成
  // sx, sy, ex, eyは領域全体の左上点と右下終端点を示し、
  // 直後に行うパレット大きさ調整に使う。
  this.m_toolMap = [];
  let sx, sy, ex, ey;
  {
    let rect = g_toolMap[0];    // Alias
    sx = rect[0], sy = rect[1], ex = rect[2], ey = rect[3];
  }
  for (let i = 0; i < n; ++i) {
    let rect = g_toolMap[i];    // Alias
    sx = Math.min(sx, rect[0]);
    sy = Math.min(sy, rect[1]);
    ex = Math.max(ex, rect[0] + rect[2]);
    ey = Math.max(ey, rect[1] + rect[3]);
    let iconBounds = jsRect(rect[0], rect[1], rect[2] - 1, rect[3] - 1);
    this.m_toolMap[i] = new ToolChain(iconBounds);
    // console.dir(toolBounds[i]);
  }

  // パレットの大きさ調整
  // console.log("sx=" + sx + ", sy=" + sy);
  assert(sx == 0 && sy == 0);
  let width = ex;
  let height = ey;
  this.m_palette.setAttribute('width', width);
  this.m_palette.setAttribute('height', height);

  // 共通設定メモリ準備
  this.m_setting = new CommonSetting(this.m_view_port);

  // パレット初期描画
  // このステップは暫定処置で、将来的には無くす予定。
  // (ツールアイコン区画内の描画は個々のツールに完全委譲する。)
	{
		let ctx = this.m_palette.getContext('2d');
		ctx.fillStyle = "rgba(232, 239, 255, 255)";
		ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgb(0, 0, 0)";
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.lineWidth = 1;
    for (let i = 0; i < this.m_toolMap.length; ++i) {
      let rect = this.m_toolMap[i].getIconBounds();
      // console.dir(rect);
      if (true) {   // この条件はtrue/falseどちらでも良い。
        // HTML5の矩形描画機能を使用
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
      } else {
        // 自作のdraw_rect_R()使用
        draw_rect_R(rect.x, rect.y, rect.width, rect.height, ctx, 1);
      }
    }
	}

  // ツールアイコン区画をツールに割付け
  addToolHelper(this.m_toolMap[0], 'PencilTool');

  // 最初のツールをアクティブ化
  let tg_idx = 0;
  let drawArea = this.getBoundingDrawAreaRect();
  let iconBounds = this.m_toolMap[tg_idx].getIconBounds();
  let dummy_e = {
    clientX: drawArea.x + iconBounds.x + iconBounds.width / 2,
    clientY: drawArea.y + iconBounds.y + iconBounds.height / 2
  };
  let mod_e = new PointingEvent(this, dummy_e);
  this.m_toolMap[tg_idx].OnSelection(mod_e);

	// イベントハンドラ登録
	register_pointer_event_handler(this.m_palette, this);
}

/// イベントリスナ。
ToolPalette.prototype.handleEvent = function(e)
{
	// console.log("ToolPalette::handleEvent: " + e.type);
	// console.dir(e);

  // クリックまたはタッチ開始以外のイベントを無視
  if (!(e.type == 'mousedown' || e.type == 'touchstart' ))
    return;

  // 描画ツールに引き渡す情報を構成
	let mod_e = new PointingEvent(this, e);
	this.m_lastEvent = Object.assign({}, mod_e);		// 値コピー
  // console.dir(this.m_lastEvent);

  // ツールチェーン群に通知
  for (let i = 0; i < this.m_toolMap.length; ++i) {
    // console.log("ToolPalette: i=" + i);
    let bHit = this.m_toolMap[i].OnSelection(mod_e);
    if (bHit) {
      console.log("bHit: i=" + i);
      break;
    }
  }
}

/// 描画ツールを設定する。
ToolPalette.prototype.setDrawer = function(drawer)
{
  return this.m_pictCanvas.setDrawer(drawer);
}

/// ツールパレットのキャンバス(ツールアイコンの描画先)を取得する。
ToolPalette.prototype.getToolPaletteCanvas = function()
{
  return this.m_palette;
}

/// 描画領域の絶対座標を返す。
ToolPalette.prototype.getBoundingDrawAreaRect = function()
{
  // ツールパレットはpad幅0なので、client boudsが即draw area boundsである。
  let bounds = this.m_palette.getBoundingClientRect();
	return bounds;
}
