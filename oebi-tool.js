// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

//
//  PencilTool
//

const textPencilTool = '鉛筆';

/// 新しいインスタンスを初期化する。
function PencilTool(rect)
{
  this.m_iconBounds = rect;

  // this.m_drawOp = new NullDrawOp();
  this.m_drawOp = new DrawOp_FreeHand();
  // this.m_effect = new NullEffect();
  this.m_effect = new Effect_Pencil();
  this.m_cursor = new Cursor_Circle();
  this.m_drawerCore = new DrawerBase(this.m_drawOp, this.m_effect, this.m_cursor);

  this.m_setting = null;
}

/// 選択時呼ばれる。
PencilTool.prototype.OnSelected = function(e)
{
  // console.log("PencilTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

  // 選択時アイコン描画
  draw_icon_wrp(this.m_iconBounds, textPencilTool, null, true, e);

  // 共通設定オブジェクト記憶
  this.m_setting = e.m_sender.getCommonSetting();

  // 描画ツール設定
  e.m_sender.addDrawer(this);
  e.m_sender.addDrawer(this.m_drawerCore);
}

/// 選択解除時呼ばれる。
PencilTool.prototype.OnDiselected = function(e)
{
  // console.log("PencilTool::OnDiselected() called. ");

  // 描画ツール解除
  e.m_sender.removeDrawer(this.m_drawerCore);
  e.m_sender.removeDrawer(this);

  // 非選択時アイコン描画
  draw_icon_wrp(this.m_iconBounds, textPencilTool, null, false, e);
}

/// 再ポイントされたとき呼ばれる。
PencilTool.prototype.OnPicked = function(e)
{
  // console.log("PencilTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  /*NOP*/
}

/// 描画ストローク開始時に呼ばれる。
PencilTool.prototype.OnDrawStart = function(e)
{
  // console.log("PencilTool.OnDrawStart() called.");

  // 最新の描画設定を反映
  let thickness = this.m_setting.getThickness();
  let color = this.m_setting.getColor();
  this.m_effect.setParam(thickness, color);
  this.m_cursor.setParam(thickness, color);
}

//
//  線幅ツール
//

/// 新しいインスタンスを初期化する。
function ThicknessTool(iconBounds)
{
  this.m_slideBar = new MicroSlideBar(
    iconBounds, true,
    'rgb(0,0,0)',
    1, 30, 1,
    "", "px",
    0, 30
  );
}

/// 最初の表示を行う。
ThicknessTool.prototype.show = function(setting, toolCanvas)
{
  let val = setting.getThickness();
  let context = toolCanvas.getContext('2d');
  this.m_slideBar.show(val, context);
}

/// 選択時呼ばれる。
ThicknessTool.prototype.OnSelected = function(e)
{
  // console.log("ThicknessTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let val = e.m_sender.getCommonSetting().getThickness();
  this.m_slideBar.OnSelected(e, val);
}

/// 選択解除時呼ばれる。
ThicknessTool.prototype.OnDiselected = function(e)
{
  // console.log("ThicknessTool::OnDiselected() called. ");
  /*NOP*/
}

/// 再ポイントされたとき呼ばれる。
ThicknessTool.prototype.OnPicked = function(e)
{
  // console.log("ThicknessTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let val = this.m_slideBar.OnPicked(e);

  // 共通設定変更
  let setting = e.m_sender.getCommonSetting();  // Alias
  setting.setThickness(val);
}

//
//  カラーパレット
//

/// 新しいインスタンスを初期化する。
function ColorPalette(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_color = null;

  this.m_setting = null;
  this.m_toolCanvas = null;

  // 画像合成先キャンバス
  // 暫定的に、index.html内のものを使う。
	this.m_joint_canvas = document.getElementById("joint_canvas");
}

/// 最初の表示を行う。
ColorPalette.prototype.show = function(color, bActive, toolCanvas)
{
  let context = toolCanvas.getContext('2d');

  this.m_color = color;
  draw_color_palette(this.m_iconBounds, this.m_color, bActive, context);
}

