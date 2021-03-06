// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { g_history, g_pictureCanvas, onDispose, onInitialize } from './app-global';
import { draw_circle } from './graphics';
// Unit test
// import { utest_ImagePatch } from './utest';

'use strict';

console.log("index.js starts.");

// イベントハンドラ登録
window.onload = init_wnd;
window.onclose = dispose_wnd;

/// ページのロード完了時に呼ばれる。
function init_wnd(): void {
	console.log("init() called.");

	// インスタンス生成
	onInitialize();

	// キャンバスを白色でfill
	g_pictureCanvas.eraseCanvas();

	// 図形描画
	sample01(
		g_pictureCanvas.getLayer(1),
		g_pictureCanvas.getLayer(0)
	);

	// utest_ImagePatch();		// UTEST
	// utesst_ColorConversion();		// UTEST
	// utest_canvas_2d_context(g_pictureCanvas.getLayer(0));	// UTEST
	// utest_get_mask_image();		// UTEST
	// utest_half_tone();		// UTEST

	// 画像合成
	const joint_canvas = <HTMLCanvasElement>document.getElementById("joint_canvas");
	g_pictureCanvas.getJointImage(joint_canvas);

	// キャンバス状態を記憶(Undo/Redo)
	// この時点のキャンバス状態がundo/redoの起点となる。
	g_history.attachImage();
}

/// ウィンドウが閉じるとき呼ばれる。
function dispose_wnd() {
	onDispose();
	// TBD
}

//
//  マルチレイヤーサンプル
//

function sample01(layer1: HTMLCanvasElement, layer2: HTMLCanvasElement): void {
	const ctx = layer1.getContext('2d');
	/* 半透明度を指定 */
	// ctx.globalAlpha = 0.5;
	/* 円 #1 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(192, 80, 77)'; // 赤
	ctx.arc(70, 45, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* 円 #2 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(155, 187, 89)'; // 緑
	ctx.arc(45, 95, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* 円 #3 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(128, 100, 162)'; // 紫
	ctx.arc(95, 95, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* canvasに描いた図形から中心部分のイメージを抜き出す */
	const image = ctx.getImageData(45, 45, 50, 50);

	/* 別のlayerの左上に抜き出したイメージを貼り付ける */
	const ctx2 = layer2.getContext('2d');
	ctx2.fillStyle = "black";
	ctx2.fillRect(0, 0, 140, 140);
	ctx2.putImageData(image, 10, 10);

	// draw_circle()のテスト
	ctx.fillStyle = 'rgb(0, 0, 0)';
	// ctx.globalAlpha = 1.0;
	draw_circle(200, 200, 100, ctx, false);
	draw_circle(200, 200, 30, ctx, false);
	draw_circle(200, 200, 19, ctx, false);
	draw_circle(200, 200, 10, ctx, false);
	ctx.fillRect(150, 150, 50, 50);
}
