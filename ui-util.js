// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

//
//  ブラウザ仕様差の吸収
//

/// ブラウザを判定する。下記から借用。
/// http://etc9.hatenablog.com/entry/20110927/1317140891
function getBrowserType()
{
  let userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('opera') != -1) {
    return 'opera';
  } else if (userAgent.indexOf('msie') != -1) {
    return 'ie';
  } else if (userAgent.indexOf('chrome') != -1) {
    return 'chrome';
  } else if (userAgent.indexOf('safari') != -1) {
    return 'safari';
  } else if (userAgent.indexOf('gecko') != -1) {
    return 'gecko';
  } else {
    return null;
  }
}

/// getBoundingClientRect()が返す矩形の環境依存の違いを吸収するwrapper。
function unify_rect(rect)
{
  if (rect.x == null) {
    return jsRect(rect.left, rect.top, rect.width, rect.height);
  } else {
    return rect;
  }
}

/// getBoundingClientRect()のブラウザ依存性を吸収するwrapper(関数)を返す関数。
function get_getBoundingClientRectWrp()
{
  let browserType = getBrowserType();
  console.log("browserType=" + browserType);
  if (browserType == 'ie') {
    // IEは2 pxずれた座標を返すので対策する。下記Webページを参照した。
    // http://terurou.hateblo.jp/entry/20080223/1203705170
    // 実はmiridoのIEは'gecko'だったのでテストできていない…
    return function(target) {
      // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
      // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
      let b = target.getBoundingClientRect();
      let bounds = new JsRect(b.left, b.top, b.width, b.height);
      if (document.body.scrollLeft != void(0)) {
        bounds.x -= document.body.scrollLeft;
      } else if (document.documentElement.scrollLeft != void(0)) {
        bounds.x -= document.documentElement.scrollLeft;
      }
      if (document.body.scrollTop != void(0)) {
        bounds.y -= document.body.scrollTop;
      } else if (document.documentElement.scrollTop != void(0)) {
        bounds.y -= document.documentElement.scrollTop;
      }
      return bounds;
    };
  } else if (browserType == 'gecko') {
    // Geckoは座標を実数(小数点以下有り)で返す。
    // これが原因で、ImagePatchの取得と復元を繰り返す度に画像がずれていく
    // 問題が発生したので、下記wrapperで整数にする。
    return function(target) {
      // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
      // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
      let b = target.getBoundingClientRect();
      let bounds = new JsRect(
        Math.ceil(b.left),
        Math.ceil(b.top),
        Math.ceil(b.width),
        Math.ceil(b.height)
      );
      // 情報をいまいちまとめ切れていないが、
      // 実験する限り、少なくともIE11では下記補正は不要の模様。
      // bounds.x -= document.documentElement.scrollLeft;
      // bounds.y -= document.documentElement.scrollTop;
      return bounds;
    };
  } else {
    // IE以外のgetBoundingClientRect()では座標は問題無いらしい。
    // ただしDOMRectのメンバx, yを持たない無いブラウザが存在する。(Chromeとか)
    // それはunify_rect()で処置しておく。
    return function(target) {
      // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
      // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
      let bounds = target.getBoundingClientRect();
      return unify_rect(bounds);
    };
  }
}

/// getBoundingClientRect()のブラウザ依存性を吸収するwrapper。
const getBoundingClientRectWrp = get_getBoundingClientRectWrp();

/// HTMLページのクライアント座標系をウィンドウのクライアント座標系に変換する。
function conv_page_client_to_wnd_client(point)
{
  return jsPoint(point.x - window.pageXOffset, point.y - window.pageYOffset);
}

//
//  General
//

/// コンポーネント値からRGB色表現を取得する。
function get_color_as_RGB(colors)
{
  let color = 'rgb(' + colors[0] + ',' + colors[1] + ',' + colors[2] + ')';
  return color;
}

/// コンポーネント値からRGBA色表現を取得する。
function get_color_as_RGBA(colors)
{
  let color = 'rgba(' + colors[0] + ',' + colors[1] + ',' + colors[2] + ',' + colors[3] + ')';
  return color;
}