/// 選択時呼ばれる。
ColorPalette.prototype.OnSelected = function(e)
{
  // console.log("ColorPalette::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

  // アイコン描画(選択状態)
  let context = e.m_sender.getToolPaletteCanvas().getContext('2d');
  draw_color_palette(this.m_iconBounds, this.m_color, true, context);

  // 設定更新
  this.m_setting = e.m_sender.getCommonSetting();
  this.m_setting.setColor(this.m_color);

  // キャンバス記憶
  this.m_toolCanvas = e.m_sender.getToolPaletteCanvas();

  // スポイト操作のための登録
  e.m_sender.addDrawer(this);

  // 設定変更追跡のための登録
  this.m_setting.addListener(this);
}

/// 選択解除時呼ばれる。
ColorPalette.prototype.OnDiselected = function(e)
{
  // console.log("ColorPalette::OnDiselected() called. ");
  let setting = e.m_sender.getCommonSetting();

  // 設定変更追跡のための登録を解除
  setting.removeListener(this);

  // 登録解除
  e.m_sender.removeDrawer(this);

  // アイコン描画(非選択状態)
  let context = e.m_sender.getToolPaletteCanvas().getContext('2d');
  draw_color_palette(this.m_iconBounds, this.m_color, false, context);
}

/// 再ポイントされたとき呼ばれる。
ColorPalette.prototype.OnPicked = function(e)
{
  // console.log("ColorPalette::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  /*NOP*/
}

/// 描画ストローク開始時に呼ばれる。
ColorPalette.prototype.OnDrawStart = function(e)
{
  // スポイト操作
  if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
    // 画像合成
    e.m_sender.getJointImage(this.m_joint_canvas);

    // 画素データ取得
    let jointCtx = this.m_joint_canvas.getContext('2d');
    let px_data = jointCtx.getImageData(e.m_point.x, e.m_point.y, 1, 1);
    assert(px_data.data.length == 4);

    // 設定更新
    let color = get_color_as_RGB(px_data.data);
    eval(dbgv([ 'color' ]));
    this.m_color = color;
    this.m_setting.setColor(this.m_color);

    // 表示更新
    let context = this.m_toolCanvas.getContext('2d');
    draw_color_palette(this.m_iconBounds, this.m_color, true, context);
  }
}
/// 設定が変化したとき呼ばれる。
ColorPalette.prototype.OnSettingChanged = function(setting)
{
  if (this.m_toolCanvas != null) {
    this.m_color = setting.getColor();
    let context = this.m_toolCanvas.getContext('2d');
    draw_color_palette(this.m_iconBounds, this.m_color, true, context);
  }
}

//
//  色ツール
//

/// 新しいインスタンスを初期化する。
function ColorCompoTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_slideBar = null;
  this.m_colorCompoIdx = null;
  this.m_alphaIdx = null;
  this.m_toolCanvas = null;
}

/// 最初の表示を行う。
/// ここで与える引数により、RGBAのどのツールなのかが決まる。
ColorCompoTool.prototype.show = function(setting, colorCompoIdx, alphaIdx, toolCanvas)
{
  this.m_colorCompoIdx = colorCompoIdx;
  this.m_alphaIdx = alphaIdx;
  this.m_toolCanvas = null;

  // 現在の色を取得する。
  let color = setting.getColor();
  let colors = color.match(/\d+/g);
  assert(colors.length >= 3);

  // 色成分別処理
  let viewColor, pfx, iniVal;
  switch (colorCompoIdx) {
  case 0:
    viewColor = 'rgb(255,150,150)';
    pfx = 'R';
    iniVal = colors[0];
    break;
  case 1:
    viewColor = 'rgb(130,242,56)';
    pfx = 'G';
    iniVal = colors[1];
    break;
  case 2:
    viewColor = 'rgb(128,128,255)';
    pfx = 'B';
    iniVal = colors[2];
    break;
  case 3:
    viewColor = 'rgb(170,170,170)';
    pfx = 'A';
    iniVal = setting.getAlpha(alphaIdx);
    break;
  default:
    assert(false);
    return;
  }
  // eval(dbgv([ 'iniVal' ]));

  // スライドバー構成
  this.m_slideBar = new MicroSlideBar(
    this.m_iconBounds, false,
    viewColor,
    0, 255, iniVal,
    pfx, "",
    -1, 255     // 値0でも色つきの線を表示させるため、exValMin=-1とする。
  );

  // 最初の表示
  let context = toolCanvas.getContext('2d');
  this.m_slideBar.show(iniVal, context);

  // イベントハンドラ登録
  this.m_toolCanvas = toolCanvas;
  setting.addListener(this);
}

