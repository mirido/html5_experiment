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
  this.m_cursor.setParam(thickness);
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
  let context = toolCanvas.getContext('2d');
  this.m_slideBar.show(setting, context);
}

/// 選択時呼ばれる。
ThicknessTool.prototype.OnSelected = function(e)
{
  // console.log("ThicknessTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  this.m_slideBar.OnSelected(e);
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
  this.m_slideBar.OnPicked(e);
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
  console.log("ColorPalette::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

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
}

/// 選択解除時呼ばれる。
ColorPalette.prototype.OnDiselected = function(e)
{
  console.log("ColorPalette::OnDiselected() called. ");

  // 登録解除
  e.m_sender.removeDrawer(this);

  // アイコン描画(非選択状態)
  let context = e.m_sender.getToolPaletteCanvas().getContext('2d');
  draw_color_palette(this.m_iconBounds, this.m_color, false, context);
}

/// 再ポイントされたとき呼ばれる。
ColorPalette.prototype.OnPicked = function(e)
{
  console.log("ColorPalette::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
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
    let color = 'rgb(' + px_data.data[0] + ',' + px_data.data[1] + ',' + px_data.data[2] + ')';
    eval(dbgv([ 'color' ]));
    this.m_color = color;
    this.m_setting.setColor(this.m_color);

    // 表示更新
    let context = this.m_toolCanvas.getContext('2d');
    draw_color_palette(this.m_iconBounds, this.m_color, true, context);
  }
}
