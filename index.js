'use strict';

console.log("index.js starts.");

let g_view_port;					// 描画領域
let g_layers;							// レイヤー
let g_tool_palette;				// ツールパレット
let g_joint_canvas;				// 合成画像描画先

// ポインタ状態管理
let g_pointManager;

// 描画キャンバス
let g_pictureCanvas;

// イベントハンドラ登録
window.onload = init_wnd;
window.onclose = dispose_wnd;

/// ページのロード完了時に呼ばれる。
function init_wnd()
{
	console.log("init() called.");

	// DOMオブジェクト取得
	g_view_port = document.getElementById("viewport");
	g_layers = [
		document.getElementById("canvas_0"),
		document.getElementById("canvas_1"),
		document.getElementById("canvas_2")
	];
	g_tool_palette = document.getElementById("tool_pallete");
	g_joint_canvas = document.getElementById("joint_canvas");

	// インスタンス生成
	g_pointManager = new PointManager();
	g_pictureCanvas = new PictureCanvas();

	// キャンバスを白色でfill
	g_pictureCanvas.eraseCanvas();

	// ツールパレットを背景色でfill
	{
		let ctx = g_tool_palette.getContext('2d');
		ctx.fillStyle = "rgba(232, 239, 255, 255)";
		ctx.fillRect(0, 0, g_tool_palette.width, g_tool_palette.height);
	}

	// 図形描画
  sample01(g_layers);

	// 画像合成
	g_pictureCanvas.getJointImage(g_joint_canvas);
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

//
//	マウスイベントのlistener
//

function listener_OnMouseDown(e)
{
	console.log("hello world!");
	console.dir(e);
}
