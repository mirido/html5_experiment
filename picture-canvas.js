'use strict';

//
//	PictureCanvas
//

// ■ PictureCanvas
// canvasを重ねた描画領域を表す。
// 領域内にてマウスまたはタッチパネルイベントを受け付け、
// 登録された描画ツールに座標と対象レイヤーの情報を配送する。
// (描画のためのcanvas要素の操作は描画ツールに委譲する。)
// キャンバス全クリアとレイヤー合成の機能を備える。

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

	// 描画担当ツール
	this.m_drawer = null;

	// 描画担当ツールに引き渡す情報
	this.m_nTargetLayerNo = this.m_layers.length - 1;		// 描画対象レイヤー
	this.m_rect_view_port = this.m_view_port.getBoundingClientRect();
	this.m_rect_layer = this.m_layers[0].getBoundingClientRect();

	// ポインタデバイスのドラッグ状態
	this.m_bDragging = false;

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

	// 描画ツールに引き渡す情報を構成
	let mod_e;
	if (this.m_drawer) {
		// mod_e = Object.assign({ }, e);  // 値コピー	// NG。うまく機能しない。
		mod_e = e;		// Alias
		let dx = this.m_rect_view_port.left - this.m_rect_layer.left;
		let dy = this.m_rect_view_port.top - this.m_rect_layer.top;
		//mod_e.clientX += dx;	// 不要かつできない(eはconstオブジェクト)
		//mod_e.clientY += dy;	// 同上
		// console.dir(this.m_rect_view_port);	// UTEST
		// console.dir(this.m_rect_layer);			// UTEST
		// console.dir(mod_e);		// UTEST
		// console.dir(e);		// UTEST
		// 座標周りの考え方は、実は(e.clientX, e.clientY)はHTMLページ左上原点とする
		// 共通の座標系であり、全HTML要素共通なので、HTML要素毎に変換する必要は無い。
		// HTML要素内のローカル座標にしたければ、
		// (HTML要素).getBoundingClientRect()が返すDOMRectの(.x, .y)を引く。
	}

	// イベント別処理
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

		// mouseupやtouchendを確実に補足するための登録
		g_pointManager.notifyPointStart(this, e);

		// 描画開始を通知
		this.m_bDragging = true;
		if (this.m_drawer) {
			this.m_drawer.OnDrawStart(mod_e, this.m_layers, this.m_nTargetLayerNo);
		}
		break;
	case 'mouseup':
	case 'touchend':
		// 描画終了を通知
		if (this.m_bDragging && this.m_drawer) {
			this.m_drawer.OnDrawEnd(mod_e, this.m_layers, this.m_nTargetLayerNo);
		}
		this.m_bDragging = false;
		break;
	case 'mousemove':
	case 'touchmove':
		// ポインタの移動を通知
		if (this.m_bDragging && this.m_drawer) {
			this.m_drawer.OnDrawing(mod_e, this.m_layers, this.m_nTargetLayerNo);
		}
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

/// 描画ツールを設定する。
PictureCanvas.prototype.setDrawer = function(drawer)
{
	assert(!this.m_bDragging);
	let prev = this.m_drawer;
	this.m_drawer = drawer;
	return prev;
}

/// キャンバスを全クリアする。
PictureCanvas.prototype.eraseCanvas = function()
{
	erase_canvas(this.m_layers);

	// {	/*UTEST*/	// アンチエリアシング無し描画テスト
	// 	let ctx = this.m_layers[0].getContext('2d');
	// 	// ctx.strokeStyle = "#000000";
	// 	ctx.fillStyle = "#000000";
	// 	ctx.beginPath();
	// 	draw_line(0.5, 0.5, 200.5, 200.5, ctx, 1);
	// 	ctx.stroke();
	// 	ctx.closePath();
	// }
}

/// 全レイヤーを合成する。
PictureCanvas.prototype.getJointImage = function(dstCanvas)
{
	get_joint_image(this.m_layers, dstCanvas);
}
