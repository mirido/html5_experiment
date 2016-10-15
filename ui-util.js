'use strict';

//
//  General
//

/// HTMLページのクライアント座標系をウィンドウのクライアント座標系に変換する。
function conv_page_client_to_wnd_client(point)
{
  return jsPoint(point.x - window.pageXOffset, point.y - window.pageYOffset);
}

//
//  ポインタ状態管理
//

// 2016-10-01現在、HTML5は要素外側のonmouseupは検知(=マウスキャプチャ)
// できない制限があるので、これに対策する。
// 参考:
// http://www.dotapon.sakura.ne.jp/blog/?p=496

/// 新しいインスタンスを初期化する。
function PointManager()
{
  // 最後にmousedownまたはtouchstartが起きたオブジェクト
  this.m_objOnLastPointStart = null;

  let bSupportTouch = ('ontouchend' in document);
  if (bSupportTouch) {
    document.addEventListener('touchstart', this);
    document.addEventListener('touchend', this);
  } else {
    document.addEventListener('mousedown', this);
    document.addEventListener('mouseup', this);
  }
}

/// インスタンスが保持する資源を解放する。
PointManager.prototype.dispose = function()
{
  let bSupportTouch = ('ontouchend' in document);
  if (bSupportTouch) {
    document.removeEventListener('touchstart', this);
    document.removeEventListener('touchend', this);
  } else {
    document.removeEventListener('mousedown', this);
    document.removeEventListener('mouseup', this);
  }
}

/// mousedownまたはtouchstartが起きたオブジェクトを記憶する。
/// objはhandleEvent()メソッドを有する前提。
PointManager.prototype.notifyPointStart = function(obj, e)
{
  // console.log("******* " + e);
  assert(e && (e.type == 'mousedown' || e.type == 'touchstart'));
  this.m_objOnLastPointStart = obj;
}

/// イベントリスナ。
PointManager.prototype.handleEvent = function(e)
{
  // console.log("******* " + e);
  switch (e.type) {
  case 'mousedown':
  case 'touchstart':
    /*NOP*/
    break;
  case 'mouseup':
  case 'touchend':
    if (this.m_objOnLastPointStart) {
      // let mod_e = Object.assign({ }, e);  // 値コピー  // NG。うまく機能しない。
      let mod_e = e;    // Alias
      this.m_objOnLastPointStart.handleEvent(mod_e);
      // （e.clientX, e.clientY)は、HTMLページ左上点を原点とする座標。
      // (e.screenX, e.screenY)は、モニタの左上点を原点とする座標。
      // いずれもHTMLページのスクロール位置とは無関係。
      // 原点とスケールが同一HTMLページ内のHTML要素共通であるため、少なくとも上記座標に関しては、
      // documentのハンドラで受けたeを、異なるHTML要素のハンドラにそのまま渡しても問題無い。
      // (備考)
      // (e.clientX, e.clientY)とウィンドウのクライアント領域の左上点を原点とする座標は、
      // HTMLページのスクロール量だけずれる。前者を後者に座標に変換するには、
      // （e.clientX - window.pageXOffset, e.clientY - window.pageYOffset)
      // とする。
    }
    this.m_objOnLastPointStart = null;
    break;
  default:
    /*NOP*/
    break;
  }
}

//
//  イベントハンドラ登録
//

// ポインタ系イベント
const g_touchi_pointer_events = [
  'touchstart',
  'touchmove',
  'touchend'
];

const g_mouse_pointer_events = [
  'mousedown',
  'mousemove',
  'mouseup'
];

/// マウスやタッチスクリーン等のポインタ系イベントを一括登録する。
/// codeObjはhandleEvent()メソッドを有する前提。
function register_pointer_event_handler(docObj, codeObj)
{
  let bSupportTouch = ('ontouchend' in document);
  let pointer_events
    = (bSupportTouch)
    ? g_touchi_pointer_events
    : g_mouse_pointer_events;
	for (let i = 0; i < pointer_events.length; ++i) {
		docObj.addEventListener(pointer_events[i], codeObj, false);
	}
}

//
//  <select>タグ操作
//

/// Selection boxの選択項目をプログラムから変更する。
function change_selection(selector, exp_value)
{
  let selection = selector.getElementsByTagName('option');
  for (let i = 0; i < selection.length; ++i) {
    if (selection[i].value == exp_value) {
      selection[i].selected = true;
      return true;
    }
  }
  return false;
}

//
//  線幅セレクタ
//

/// 新しいインスタンスを初期化する。
function ThicknessSelector()
{
  // DOMオブジェクト取得
  this.m_thick10Selector = document.getElementById("selThickness10");
  this.m_thick01Selector = document.getElementById("selThickness01");

  // セレクタの値一覧取得
  this.m_thick01List = this.m_thick01Selector.getElementsByTagName('option');
  this.m_thick10List = this.m_thick10Selector.getElementsByTagName('option');
}

