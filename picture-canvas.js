// Copyright (c) 2016, mirido
// All rights reserved.

﻿'use strict';

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
	this.m_spKey = g_keyStateManager.getSpKeyState();
	this.m_type = e.type;
	this.m_button = e.button;
}

/// クローンを返す。
function PointingEventClone(e)
{
	this.m_sender = e.m_sender;
	this.m_point = jsPoint(e.m_point.x, e.m_point.y);
	this.m_spKey = e.m_spKey;
	this.m_type = e.m_type;
	this.m_button = e.m_button;
};

//
//	PictureCanvas
//

/// 新しいインスタンスを初期化する。
function PictureCanvas()
{
	// DOMオブジェクト取得
	this.m_view_port = document.getElementById("viewport");
	this.m_allLayers = [
		document.getElementById("canvas_0"),
		document.getElementById("canvas_1"),
		document.getElementById("canvas_2"),
		document.getElementById("surface")
	];
	this.m_joint_canvas = document.getElementById("joint_canvas");

	// レイヤー区分
	this.m_workingLayers = [
		this.m_allLayers[1],
		this.m_allLayers[2]
	];
	this.m_jointTargetLayers = [
		this.m_allLayers[0],
		this.m_allLayers[1],
		this.m_allLayers[2]
	];
	this.m_surface = this.m_allLayers[3];

	// 代替レイヤー
	// .hidden = trueとしたレイヤーに対しては正常に描画できないため、
	// 代替レイヤーを設ける。
	this.m_altLayers = [];

	// 描画担当ツール
	// イベントのフックを実現可能なように、複数登録を許す。
	this.m_drawers = [];

	// 描画担当ツールに引き渡す情報
	this.m_nTargetLayerNo = this.m_workingLayers.length - 1;		// 描画対象レイヤー

	// ポインタデバイスのドラッグ状態
	this.m_bDragging = false;
	this.m_lastEvent = null;

	// イベントハンドラ登録
	register_pointer_event_handler(this.m_view_port, this);

	// レイヤーのサイズ調整
	this.fitCanvas();

	// レイヤーのオフセット取得
	// fitCanvas()呼出し後である必要がある。
	this.m_layer_left = parseInt(this.m_allLayers[0].style.left);
	this.m_layer_top = parseInt(this.m_allLayers[0].style.top);

	// レイヤ固定要求リスナ
	this.m_layerFixListeners = [];
}

/// イベントリスナ。
PictureCanvas.prototype.handleEvent = function(e)
{
	// console.log("Event: " + e.type);
	// console.dir(e);

	// 描画ツールに引き渡す情報を構成
	let mod_e = new PointingEvent(this, e);
	// this.m_lastEvent = Object.assign({}, mod_e);		// 値コピー	-- NG. IEは非サポート
	this.m_lastEvent = new PointingEvent(this, e);
	// console.dir(this.m_lastEvent);

	// イベント別処理
	switch (e.type) {
	case 'mousedown':
	case 'touchstart':
		// mouseupやtouchendを確実に補足するための登録
		g_pointManager.notifyPointStart(this, e);

		// 描画開始を通知
		this.m_bDragging = true;
		for (let i = 0; i < this.m_drawers.length; ++i) {
			if (this.m_drawers[i].OnDrawStart) {
				this.m_drawers[i].OnDrawStart(mod_e);
			}
		}
		break;
	case 'mouseup':
	case 'touchend':
		// 描画終了を通知
		if (this.m_bDragging) {
			for (let i = 0; i < this.m_drawers.length; ++i) {
				if (this.m_drawers[i].OnDrawEnd) {
					this.m_drawers[i].OnDrawEnd(mod_e);
				}
			}
		}
		this.m_bDragging = false;
		break;
	case 'mousemove':
	case 'touchmove':
		// ポインタの移動を通知
		if (this.m_bDragging) {
			for (let i = 0; i < this.m_drawers.length; ++i) {
				if (this.m_drawers[i].OnDrawing) {
					this.m_drawers[i].OnDrawing(mod_e);
				}
			}
		}
		break;
	default:
		break;
	}
}

