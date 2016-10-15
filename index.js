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

	{	// UTEST: ImagePatchのテスト
		let layer1 = g_pictureCanvas.getLayer(1);
		let layer2 = g_pictureCanvas.getLayer(2);

		{
			let ctx1 = layer1.getContext('2d');
			ctx1.globalAlpha = 1.0;
			ctx1.fillStyle = 'rgb(255,0,0)';
			ctx1.fillRect(0, 0, layer1.clientWidth, layer1.clientHeight);
		}

		let width = layer2.clientWidth;
		let height = layer2.clientHeight;
		let ctx2 = layer2.getContext('2d');
		ctx2.globalAlpha = 1.0;
		ctx2.fillStyle = 'rgb(255,255,255)';
		draw_line_1px(0, 105, 399, 105, ctx2);
		draw_line_1px(110, 0, 110, 399, ctx2);

		let patch = new ImagePatch(ctx2, width, height, [ jsPoint(100, 100), jsPoint(120, 110) ], 50);

		// patch.m_bounds描画
		let r = patch.m_bounds;		// Alias
		ctx2.fillStyle = 'rgb(255,0,0)';
		draw_rect_R(r, ctx2, 1);
		draw_line_1px(r.x, r.y, r.x + r.width - 1, r.y + r.height - 1, ctx2);

		// layer2を一旦消去し、右下に元画像提示
		ctx2.fillStyle = 'rgb(0,128,128)';
		ctx2.fillRect(0, 0, layer2.clientWidth, layer2.clientHeight);
		patch.put(250, 250, ctx2, layer2.clientWidth, layer2.clientHeight);

		// 復元テスト
		// 透明度込みで復元される。(OK)
		// patch.restore(ctx2);

		// 描画テスト
		// patch.put(110 + 10, 105 - 10, ctx2, layer2.clientWidth, layer2.clientHeight);	// 画像内OK
		// patch.put(61, 56, ctx2, layer2.clientWidth, layer2.clientHeight);	// 左上から1 px右下 OK
		// patch.put(60, 55, ctx2, layer2.clientWidth, layer2.clientHeight);	// 左上隅	OK
		// patch.put(59, 54, ctx2, layer2.clientWidth, layer2.clientHeight);	// 左上隅から1 px左上	OK
		// patch.put(0, 0, ctx2, layer2.clientWidth, layer2.clientHeight);	// 左上隅にpatch中心を一致させる	OK
		// patch.put(399, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 右下隅にpatch中心を一致させる	OK
		patch.put(-200, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 全くの範囲外	OK
	}

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
