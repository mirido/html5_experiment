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
  eval(dbgv([ 'iniVal' ]));

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
