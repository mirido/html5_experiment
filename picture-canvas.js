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

	// {	/*UTEST*/	// 座標確認
	// 	this.m_layres[0].
	// 	let rectZ = document.documentElement.getBoundingClientRect();
	// 	let rect0 = document.body.getBoundingClientRect();
	// 	let rect1 = this.m_view_port.getBoundingClientRect();
	// 	let rect2 = this.m_layers[0].getBoundingClientRect();
	// 	console.log("rectZ=(" + rectZ.left + ", " + rectZ.top + ", " + rectZ.width + ", " + rectZ.height + ")");
	// 	console.log("rect0=(" + rect0.left + ", " + rect0.top + ", " + rect0.width + ", " + rect0.height + ")");
	// 	console.log("rect1=(" + rect1.left + ", " + rect1.top + ", " + rect1.width + ", " + rect1.height + ")");
	// 	console.log("rect2=(" + rect2.left + ", " + rect2.top + ", " + rect2.width + ", " + rect2.height + ")");
	// }
}

/// イベントリスナ。
PictureCanvas.prototype.handleEvent = function(e)
{
	// console.log("Event: " + e.type);
	// console.dir(e);
	switch (e.type) {
	case 'mousedown':
	case 'touchistart':
		// {		/*UTEST*/	// 座標確認
		// 	let rect = this.getBoundingClientRect();
		// 	console.log("rect.left=" + rect.left + ", rect.top=" + rect.top);
		// 	let sx0 = window.screenX;
		// 	let sy0 = window.screenY;
		// 	console.log("sx0=" + sx0 + ", sy0=" + sy0);
		// 	let ofsX = window.pageXOffset;
		// 	let ofsY = window.pageYOffset;
		// 	console.log("ofsX=" + ofsX + ", ofsY=" + ofsY);
		// 	console.log("e.clientX=" + e.clientX + ", e.clientY=" + e.clientY);
		// 	console.log("e.screenX=" + e.screenX + ", e.screenY=" + e.screenY);
		//
		// }
		g_pointManager.notifyPointStart(this, e);
		break;
	case 'mouseup':
	case 'touchend':
		break;
	default:
		break;
	}
}

/// 要素の絶対座標を返す。
PictureCanvas.prototype.getBoundingClientRect = function()
{
	return this.m_view_port.getBoundingClientRect();
}
