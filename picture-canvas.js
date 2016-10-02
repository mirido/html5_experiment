'use strict';

//
//	PictureCanvas
//

/// 新しいインスタンスを初期化する。
function PictureCanvas()
{
	// DOMオブジェクト取得
	this.m_view_port = document.getElementById("viewport");
	this.m_layers = [
		document.getElementById("canvas_0"),
		document.getElementById("canvas_1"),
		document.getElementById("canvas_2")
	];
	this.m_joint_canvas = document.getElementById("joint_canvas");

	// イベントハンドラ登録
	register_pointer_event_handler(this.m_view_port, this);
}

/// イベントリスナ。
PictureCanvas.prototype.handleEvent = function(e)
{
	console.log("Event: " + e.type);
	switch (e.type) {
	case 'mousedown':
	case 'touchistart':
		g_pointManager.notifyPointStart(this, e);
		break;
	case 'mouseup':
	case 'touchend':
		break;
	default:
		break;
	}
	// console.dir(e);
}
