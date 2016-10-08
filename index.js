'use strict';

console.log("index.js starts.");

// ポインタ状態管理
let g_pointManager;

// 描画キャンバス
let g_pictureCanvas;

// ツールパレット
let g_toolPalette;

// ツール
let g_pencilTool;

// イベントハンドラ登録
window.onload = init_wnd;
window.onclose = dispose_wnd;

/// ページのロード完了時に呼ばれる。
function init_wnd()
{
	console.log("init() called.");

	// インスタンス生成
	g_pointManager = new PointManager();
	g_pictureCanvas = new PictureCanvas();
	g_toolPalette = new ToolPalette();
	g_pencilTool = new PencilTool();

	// 暫定
	g_pictureCanvas.setDrawer(g_pencilTool);

	// キャンバスを白色でfill
	g_pictureCanvas.eraseCanvas();

	// 図形描画
  sample01(g_pictureCanvas.m_layers);

	// 画像合成
	let joint_canvas = document.getElementById("joint_canvas");
	g_pictureCanvas.getJointImage(joint_canvas);
}

/// ウィンドウが閉じるとき呼ばれる。
function dispose_wnd()
{
	g_pointManager = null;
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
}