/// 共通設定から必要な値を取得する。
ColorCompoTool.prototype.getValue = function(setting)
{
  let val = null;

  switch (this.m_colorCompoIdx) {
  case 0:
  case 1:
  case 2:
    {
      let color = setting.getColor();
      let colors = get_components_from_RGBx(color);
      val = colors[this.m_colorCompoIdx];
    }
    break;
  case 3:
    val = setting.getAlpha(this.m_alphaIdx);
    break;
  default:
    assert(false);
    break;
  }

  return val;
}

/// 共通設定を変更する。
ColorCompoTool.prototype.setValue = function(val, setting)
{
  switch (this.m_colorCompoIdx) {
  case 0:
  case 1:
  case 2:
    {
      let color = setting.getColor();
      let colors = get_components_from_RGBx(color);
      colors[this.m_colorCompoIdx] = val;
      color = get_color_as_RGB(colors);
      setting.setColor(color);
    }
    break;
  case 3:
    setting.setAlpha(this.m_alphaIdx, val);
    break;
  default:
    assert(false);
    break;
  }
}

/// 選択時呼ばれる。
ColorCompoTool.prototype.OnSelected = function(e)
{
  // console.log("ColorCompoTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let setting = e.m_sender.getCommonSetting();
  let val = this.getValue(setting);
  this.m_slideBar.OnSelected(e, val);
}

/// 選択解除時呼ばれる。
ColorCompoTool.prototype.OnDiselected = function(e)
{
  // console.log("ColorCompoTool::OnDiselected() called. ");
  /*NOP*/
}

/// 再ポイントされたとき呼ばれる。
ColorCompoTool.prototype.OnPicked = function(e)
{
  // console.log("ColorCompoTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let val = this.m_slideBar.OnPicked(e);
  let setting = e.m_sender.getCommonSetting();
  this.setValue(val, setting);
}

/// 設定が変更されたとき呼ばれる。
ColorCompoTool.prototype.OnSettingChanged = function(setting)
{
  if (this.m_toolCanvas != null) {
    let val = this.getValue(setting);
    let context = this.m_toolCanvas.getContext('2d');
    this.m_slideBar.drawValue(val, context);
  }
}

//
//  描画合成ツール
//

/// 新しいインスタンスを初期化する。
function DrawCompoTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_drawCompoIdx = null;
  this.m_faceText = null;
  this.m_tgColor = null;

  this.m_joint_canvas = document.getElementById("joint_canvas");
  this.m_maskCanvas = null;
  this.m_saveCanvas = null;
  this.m_workCanvas = null;
  this.m_bSurfaceActive = false;

  this.m_lastToolPalette = null;
}

/// アイコングラフィックを表示する。
DrawCompoTool.prototype.drawIcon = function(color, context)
{
  let iconGraphicFunc = function(iconBounds, context) {
    context.fillStyle = color;
    let b = iconBounds;   // Alias
    context.fillRect(b.x + 3, b.y + 2, b.width - 7, Math.floor((b.height - 4) / 2));
  };
  draw_icon_ex(this.m_iconBounds, this.m_faceText, iconGraphicFunc, false, context);
}

