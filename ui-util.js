'use strict';

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

/// mousedownまたはtouchstartが起きたオブジェクトを記憶する。
/// objはhandleEvent()メソッドを有する前提。
PointManager.prototype.notifyPointStart = function(obj, e)
{
  console.log("******* " + e);
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
      let mod_e = Object.assign({ }, e);  // 値コピー
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