/// 線の太さをセレクタから取得する。(暫定処置)
ThicknessSelector.prototype.getThickness = function()
{
  let idx01 = this.m_thick01Selector.selectedIndex;
  let idx10 = this.m_thick10Selector.selectedIndex;
  let val01 = this.m_thick01List[idx01].value;
  let val10 = this.m_thick10List[idx10].value;
  console.log("val10=" + val10 + ", val01=" + val01);
  let thickness = 10 * parseInt(val10) + parseInt(val01);
  return thickness;
}

/// 線の太さをセレクタに反映する．
ThicknessSelector.prototype.setThickness = function(value)
{
  let bRet;

  let val01 = value % 10;
  let val10 = Math.floor(value / 10);

  let suc = true;
  bRet = change_selection(this.m_thick01Selector, val01);
  if (!bRet) {
    suc = false;
  }
  bRet = change_selection(this.m_thick10Selector, val10);
  if (!bRet) {
    suc = false;
  }

  assert(suc);
  return suc;
}

//
//  キー状態管理
//

// Description:
// キー状態を管理する。

const SpKey = {
  KY_SHIFT: 0x1,
  KY_CTRL: 0x2,
  KY_ALT: 0x4,
  KY_META: 0x8
};

/// 新しいインスタンスを初期化する。
function KeyStateManager()
{
  // 特殊キー押下状態
  this.m_bShiftDown = false;
  this.m_bCtrlDown = false;
  this.m_bAltDown = false;
  this.m_bMetaDown = false;

  // イベントハンドラ登録
  document.addEventListener('keydown', this);
  document.addEventListener('keyup', this);
}

/// インスタンスが保持する資源を解放する。
KeyStateManager.prototype.dispose = function()
{
  document.removeEventListener('keydown', this);
  document.removeEventListener('keyup', this);
}

/// イベントリスナ。
KeyStateManager.prototype.handleEvent = function(e)
{
  let key_event = (e || window.event);
  this.m_bShiftDown = (key_event.shiftKey);
	this.m_bCtrlDown = (key_event.ctrlKey);
	this.m_bAltDown = (key_event.altKey);
	this.m_bMetaDown = (key_event.metaKey);
  // console.log("m_bShiftDown=" + this.m_bShiftDown
  //   + ", this.m_bCtrlDown=" + this.m_bCtrlDown
  //   + ", this.m_bAltDown=" + this.m_bAltDown
  //   + ", this.m_bMetaDown=" + this.m_bMetaDown
  // );
}

/// 特殊キーの押下状態を取得する。
KeyStateManager.prototype.getSpKeyState = function()
{
  let state = 0x0;
  if (this.m_bShiftDown) {
    state |= SpKey.KY_SHIFT;
  }
  if (this.m_bCtrlDown) {
    state |= SpKey.KY_CTRL;
  }
  if (this.m_bAltDown) {
    state |= SpKey.KY_ALT;
  }
  if (this.m_bMetaDown) {
    state |= SpKey.KY_META;
  }
  return state;
}

//
//  アイコン描画
//

/// アイコンを描画する。
function draw_icon_face(iconBounds, colors, context)
{
  let sx = iconBounds.x;
  let sy = iconBounds.y;
  let w = iconBounds.width;
  let h = iconBounds.height;

  // 枠線
  context.fillStyle = colors[0];
  draw_rect_R(iconBounds, context);

  // ボタン面
  context.fillStyle = colors[1];
  context.fillRect(sx + 2, sy + 2, w - 4, h - 4);

  // 左上効果
  context.fillStyle = colors[2];
  context.fillRect(sx + 1, sy + 1, w - 3, 1);
  context.fillRect(sx + 1, sy + 2, 1, h - 3);

  // 右下効果
  context.fillStyle = colors[3];
  context.fillRect(sx + 2, sy + h - 2, w - 3, 1);
  context.fillRect(sx + w - 2, sy + 1, 1, h - 3);
}

const activeIconColors = [
  'rgb(116,116,171)',   // 枠線
  'rgb(147,151,178)',   // ボタン面
  'rgb(147,151,178)',   // 左上
  'rgb(255,255,255)'    // 右下
];

const inactiveIconColors = [
  'rgb(116,116,171)',   // 枠線
  'rgb(210,216,255)',   // ボタン面
  'rgb(255,255,255)',   // 左上
  'rgb(147,151,178)'    // 右下
];

const textColor = 'rgb(90,87,129)';
const textCharWidth = 12;

/// アイコンを描画する。
function draw_icon_face_wrp(iconBounds, bActive, e)
{
  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');

  let colors = (bActive) ? activeIconColors : inactiveIconColors;
  draw_icon_face(iconBounds, colors, context);
}

/// アイコンを描画する。
function draw_icon_wrp(iconBounds, text, iconGraphicFunc, bActive, e)
{
  // ボタン面描画
  draw_icon_face_wrp(iconBounds, bActive, e);

  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');

  // アイコンのグラフィック描画
  if (iconGraphicFunc) {
    iconGraphicFunc(iconBounds, context);
  }

  // 文字描画
  let sx = iconBounds.x;
  let sy = iconBounds.y;
  let h = iconBounds.height;
  let nchs = text.length;
  let textMaxWidth = textCharWidth * nchs;
  context.fillStyle = textColor;
  context.fillText(text, sx + 2, sy + h - 3, textMaxWidth);
}