/// 最初の表示を行う。
/// ここで与える引数により、描画合成方法が決まる。
DrawCompoTool.prototype.show = function(setting, drawCompoIdx, toolCanvas)
{
  this.m_drawCompoIdx = drawCompoIdx;
  this.m_tgColor = setting.getMaskColor();

  switch (this.m_drawCompoIdx) {
  case 0:
    this.m_faceText = '通常';
    break;
  case 1:
    this.m_faceText = 'マスク';
    break;
  case 2:
    this.m_faceText = '逆マスク';
    this.m_maskCanvas = document.createElement('canvas');
    this.m_saveCanvas = document.createElement('canvas');
    this.m_workCanvas = document.createElement('canvas');
    break;
  default:
    assert(false);
    break;
  }

  // アイコン描画
  // 当ツールの表示上のアイコン状態は常にfalse。
  let context = toolCanvas.getContext('2d');
  this.drawIcon(this.m_tgColor, context);
}

/// マスク画像を生成する。
DrawCompoTool.prototype.setupMaskImage = function(toolPalette, layer, surface)
{
  switch (this.m_drawCompoIdx) {
  case 0:
    // erase_single_layer(surface);   // 最初からクリアされている想定で省略。
    break;
  case 1:
    // マスク画像生成
    // マスクツールでは、マスク画像は1種類。
    get_mask_image(layer, this.m_tgColor, surface);
    break;
  case 2:
    // 逆マスク生成
    // 逆マスクツールでは、マスク画像、元画像バックアップデータの3種類が必要。
    {
      // マスク画像生成
      // 指定レイヤー(layer)上の、色がthis.m_tgColorである画素の集まり。
      this.m_maskCanvas.setAttribute('width', layer.width);
      this.m_maskCanvas.setAttribute('height', layer.height);
      get_mask_image(layer, this.m_tgColor, this.m_maskCanvas);

      // 指定レイヤー(layer)のバックアップ
      this.m_saveCanvas.setAttribute('width', layer.width);
      this.m_saveCanvas.setAttribute('height', layer.height);
      copy_layer(layer, this.m_saveCanvas);

      // 表示マスク画像
      // 対象画素以外を操作者の見かけ上変更させないためのマスク。これは、
      // 操作者が見る画像(=レイヤー合成結果画像)から、下記を満たす画素のみを
      // 除外(透明化)してできる画素の集まりに等しい。
      //   (1) 指定レイヤー(layer)の、色がthis.m_tgColorである画素。
      //   (2) 操作者から見える画素。(上のレイヤーに覆われない。)
      // 下記ケースに注意!
      //   - 色がthis.m_tgColorだが、指定レイヤー以外のレイヤーの画素
      //       -- (1)を満たさないので変更禁止(表示マスクに含める)
      //   - 合成画像上で色がthis.m_tgColorだが、指定レイヤーではなく、
      //     それより上のレイヤーに由来する画素
      //       -- (2)を満たさないので変更禁止(表示マスクに含める)
      {
        // 上記(1)と(2)を満たす画素のみの画像作成 --> this.m_saveCanvas
        this.m_workCanvas.setAttribute('width', layer.width);
        this.m_workCanvas.setAttribute('height', layer.height);
        copy_layer(this.m_maskCanvas, this.m_workCanvas);
        let nlayers = toolPalette.getNumLayers();
        let found_idx = -1;
        for (let i = 1; i < nlayers; ++i) {
          let layer_i = toolPalette.getLayer(i);
          if (found_idx < 0) {        // (layer未発見(layer_iはlayerより上ではない))
            if (layer_i == layer) {   // (layer発見)
              found_idx = i;          // インデックスを記憶
            }
          } else {    // (layer発見済み(layer_iはlayerより上))
            // this.m_maskCanvasからlayer_iの不透明画素に対応する画素を除外
            get_destinaton_out_image(layer_i, this.m_workCanvas);
          }
        }

        // レイヤー合成結果画像からthis.m_maskCanvasの不透明画素に対応する画素を除外
        toolPalette.getJointImage_wo_event(this.m_joint_canvas);
        fix_image_w_mask(this.m_joint_canvas, this.m_maskCanvas, true, surface);
      }
    }
    break;
  default:
    assert(false);
    break;
  }

  // サーフェス有効化を記憶
  this.m_bSurfaceActive = true;
}