/// 要素の絶対座標を返す。
PictureCanvas.prototype.getBoundingDrawAreaRect = function()
{
	let bounds = getBoundingClientRectWrp(this.m_allLayers[0]);
	return bounds;
}

/// 描画ツールを追加する。
/// 異なる描画ツールを複数追加可能。
/// その場合、描画イベント発生時に描画イベントハンドラが追加順で呼ばれる。
/// 同一の描画ツールの複数追加はできない。(2回目以降の追加を無視する。)
/// イベント通知先ツールから呼ばれる想定。
PictureCanvas.prototype.addDrawer = function(drawer)
{
	assert(drawer != null);
	if (this.m_bDragging) {
		assert(false);
		return false;
	}
	return add_to_unique_list(this.m_drawers, drawer);
}

/// 指定した描画ツールを削除する。
PictureCanvas.prototype.removeDrawer = function(drawer)
{
	assert(drawer != null);
	if (this.m_bDragging) {
		assert(false);
		return false;
	}
	return remove_from_unique_list(this.m_drawers, drawer);
}

/// レイヤー数を取得する。
PictureCanvas.prototype.getNumLayers = function()
{
	return this.m_workingLayers.length;
}

/// レイヤーを取得する。
PictureCanvas.prototype.getLayer = function(layerNo)
{
	assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
	if (this.m_altLayers[layerNo] != null)
		return this.m_altLayers[layerNo];
	return this.m_workingLayers[layerNo];
}

/// カレントレイヤーを変更する。
PictureCanvas.prototype.changeLayer = function(layerNo)
{
	assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
	// this.raiseLayerFixRequest(this.m_workingLayers[layerNo]);	// イベント最適化
	this.m_nTargetLayerNo = layerNo;
	/*=	<イベント最適化>
	 *	当メソッドを呼び出すのは、現状専らCommonSettingクラスであり、
	 *	そのときすでにthis.raiseLayerFixRequest()を呼び出しているため、
	 *	ここでの呼び出しを省略する。
	 */
}

/// カレントレイヤーを取得する。
PictureCanvas.prototype.getCurLayer = function()
{
	if (this.m_altLayers[this.m_nTargetLayerNo] != null) {
		// console.log("this.m_altLayers[this.m_nTargetLayerNo]: w=" + this.m_altLayers[this.m_nTargetLayerNo].width + ", h=" + this.m_altLayers[this.m_nTargetLayerNo].height);
		return this.m_altLayers[this.m_nTargetLayerNo];
	}
	// console.log("this.m_workingLayers[this.m_nTargetLayerNo]: w=" + this.m_workingLayers[this.m_nTargetLayerNo].width + ", h=" + this.m_workingLayers[this.m_nTargetLayerNo].height);
	return this.m_workingLayers[this.m_nTargetLayerNo];
}

/// サーフェスを取得する。
PictureCanvas.prototype.getSurface = function()
{
	console.log("this.m_surface: w=" + this.m_surface.width + ", h=" + this.m_surface.height);
	return this.m_surface;
}

/// レイヤーの可視属性を取得する。
PictureCanvas.prototype.getLayerVisibility = function(layerNo)
{
	return !this.m_workingLayers[layerNo].hidden;
}