/// RGBまたはRGBAをコンポーネントに分解する。
function get_components_from_RGBx(color)
{
  let colors = [];
  if (color.match(/^#/)) {
    let hexColors = color.match(/[\da-f][\da-f]/gi);
    for (let i = 0; i < hexColors.length; ++i) {
      colors[i] = parseInt(hexColors[i], 16);
    }
  } else {
    let decColors = color.match(/\d+/g);
    for (let i = 0; i < decColors.length; ++i) {
      colors[i] = parseInt(decColors[i], 10);
    }
  }
  return colors;
}

/// 要素をリストに追加する。追加順は保たれる。
/// ただし、既存項目と重複する要素の登録は失敗する。
function add_to_unique_list(list, elem)
{
  // 登録済みでないか確認
	for (let i = 0; i < list.length; ++i) {
		if (list[i] == elem)
			return false;
	}

	// 登録
	list.push(elem);

  return true;
}

/// 要素をリストから削除する。
function remove_from_unique_list(list, elem)
{
  // 検索
	for (let i = 0; i < list.length; ++i) {
		if (list[i] == elem) {
			list.splice(i, 1);
			return true;
		}
	}

	return false;
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
  // 最後にmousedownまたはtouchstartが起きたオブジェクトのリスト
  this.m_objOnLastPointStart = [];

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
  add_to_unique_list(this.m_objOnLastPointStart, obj);
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
      for (let i = 0; i < this.m_objOnLastPointStart.length; ++i) {
        this.m_objOnLastPointStart[i].handleEvent(mod_e);
      }
      // (e.clientX, e.clientY)は、HTMLページ左上点を原点とする座標。
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
    this.m_objOnLastPointStart = [];
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

const borderColor = 'rgb(116,116,171)';   // 枠線

const activeIconColors = [
  borderColor,          // 枠線
  'rgb(147,151,178)',   // ボタン面
  'rgb(147,151,178)',   // 左上
  'rgb(255,255,255)'    // 右下
];

const inactiveIconColors = [
  borderColor,          // 枠線
  'rgb(210,216,255)',   // ボタン面
  'rgb(255,255,255)',   // 左上
  'rgb(147,151,178)'    // 右下
];

const textColor = 'rgb(90,87,129)';
const textCharWidth = 12;

/// アイコンを描画する。
function draw_icon_face_ex(iconBounds, bActive, context)
{
  let colors = (bActive) ? activeIconColors : inactiveIconColors;
  draw_icon_face(iconBounds, colors, context);
}

/// アイコンを描画する。
function draw_icon_face_wrp(iconBounds, bActive, e)
{
  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');
  draw_icon_face_ex(iconBounds, bActive, context);
}

/// アイコンを描画する。
function draw_icon_ex(iconBounds, text, iconGraphicFunc, bActive, context)
{
  // ボタン面描画
  draw_icon_face_ex(iconBounds, bActive, context);

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

/// アイコンを描画する。
function draw_icon_wrp(iconBounds, text, iconGraphicFunc, bActive, e)
{
  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');
  draw_icon_ex(iconBounds, text, iconGraphicFunc, bActive, context);
}

//
//  カラーパレット描画
//

/// カラーパレットを描画する。
function draw_color_palette(iconBounds, color, bActive, context)
{
  let color_src = (bActive) ? activeIconColors : inactiveIconColors;
  // let mod_colors = Object.assign([], color_src); -- NG. IEは非サポート。
  let mod_colors = [];
  for (let i = 0; i < color_src.length; ++i) {
    mod_colors[i] = color_src[i];
  }
  mod_colors[1] = color;

  draw_icon_face(iconBounds, mod_colors, context);
}

//
//  マイクロスライドバー
//

/// 新しいインスタンスを初期化する。
function MicroSlideBar(
  iconBounds,         // [in]  描画領域
  bVert,              // [in]  垂直バーか否か(true: 垂直, false: 水平)
  color,              // [in]  値を示すバーの色
  valMin, valMax,     // [in, in] 値域
  valIni,             // [in]  初期値
  pfx, sfx,           // [in]  テキストのprefixとpostfix
  exValMin, exValMax  // [in]  表示上の値域(バー先頭位置を決める内分にはこちらを使う)
)
{
  this.m_iconBounds = iconBounds;
  this.m_bVert = bVert;
  this.m_valMin = (valMin != null) ? valMin : 0;
  this.m_valMax = (valMax != null) ? valMax : 255;
  this.m_value = (valIni != null) ? valIni : 128;
  this.m_pfx = (pfx != null) ? pfx : "";
  this.m_sfx = (sfx != null) ? sfx : "";
  this.m_exValMin = (exValMin != null) ? exValMin : this.m_valMin;
  this.m_exValMax = (exValMax != null) ? exValMax : this.m_valMax;

  this.m_borderColor = inactiveIconColors[0];
  this.m_inRangeColor = color;
  this.m_outRangeColor = inactiveIconColors[1];
  this.m_textColor = textColor;
  // console.dir(this.m_iconBounds);
}

/// 座標をスライドバー数値に換算する。
MicroSlideBar.prototype.decodePoint = function(point)
{
  let bIncluds = rect_includes(this.m_iconBounds, point);
  if (!bIncluds)
    return null;

  let sx = this.m_iconBounds.x;
  let sy = this.m_iconBounds.y;
  let w = this.m_iconBounds.width;
  let h = this.m_iconBounds.height;

  // 数値の下限、上限に対応する座標値を特定
  let pt_min, pt_max, pt_inp;
  if (this.m_bVert) {
    pt_min = sy + 1;
    pt_max = sy + h - 2;
    pt_inp = point.y;
  } else {
    pt_min = sx + 1;
    pt_max = sx + w - 2;
    pt_inp = point.x;
  }

  // 内分して数値化
  let val = this.m_exValMin
    + ((this.m_exValMax - this.m_exValMin) * (pt_inp - pt_min)) / (pt_max - pt_min);
  // eval(dbgv([ 'this.m_exValMin', 'this.m_exValMax', 'val' ]));
  // eval(dbgv([ 'pt_min', 'pt_max', 'pt_inp' ]));
  // eval(dbgv([ '(this.m_exValMax - this.exValMin)' ]));

  // クリッピング
  if (val < this.m_valMin) {
    val = this.m_valMin;
  } else if (val > this.m_valMax) {
    val = this.m_valMax;
  }

  return val;
}

/// 数値を座標に変換する。
MicroSlideBar.prototype.encodeToPoint = function(val)
{
  let sx = this.m_iconBounds.x;
  let sy = this.m_iconBounds.y;
  let w = this.m_iconBounds.width;
  let h = this.m_iconBounds.height;

  // 数値の下限、上限に対応する座標値を特定
  let pt_min, pt_max;
  if (this.m_bVert) {
    pt_min = sy + 1;
    pt_max = sy + h - 2;
  } else {
    pt_min = sx + 1;
    pt_max = sx + w - 2;
  }
  // eval(dbgv([ 'pt_min', 'pt_max' ]));
  // eval(dbgv([ 'sx', 'sy', 'w', 'h' ]));

  // 内分して座標化
  let pt = pt_min
    + ((pt_max - pt_min) * (val - this.m_exValMin)) / (this.m_exValMax - this.m_exValMin);
  // eval(dbgv(['this.m_exValMin' ]));
  // eval(dbgv([ 'val - this.m_exValMin' ]));
  // eval(dbgv([ 'pt' ]));

  // クリッピング
  if (pt < pt_min) {
    pt = pt_min;
  } else if (pt > pt_max) {
    pt = pt_max;
  }

  // 矩形化
  let valBounds;
  if (this.m_bVert) {
    valBounds = jsRect(sx + 1, sy + 1, w - 2, Math.ceil(pt) - pt_min);
  } else {
    valBounds = jsRect(sx + 1, sy + 1, Math.ceil(pt) - pt_min, h - 2);
  }
  // console.dir(valBounds);

  return valBounds;
}

/// 境界と内側を描画する。
MicroSlideBar.prototype.drawBase = function(context)
{
  let sx = this.m_iconBounds.x;
  let sy = this.m_iconBounds.y;
  let w = this.m_iconBounds.width;
  let h = this.m_iconBounds.height;

  // 枠線
  context.fillStyle = this.m_borderColor;
  draw_rect_R(this.m_iconBounds, context);

  // 内側
  context.fillStyle = this.m_outRangeColor;
  context.fillRect(sx + 1, sy + 1, w - 2, h - 2);
}

/// 数値を表示に反映する。
MicroSlideBar.prototype.drawValue = function(val, context)
{
  let sx = this.m_iconBounds.x;
  let sy = this.m_iconBounds.y;
  // let w = this.m_iconBounds.width;
  let h = this.m_iconBounds.height;

  // 数値記憶
  this.m_value = val;

  // 基礎部分描画
  this.drawBase(context);

  // In-range描画
  let vb = this.encodeToPoint(val);
  context.fillStyle = this.m_inRangeColor;
  context.fillRect(vb.x, vb.y, vb.width, vb.height, context);

  // テキスト描画
  let textMaxWidth = this.m_iconBounds.width - 3;
  let text = this.m_pfx + val + this.m_sfx;
  context.fillStyle = this.m_textColor;
  context.fillText(text, sx + 1, sy + h - 2, textMaxWidth);
}

/// 最初の表示を行う。
MicroSlideBar.prototype.show = function(val, context)
{
  this.drawValue(val, context);
}

/// 選択直後の初期表示を行う。
MicroSlideBar.prototype.OnSelected = function(e, val)
{
  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');

  this.show(val, context);
}

/// 数値を表示に反映する。
MicroSlideBar.prototype.OnPicked = function(e)
{
  let tool_canvas = e.m_sender.getToolPaletteCanvas();
  let context = tool_canvas.getContext('2d');

  let val = this.decodePoint(e.m_point);
  if (val != null) {
    val = Math.round(val);
    this.drawValue(val, context);
  }

  return this.m_value;
}
