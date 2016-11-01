// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

//
//  DrawToolBase
//

/// 新しいインスタンスを初期化する。
function DrawToolBase(iconBounds, text, drawOp, effect, cursor)
{
  this.m_iconBounds = iconBounds;
  this.m_text = text;

  this.m_drawOp = drawOp;
  this.m_effect = effect;
  this.m_cursor = cursor;
  this.m_drawerCore = new DrawerBase(this.m_drawOp, this.m_effect, this.m_cursor);

  this.m_setting = null;
}

/// 最初の表示を行う。
DrawToolBase.prototype.show = function(setting, toolCanvas)
{
  let context = toolCanvas.getContext('2d');

  // 非選択時アイコン描画
  draw_icon_ex(this.m_iconBounds, this.m_text, null, false, context);
}

/// 選択時呼ばれる。
DrawToolBase.prototype.OnSelected = function(e)
{
  // console.log("DrawerBase::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

  // 選択時アイコン描画
  draw_icon_wrp(this.m_iconBounds, this.m_text, null, true, e);

  // 共通設定オブジェクト記憶
  this.m_setting = e.m_sender.getCommonSetting();

  // 描画ツール設定
  e.m_sender.addDrawer(this);
  e.m_sender.addDrawer(this.m_drawerCore);
}

/// 選択解除時呼ばれる。
DrawToolBase.prototype.OnDiselected = function(e)
{
  // console.log("DrawerBase::OnDiselected() called. ");

  // 描画ツール解除
  e.m_sender.removeDrawer(this.m_drawerCore);
  e.m_sender.removeDrawer(this);

  // 非選択時アイコン描画
  draw_icon_wrp(this.m_iconBounds, this.m_text, null, false, e);
}

/// 再ポイントされたとき呼ばれる。
DrawToolBase.prototype.OnPicked = function(e)
{
  // console.log("DrawerBase::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  /*NOP*/
}

/// 描画ストローク開始時に呼ばれる。
DrawToolBase.prototype.OnDrawStart = function(e)
{
  // console.log("DrawerBase.OnDrawStart() called.");

  // 最新の描画設定を反映
  let thickness = this.m_setting.getThickness();
  let color = this.m_setting.getColor();
  this.m_effect.setParam(thickness, color);
  this.m_cursor.setParam(thickness, color);
}

//
//  鉛筆ツール
//

/// 新しいインスタンスを初期化する。
function PencilTool(iconBounds)
{
  this.m_drawToolBase = new DrawToolBase(
    iconBounds,
    '鉛筆',
    new DrawOp_FreeHand(),
    new Effect_Pencil(),
    new Cursor_Circle()
  );
}

/// 最初の表示を行う。
PencilTool.prototype.show = function(setting, toolCanvas)
{
  this.m_drawToolBase.show(setting, toolCanvas);
}

/// 選択時呼ばれる。
PencilTool.prototype.OnSelected = function(e)
{
  this.m_drawToolBase.OnSelected(e);
}

/// 選択解除時呼ばれる。
PencilTool.prototype.OnDiselected = function(e)
{
  this.m_drawToolBase.OnDiselected(e);
}

/// 再ポイントされたとき呼ばれる。
PencilTool.prototype.OnPicked = function(e)
{
  this.m_drawToolBase.OnPicked(e);
}

/// 描画ストローク開始時に呼ばれる。
PencilTool.prototype.OnDrawStart = function(e)
{
  this.m_drawToolBase.OnDrawStart(e);
}

//
//  四角ツール
//

/// 新しいインスタンスを初期化する。
function FillRectTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_drawToolBase = null;
}

/// 最初の表示を行う。
FillRectTool.prototype.show = function(setting, toolCanvas)
{
  this.m_drawToolBase = new DrawToolBase(
    this.m_iconBounds,
    '四角',
    new DrawOp_Rectangle(setting, true),
    new Effect_PencilRect(true),
    new NullCursor()
  );

  this.m_drawToolBase.show(setting, toolCanvas);
}

/// 選択時呼ばれる。
FillRectTool.prototype.OnSelected = function(e)
{
  this.m_drawToolBase.OnSelected(e);
}

/// 選択解除時呼ばれる。
FillRectTool.prototype.OnDiselected = function(e)
{
  this.m_drawToolBase.OnDiselected(e);
}

/// 再ポイントされたとき呼ばれる。
FillRectTool.prototype.OnPicked = function(e)
{
  this.m_drawToolBase.OnPicked(e);
}

/// 描画ストローク開始時に呼ばれる。
FillRectTool.prototype.OnDrawStart = function(e)
{
  this.m_drawToolBase.OnDrawStart(e);
}

//
//  線四角ツール
//

/// 新しいインスタンスを初期化する。
function LineRectTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_drawToolBase = null;
}