/// マスク画像を定着させる。
DrawCompoTool.prototype.fixMaskImage = function(surface, layer)
{
  if (!this.m_bSurfaceActive)
    return;

  switch (this.m_drawCompoIdx) {
  case 0:
    /*NOP*/
    break;
  case 1:
    fix_image_w_mask(surface, surface, false, layer);
    erase_single_layer(surface);
    break;
  case 2:
    fix_image_w_mask(this.m_saveCanvas, this.m_maskCanvas, true, layer);
    erase_single_layer(surface);
    break;
  default:
    assert(false);
    break;
  }
}

/// 選択時呼ばれる。
DrawCompoTool.prototype.OnSelected = function(e)
{
  // console.log("DrawCompoTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + "), txt=" + this.m_faceText);
  let toolPalette = e.m_sender;

  // マスク対象色取得
  let setting = toolPalette.getCommonSetting();
  this.m_tgColor = setting.getMaskColor();

  // マスク画像作成
  let layer = toolPalette.getCurLayer();
  let surface = toolPalette.getSurface();
  this.setupMaskImage(toolPalette, layer, surface);

  // アイコン描画
  let context = toolPalette.getToolPaletteCanvas().getContext('2d');
  this.drawIcon(this.m_tgColor, context);

  // マスク処理
  this.OnPicked(e);

  // レイヤー固定要求リスナ登録
  this.m_lastToolPalette = toolPalette;
  toolPalette.addLayerFixListener(this);
}

/// 選択解除時呼ばれる。
DrawCompoTool.prototype.OnDiselected = function(e)
{
  let toolPalette = e.m_sender;

  // レイヤー固定要求リスナ登録解除
  toolPalette.removeLayerFixListener(this);

  // マスク画像定着
  let layer = toolPalette.getCurLayer();
  let surface = toolPalette.getSurface();
  this.fixMaskImage(surface, layer);
}

/// 再ポイントされたとき呼ばれる。
DrawCompoTool.prototype.OnPicked = function(e)
{
  // console.log("DrawCompoTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let toolPalette = e.m_sender;
  let setting = toolPalette.getCommonSetting();
  let context = toolPalette.getToolPaletteCanvas().getContext('2d');

  // CTRLキーが押されていたら対象色を変更する。
  if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
    this.m_tgColor = setting.getColor();
    setting.setMaskColor(this.m_tgColor);
    this.drawIcon(this.m_tgColor, context);

    // マスク画像定着(もしあれば)
    let toolPalette = e.m_sender;
    let layer = toolPalette.getCurLayer();
    let surface = toolPalette.getSurface();
    this.fixMaskImage(surface, layer);

    // マスク画像作成
    this.setupMaskImage(toolPalette, layer, surface);
  }
}

/// 作業中レイヤーを固定すべきとき呼ばれる。
DrawCompoTool.prototype.OnLayerToBeFixed = function(pictCanvas, nextLayer)
{
  console.log("DrawCompoTool::OnLayeOnLayerToBeFixed() called.");
  // 例えばマスク色赤色でマスクツール使用中あっても、
  // ユーザーは赤色で描画はできる。
  // これをどこかのタイミングでマスクに含めねばならない。
  // --> ここで行う。
  let layer = pictCanvas.getCurLayer();
  let surface = pictCanvas.getSurface();
  this.fixMaskImage(surface, layer);        // カレントレイヤーのマスキング結果を一旦固定
  this.setupMaskImage(this.m_lastToolPalette, nextLayer, surface);  // 次のレイヤーのマスキングを行う。
}
