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
	this.m_view_port.addEventListener('mousedown', this, false);
}

/// メソッド定義
PictureCanvas.prototype = function listener_OnMouseDown(e) {
	console.log("PictureCanvas::OnMouseDown called.");
	console.dir(e);
};

PictureCanvas.prototype.handleEvent = function(e)
{
	console.log("hello world!");
	console.dir(e);
}