/// 最初の表示を行う。
LineRectTool.prototype.show = function(setting, toolCanvas)
{
  this.m_drawToolBase = new DrawToolBase(
    this.m_iconBounds,
    '線四角',
    new DrawOp_Rectangle(setting, false),
    new Effect_PencilRect(false),
    new NullCursor()
  );

  this.m_drawToolBase.show(setting, toolCanvas);
}

/// 選択時呼ばれる。
LineRectTool.prototype.OnSelected = function(e)
{
  this.m_drawToolBase.OnSelected(e);
}

/// 選択解除時呼ばれる。
LineRectTool.prototype.OnDiselected = function(e)
{
  this.m_drawToolBase.OnDiselected(e);
}

/// 再ポイントされたとき呼ばれる。
LineRectTool.prototype.OnPicked = function(e)
{
  this.m_drawToolBase.OnPicked(e);
}

/// 描画ストローク開始時に呼ばれる。
LineRectTool.prototype.OnDrawStart = function(e)
{
  this.m_drawToolBase.OnDrawStart(e);
}

//
//  消しペンツール
//

/// 新しいインスタンスを初期化する。
function EraseTool(iconBounds)
{
  this.m_drawToolBase = new DrawToolBase(
    iconBounds,
    '消しペン',
    new DrawOp_FreeHand(),
    new Effect_Eraser(),
    new Cursor_Square()
  );
}

/// 最初の表示を行う。
EraseTool.prototype.show = function(setting, toolCanvas)
{
  this.m_drawToolBase.show(setting, toolCanvas);
}

/// 選択時呼ばれる。
EraseTool.prototype.OnSelected = function(e)
{
  this.m_drawToolBase.OnSelected(e);
}

/// 選択解除時呼ばれる。
EraseTool.prototype.OnDiselected = function(e)
{
  this.m_drawToolBase.OnDiselected(e);
}

/// 再ポイントされたとき呼ばれる。
EraseTool.prototype.OnPicked = function(e)
{
  this.m_drawToolBase.OnPicked(e);
}

/// 描画ストローク開始時に呼ばれる。
EraseTool.prototype.OnDrawStart = function(e)
{
  this.m_drawToolBase.OnDrawStart(e);
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
//  マスクツール
//

/// 新しいインスタンスを初期化する。
function MaskTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_drawCompoIdx = null;
  this.m_faceText = null;
  this.m_tgColor = null;

  this.m_joint_canvas = document.getElementById("joint_canvas");
  this.m_dbg_canvas = document.getElementById("dbg_canvas");
  this.m_maskCanvas = null;
  this.m_saveCanvas = null;
  this.m_surfaceUser = null;

  this.m_bDealing = false;
  this.m_lastToolPalette = null;
}