/// レイヤーの可視属性を設定する。
PictureCanvas.prototype.setLayerVisibility = function(layerNo, bVisible)
{
	if (this.m_altLayers[layerNo] == null) {
		if (!bVisible) {
			// 不可視化処理
			let layer = this.m_workingLayers[layerNo];		// Alias
			let ctx = layer.getContext('2d');
			let imgd = ctx.getImageData(0, 0, layer.width, layer.height);
			this.m_altLayers[layerNo] = document.createElement('canvas');
			this.m_altLayers[layerNo].setAttribute('width', layer.width);
			this.m_altLayers[layerNo].setAttribute('height', layer.height);
			let ctx2 = this.m_altLayers[layerNo].getContext('2d');
			ctx2.putImageData(imgd, 0, 0);
			layer.hidden = true;
		}
	} else {
		assert(this.m_altLayers[layerNo] != null);
		if (bVisible) {
			// 可視化処理
			let layer = this.m_workingLayers[layerNo];		// Alias
			layer.hidden = false;
			let ctx2 = this.m_altLayers[layerNo].getContext('2d');
			let imgd = ctx2.getImageData(0, 0, layer.width, layer.height);
			let ctx = layer.getContext('2d');
			ctx.putImageData(imgd, 0, 0);
			this.m_altLayers[layerNo] = null;
		}
	}
}

/// キャンバスを全クリアする。
/// サーフェス等も含め、全レイヤーをクリアする。
/// (ただし背景レイヤーのみは白色にする。)
PictureCanvas.prototype.eraseCanvas = function()
{
	erase_canvas(this.m_allLayers);
}

/// 描画レイヤーおよび背景を合成する。
/// サーフェス等、効果のためのレイヤーは含まない。
PictureCanvas.prototype.getJointImage = function(dstCanvas)
{
	get_joint_image(this.m_jointTargetLayers, dstCanvas);
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
	for (let i = 0; i < this.m_allLayers.length; ++i) {
		this.m_allLayers[0].style.left = layer_margin_horz + "px";
		this.m_allLayers[0].style.top = layer_margin_vert + "px";
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
	// 	console.log("layer client width=" + this.m_allLayers[0].clientWidth);
	// }

	// レイヤーの寸法取得
	let layer_outer_width = this.m_allLayers[0].offsetWidth;
	let layer_outer_height = this.m_allLayers[0].offsetHeight;
	{
		let layer_client_width = this.m_allLayers[0].clientWidth;
		let layer_client_height = this.m_allLayers[0].clientHeight;
		if (layer_client_width < layer_client_width_min) {
			layer_outer_width += (layer_client_width_min - layer_client_width);
		}
		if (layer_client_height < layer_client_height_min) {
			layer_outer_height += (layer_client_height_min - layer_client_height);
		}
	}

	// レイヤーのオフセット取得
	let layer_left = parseInt(this.m_allLayers[0].style.left);
	let layer_top = parseInt(this.m_allLayers[0].style.top);
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

/// レイヤー固定要求リスナを追加する。
PictureCanvas.prototype.addLayerFixListener = function(listener)
{
	console.log("PictureCanvas::addLayerFixListener() called.")
	assert(listener != null);
	return add_to_unique_list(this.m_layerFixListeners, listener);
}

/// レイヤー固定要求リスナを削除する。
PictureCanvas.prototype.removeLayerFixListener = function(listener)
{
	console.log("PictureCanvas::removeLayerFixListener() called.")
	assert(listener != null);
	return remove_from_unique_list(this.m_layerFixListeners, listener);
}

/// レイヤー固定要求を発生させる。
PictureCanvas.prototype.raiseLayerFixRequest = function(nextLayer)
{
	// console.log("PictureCanvas::raiseLayerFixRequest() called. n=" + this.m_layerFixListeners.length);
	if (nextLayer == null) {
		nextLayer = this.m_workingLayers[this.m_nTargetLayerNo];
	}
	for (let i = 0; i < this.m_layerFixListeners.length; ++i) {
		console.log("PictureCanvas::raiseLayerFixRequest(): Checking listener...");
		if (this.m_layerFixListeners[i].OnLayerToBeFixed) {
			console.log("PictureCanvas::raiseLayerFixRequest(): Calling listener...");
			this.m_layerFixListeners[i].OnLayerToBeFixed(this, nextLayer);
		}
	}
}
