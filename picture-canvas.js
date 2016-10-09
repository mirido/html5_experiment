'use strict';

//
//	PointingEvent
//

// Description:
// ポインティングイベントを表す。

/// 新しいインスタンスを初期化する。
function PointingEvent(sender, e)
{
	this.m_sender = sender;
	let bounds = sender.getBoundingDrawAreaRect();
	this.m_point = jsPoint(
		e.clientX - bounds.x,
		e.clientY - bounds.y
	);
	this.m_spkey = g_keyStateManager.getSpKeyState();
}

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

	// ポインタデバイスのドラッグ状態
	this.m_bDragging = false;
	this.m_lastEvent = null;

	// イベントハンドラ登録
	register_pointer_event_handler(this.m_view_port, this);

	// レイヤーのサイズ調整
	this.fitCanvas();

	// レイヤーのオフセット取得
	// fitCanvas()呼出し後である必要がある。
	this.m_layer_left = parseInt(this.m_layers[0].style.left);
	this.m_layer_top = parseInt(this.m_layers[0].style.top);
}

/// イベントリスナ。
PictureCanvas.prototype.handleEvent = function(e)
{
	// console.log("Event: " + e.type);
	// console.dir(e);

	// 描画ツールに引き渡す情報を構成
	let mod_e = new PointingEvent(this, e);
	this.m_lastEvent = Object.assign({}, mod_e);		// 値コピー
	// console.dir(this.m_lastEvent);

	// イベント別処理
	switch (e.type) {
	case 'mousedown':
	case 'touchstart':
		// mouseupやtouchendを確実に補足するための登録
		g_pointManager.notifyPointStart(this, e);

		// 描画開始を通知
		this.m_bDragging = true;
		if (this.m_drawer) {
			this.m_drawer.OnDrawStart(mod_e);
		}
		break;
	case 'mouseup':
	case 'touchend':
		// 描画終了を通知
		if (this.m_bDragging && this.m_drawer) {
			this.m_drawer.OnDrawEnd(mod_e);
		}
		this.m_bDragging = false;
		break;
	case 'mousemove':
	case 'touchmove':
		// ポインタの移動を通知
		if (this.m_bDragging && this.m_drawer) {
			this.m_drawer.OnDrawing(mod_e);
		}
		break;
	default:
		break;
	}
}

/// 要素の絶対座標を返す。
PictureCanvas.prototype.getBoundingDrawAreaRect = function()
{
	let bounds = this.m_layers[0].getBoundingClientRect();
	return bounds;
}

/// 描画ツールを設定する。
PictureCanvas.prototype.setDrawer = function(drawer)
{
	assert(!this.m_bDragging);
	let prev = this.m_drawer;
	this.m_drawer = drawer;
	return prev;
}

/// カレントレイヤーを変更する。
PictureCanvas.prototype.changeLayer = function(layerNo)
{
	assert(1 <= layerNo && layerNo < this.m_layers.length);
	m_nTargetLayerNo = layerIdx;
}

/// カレントレイヤーを取得する。
PictureCanvas.prototype.getLayer = function()
{
	return this.m_layers[this.m_nTargetLayerNo];
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
	// 	draw_line_1px(0.5, 0.5, 200.5, 200.5, ctx, 1);
	// 	ctx.stroke();
	// 	ctx.closePath();
	// }
}

/// 全レイヤーを合成する。
PictureCanvas.prototype.getJointImage = function(dstCanvas)
{
	get_joint_image(this.m_layers, dstCanvas);
}

/// View portをキャンバスにfitさせる。
PictureCanvas.prototype.fitCanvas = function()
{
	const width_margin = 100;
	const height_margin = 50;
	const layer_margin_horz = 5;
	const layer_margin_vert = 5;
	const layer_client_width_min = 400;
	const layer_client_height_min = 400;

	// レイヤーのオフセット設定
	// オフセットの値はCSSで指定してあるが、なぜかプログラムから
	// 1回は明示的に設定せねばプログラムで値を取得できない。FireFoxにて確認。
	for (let i = 0; i < this.m_layers.length; ++i) {
		this.m_layers[0].style.left = layer_margin_horz + "px";
		this.m_layers[0].style.top = layer_margin_vert + "px";
	}

	// View portの寸法取得
	let vport_client_width = this.m_view_port.clientWidth;
	let vport_client_height = this.m_view_port.clientHeight;
	let vport_outer_width = this.m_view_port.offsetWidth;
	let vport_outer_height = this.m_view_port.offsetHeight;
	// {	/*UTEST*/		// スクロールバーの幅の算出
	// 	// 次の関係が成り立つ。
	// 	//   vport_client_width < vport_outer_width == vport_bounds.width
	// 	// vport_client_widthがスクロールバーを含まない領域幅のようだ。
	// 	let vport_bounds = this.m_view_port.getBoundingClientRect();
	// 	console.log("vport_client_width=" + vport_client_width
	// 	 	+ ", vport_outer_width=" + vport_outer_width
	// 		+ ", vport_bounds.width=" + vport_bounds.width
	// 	);
	// 	console.log("scroll bar width(?)=" + (vport_outer_width - vport_client_width));
	// 	console.log("layer client width=" + this.m_layers[0].clientWidth);
	// }

	// レイヤーの寸法取得
	let layer_outer_width = this.m_layers[0].offsetWidth;
	let layer_outer_height = this.m_layers[0].offsetHeight;
	{
		let layer_client_width = this.m_layers[0].clientWidth;
		let layer_client_height = this.m_layers[0].clientHeight;
		if (layer_client_width < layer_client_width_min) {
			layer_outer_width += (layer_client_width_min - layer_client_width);
		}
		if (layer_client_height < layer_client_height_min) {
			layer_outer_height += (layer_client_height_min - layer_client_height);
		}
	}

	// レイヤーのオフセット取得
	let layer_left = parseInt(this.m_layers[0].style.left);
	let layer_top = parseInt(this.m_layers[0].style.top);
	// console.log("layer_left=" + layer_left + ", layer_top=" + layer_top);

	// View portの必要なサイズを取得
	let delta_w = layer_left + layer_outer_width - vport_client_width;
	let delta_h = layer_top + layer_outer_height - vport_client_height;
	let vport_outer_width_min = vport_outer_width + delta_w;
	let vport_outer_height_min = vport_outer_height + delta_h;

	// ウィンドウの表示領域サイズで制限をかける
	// console.log("window.innerWidth=" + window.innerWidth);
	// console.log("window.innerHeight=" + window.innerHeight);
	if (vport_outer_width_min > window.innerWidth - width_margin) {
		vport_outer_width_min = window.innerWidth - width_margin;
	}
	if (vport_outer_height_min > window.innerHeight - height_margin) {
		vport_outer_height_min = window.innerHeight - height_margin;
	}

	// View portのサイズ設定
	this.m_view_port.style.width = vport_outer_width_min + "px";
	this.m_view_port.style.height = vport_outer_height_min + "px";
}
