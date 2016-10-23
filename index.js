// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

console.log("index.js starts.");

// ポインタ状態管理
let g_pointManager;

// キー入力管理
let g_keyStateManager;

// 描画キャンバス
let g_pictureCanvas;

// ツールパレット
let g_toolPalette;

// イベントハンドラ登録
window.onload = init_wnd;
window.onclose = dispose_wnd;

/// ページのロード完了時に呼ばれる。
function init_wnd()
{
	console.log("init() called.");

	// インスタンス生成
	g_pointManager = new PointManager();
	g_keyStateManager = new KeyStateManager();
	g_pictureCanvas = new PictureCanvas();
	g_toolPalette = new ToolPalette(g_pictureCanvas);

	// キャンバスを白色でfill
	g_pictureCanvas.eraseCanvas();

	// 図形描画
  sample01(g_pictureCanvas.m_layers);

	// utest_ImagePatch();		// UTEST
	// utesst_ColorConversion();		// UTEST
	// utest_canvas_2d_context(g_pictureCanvas.m_layers[2]);	// UTEST
	// utest_get_mask_image();		// UTEST

	// 画像合成
	let joint_canvas = document.getElementById("joint_canvas");
	g_pictureCanvas.getJointImage(joint_canvas);
}

/// ウィンドウが閉じるとき呼ばれる。
function dispose_wnd()
{
	g_pointManager.dispose();
	g_pointManager = null;
	g_keyStateManager.dispose();
	g_keyStateManager = null;
	// TBD
}

//
//  マルチレイヤーサンプル
//

function sample01(layers)
{
//  if ( ! layers || ! canvas.getContext ) { return false; }
  var ctx = layers[2].getContext('2d');
  /* 半透明度を指定 */
  ctx.globalAlpha = 0.5;
  /* 円 #1 */
  ctx.beginPath();
  ctx.fillStyle = 'rgb(192, 80, 77)'; // 赤
  ctx.arc(70, 45, 35, 0, Math.PI*2, false);
  ctx.fill();
  /* 円 #2 */
  ctx.beginPath();
  ctx.fillStyle = 'rgb(155, 187, 89)'; // 緑
  ctx.arc(45, 95, 35, 0, Math.PI*2, false);
  ctx.fill();
  /* 円 #3 */
  ctx.beginPath();
  ctx.fillStyle = 'rgb(128, 100, 162)'; // 紫
  ctx.arc(95, 95, 35, 0, Math.PI*2, false);
  ctx.fill();
  /* canvasに描いた図形から中心部分のイメージを抜き出す */
  var image = ctx.getImageData(45, 45, 50, 50);

  /* 2つ目のcanvas左上に抜き出したイメージを貼り付ける */
  var ctx2 = layers[1].getContext('2d');
  ctx2.fillStyle = "black";
  ctx2.fillRect(0, 0, 140, 140);
  ctx2.putImageData(image, 10, 10);

	// draw_circle()のテスト
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.globalAlpha = 1.0;
	draw_circle(200, 200, 100, ctx, false);
	draw_circle(200, 200, 30, ctx, false);
	draw_circle(200, 200, 19, ctx, false);
	draw_circle(200, 200, 10, ctx, false);
	ctx.fillRect(150, 150, 50, 50);
}