/// アイコングラフィックを表示する。
MaskTool.prototype.drawIcon = function(color, context)
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
MaskTool.prototype.show = function(setting, drawCompoIdx, toolCanvas)
{
  this.m_drawCompoIdx = drawCompoIdx;
  this.m_tgColor = setting.getMaskColor();

  switch (this.m_drawCompoIdx) {
  case 0:
    this.m_faceText = '通常';
    break;
  case 1:
    this.m_faceText = 'マスク';
    this.m_maskCanvas = document.createElement('canvas');
    this.m_saveCanvas = document.createElement('canvas');
    break;
  case 2:
    this.m_faceText = '逆マスク';
    this.m_maskCanvas = document.createElement('canvas');
    this.m_saveCanvas = document.createElement('canvas');
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

/// 表示マスク画像を生成する。
MaskTool.prototype.setupSurface = function(toolPalette, layer, mask, bInv, surface)
{
  let workCanvas = document.createElement('canvas');
  workCanvas.setAttribute('width', layer.width);
  workCanvas.setAttribute('height', layer.height);

  // ■ 表示マスク画像
  // 対象画素以外を操作者の見かけ上変更させないためのマスク。
  // これは、操作者が見る画像(=レイヤー合成結果画像)から、
  // 下記を両方満たす画素のみを除外(透明化)してできる画素の集まりに等しい。
  //   (1) 指定レイヤー(layer)において書き換え可能である。(マスクされない。)
  //   (2) 指定レイヤーより上のレイヤーに覆われない。(操作者から直接見える。)

  // マスク画像(mask)から、対象レイヤー(layer)より
  // 上のレイヤーで覆われる画素を除外する。
  // 当処理により、workCanvasに下記画像がセットされる。
  // マスクツール(bInv==false)の場合: 表示上書き換え禁止の画素の集合
  // 逆マスクツール(bInv==false)の場合: 表示上書き換え可能な画素の集合
  copy_layer(mask, workCanvas);
  let nlayers = toolPalette.getNumLayers();
  let found_idx = -1;
  for (let i = 0; i < nlayers; ++i) {
    let layer_i = toolPalette.getLayer(i);
    if (found_idx < 0) {        // (layer未発見(layer_iはlayerより上ではない))
      if (layer_i == layer) {   // (layer発見)
        found_idx = i;          // インデックスを記憶
      }
    } else {    // (layer発見済み(layer_iはlayerより上))
      // this.m_maskCanvasからlayer_iの不透明画素に対応する画素を除外
      get_destinaton_out_image(layer_i, workCanvas);
    }
  }

  // レイヤー合成結果画像からthis.m_maskCanvasの不透明画素に対応する画素を除外
  toolPalette.getJointImage(this.m_joint_canvas);
  fix_image_w_mask(this.m_joint_canvas, workCanvas, bInv, surface);
}

/// マスク画像を生成する。
MaskTool.prototype.setupMaskImage = function(toolPalette, layer, surface)
{
  switch (this.m_drawCompoIdx) {
  case 0:
    // erase_single_layer(surface);   // 最初からクリアされている想定で省略。
    break;
  case 1:
  case 2:
    // マスク/逆マスク画像生成
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

      // 表示マスク生成
      let bInv = (this.m_drawCompoIdx == 2);    // 逆マスク時true
      this.setupSurface(toolPalette, layer, this.m_maskCanvas, bInv, surface);
    }
    break;
  default:
    assert(false);
    break;
  }
  if (this.m_dbg_canvas != null) {
    copy_layer(surface, this.m_dbg_canvas);   // DEBUG
  }

  // サーフェス有効化を記憶
  this.m_surfaceUser = layer;
}

/// マスク画像を定着させる。
MaskTool.prototype.fixMaskImage = function(surface, layer)
{
  switch (this.m_drawCompoIdx) {
  case 0:
    /*NOP*/
    break;
  case 1:
    fix_image_w_mask(this.m_saveCanvas, this.m_maskCanvas, false, layer);
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

  this.m_surfaceUser = null;
}

/// 選択時呼ばれる。
MaskTool.prototype.OnSelected = function(e)
{
  // console.log("MaskTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + "), txt=" + this.m_faceText);
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
MaskTool.prototype.OnDiselected = function(e)
{
  let toolPalette = e.m_sender;

  // レイヤー固定要求リスナ登録解除
  toolPalette.removeLayerFixListener(this);

  // マスク画像定着
  if (this.m_surfaceUser != null) {
    let layer = this.m_surfaceUser;
    let surface = toolPalette.getSurface();
    this.fixMaskImage(surface, layer);
  }
}

/// 再ポイントされたとき呼ばれる。
MaskTool.prototype.OnPicked = function(e)
{
  // console.log("MaskTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  let toolPalette = e.m_sender;
  let setting = toolPalette.getCommonSetting();
  let context = toolPalette.getToolPaletteCanvas().getContext('2d');

  // CTRLキーが押されていたら対象色を変更する。
  if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
    this.m_tgColor = setting.getColor();
    setting.setMaskColor(this.m_tgColor);
    this.drawIcon(this.m_tgColor, context);

    // イベント最適化
    // マスクツールがCTRLキーとともにクリックされたということは、
    // それに先立つ描画色の変更でマスク画像定着はすでに実施済みのため、
    // ここでの定着は省略する。
    // // マスク画像定着(もしあれば)
    // if (this.m_surfaceUser != null) {
    //   let toolPalette = e.m_sender;
    //   let layer = this.m_surfaceUser;
    //   let surface = toolPalette.getSurface();
    //   this.fixMaskImage(surface, layer);
    // }
    //
    // // マスク画像作成
    // this.setupMaskImage(toolPalette, layer, surface);
  }
}

/// 作業中レイヤーを固定すべきとき呼ばれる。
MaskTool.prototype.OnLayerToBeFixed = function(pictCanvas, nextLayer)
{
  console.log("MaskTool::OnLayerToBeFixed() called.");

  // 再入防止
  // 非同期の再入は無いはずなのでatomic性とか気にしない。
  if (this.m_bDealing)
    return;
  this.m_bDealing = true;

  // 例えばマスク色赤色でマスクツール使用中あっても、
  // ユーザーは赤色で描画はできる。
  // これをどこかのタイミングでマスクに含めねばならない。
  // --> ここで行う。
  if (this.m_surfaceUser != null) {
    let layer = this.m_surfaceUser;
    let surface = pictCanvas.getSurface();
    this.fixMaskImage(surface, layer);    // サーフェス使用中レイヤーのマスキング結果を一旦固定
  }
  this.setupMaskImage(this.m_lastToolPalette, nextLayer, surface);  // 次のレイヤーのマスキングを行う。

  this.m_bDealing = false;
}

//
//  塗り潰しツール
//

/// 新しいインスタンスを初期化する。
function PaintTool(toolPalette)
{
  this.m_toolPalette = toolPalette;
  this.m_PaintButton = document.getElementById('paint');
  let paintTool = this;   // 束縛変数
  this.m_PaintButton.onclick = function() {
     paintTool.OnClicked();
   };
}

/// 塗り潰しボタンがクリックされたとき呼ばれる。
PaintTool.prototype.OnClicked = function()
{
  this.m_toolPalette.redirectTo(this);
}

/// ツール選択時呼ばれる。
PaintTool.prototype.OnSelected = function(e)
{
  console.log("PaintTool::OnSelected() called.");
  e.m_sender.addDrawer(this);
}

/// ツール選択解除時呼ばれる。
PaintTool.prototype.OnDiselected = function(e)
{
  console.log("PaintTool::OnDiselected() called.");
  e.m_sender.removeDrawer(this);
}

/// 描画ストローク開始時呼ばれる。
/// ここでは'mousedown'等、ポインティング開始操作の捕捉のために使っている。
PaintTool.prototype.OnDrawStart = function(e)
{
  console.log("PaintTool::OnDrawStart() called.");
  let toolPalette = this.m_toolPalette;
  let layer = toolPalette.getCurLayer();
  let setting = toolPalette.getCommonSetting();

  if (e.m_spKey == 0x0) {
    let color = setting.getColor();
    let ffst = new FloodFillState(layer, e.m_point.x, e.m_point.y, color);
    ffst.fill();
  }
}

//
//  レイヤー選択ツール
//

/// 新しいインスタンスを追加する。
function LayerTool(iconBounds)
{
  this.m_iconBounds = iconBounds;
  this.m_listBox = null;
}

/// 最初の表示を行う。
LayerTool.prototype.show = function(setting, toolCanvas)
{
  let nlayers = setting.getNumLayers();
  let curLayerNo = setting.getCurLayerNo();
  this.m_listBox = new ListBox(this.m_iconBounds, nlayers);
  this.m_toolCanvas = toolCanvas;
  this.updateView(setting);
}

/// レイヤー選択に従い設定を更新する。
LayerTool.prototype.updateSetting = function(setting, e)
{
  // クリックされたレイヤー番号を特定
  let selIdx = this.m_listBox.getSelectionIndex();
  let nitems = this.m_listBox.getNumItems();
  let layerNo = (nitems - 1) - selIdx;

  // 設定変更
  console.log("e.m_button=" + e.m_button);
  switch (e.m_button) {
  case 0:
    setting.setCurLayerNo(layerNo);
    break;
  case 2:
    {
      let bLayerVisible = setting.getLayerVisibility(layerNo);
      console.log("bLayerVisible=" + bLayerVisible);
      setting.setLayerVisibility(layerNo, !bLayerVisible);
      break;
    }
  default:
    /*NOP*/
    break;
  }
}

/// 設定に従いレイヤー選択を更新する。
LayerTool.prototype.updateView = function(setting)
{
  // データ更新
  let curLayerNo = setting.getCurLayerNo();
  this.m_listBox.setSelectionIndex(curLayerNo);

  // 基礎部分描画
  this.m_listBox.show(curLayerNo, this.m_toolCanvas);

  // レイヤー状態を表示に反映
  let ctx = this.m_listBox.getContext2d();
  let nitems = this.m_listBox.getNumItems();
  for (let i = 0; i < nitems; ++i) {
    let b = this.m_listBox.getBounds(i);
    let layerNo = (nitems - 1) - i;
    if (layerNo == curLayerNo) {
      ctx.fillStyle = textColor;
      ctx.fillText("Layer" + layerNo, b.x + 1, b.y + b.height - 1, b.width - 1);
    }
    if (!setting.getLayerVisibility(layerNo)) {
      ctx.fillStyle = 'rgb(255,0,0)';
      draw_line_1px(b.x, b.y, b.x + b.width - 1, b.y + b.height - 1, ctx);
    }
  }
}

/// ツール選択時呼ばれる。
LayerTool.prototype.OnSelected = function(e)
{
  this.m_listBox.OnSelected(e);

  let setting = e.m_sender.getCommonSetting();
  this.updateSetting(setting, e);
  this.updateView(setting);
}

/// ツール選択解除時呼ばれる。
LayerTool.prototype.OnDiselected = function(e)
{
  /*NOP*/
}

/// 再ポイントされたとき呼ばれる。
LayerTool.prototype.OnPicked = function(e)
{
  this.m_listBox.OnSelected(e);

  let setting = e.m_sender.getCommonSetting();
  this.updateSetting(setting, e);
  this.updateView(setting);
}
