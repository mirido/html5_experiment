'use strict';

console.log("index.js starts.")

// イベントハンドラ登録
window.onload = init;

/// ページのロード完了時に呼ばれる。
function init() {
	console.log("init() called.")

  let layers = [
    document.getElementById("canvas_0"),
    document.getElementById("canvas_1")
  ];

	let m_tool_palette = document.getElementById("tool_pallete");

	let m_joint_canvas = document.getElementById("joint_canvas");

	// キャンバスを白色でfill
	{
		let ctx = layers[1].getContext('2d');
		ctx.fillStyle = "rgba(255, 255, 255, 255)";
		ctx.fillRect(0, 0, layers[1].width, layers[1].height);
	}

	// ツールパレットを白色でfill
	{
		let ctx = m_tool_palette.getContext('2d');
		ctx.fillStyle = "rgba(232, 239, 255, 255)";
		ctx.fillRect(0, 0, m_tool_palette.width, m_tool_palette.height);
	}

	// 図形描画
  sample01(layers);

	// 画像合成
	{
		const n = layers.length;

		// 描画先準備
		const width = layers[0].width;
		const height = layers[0].height;
		m_joint_canvas.setAttribute('width', width);
		m_joint_canvas.setAttribute('height', height);
		assert(m_joint_canvas.width == width && m_joint_canvas.height == height);
		let dst_imgDat;
		{
			let btm_ctx = layers[n - 1].getContext('2d');		// 最も下のレイヤーのデータを取得
			dst_imgDat = btm_ctx.getImageData(0, 0, width, height);
		}
		console.log("dst_imgDat.data.length=" + dst_imgDat.data.length);

		// 合成対象データ取得
		let imageDataList = [];
		for (let i = 0; i < n - 1; ++i) {
			let ctx = layers[i].getContext('2d');
			let imgd = ctx.getImageData(0, 0, width, height);
			assert(imgd.width == width && imgd.height == height);
			imageDataList[i] = imgd;
			console.log("imageDataList[" + i + "].data.length=" + imageDataList[i].data.length);
		}

		// 合成
		let pow_total = 255 * n;
		for (let py = 0; py < height; ++py) {
			let head = py * 4 * width;
			for (let px = 0; px < width; ++px) {
				let base = head + px * 4;
				for (let i = n - 2; i >= 0; --i) {	// 奥のレイヤーからα合成していく。
					let R1 = dst_imgDat.data[base + 0];
					let G1 = dst_imgDat.data[base + 1];
					let B1 = dst_imgDat.data[base + 2];
					let A1 = dst_imgDat.data[base + 3];
					let R2 = imageDataList[i].data[base + 0];
					let G2 = imageDataList[i].data[base + 1];
					let B2 = imageDataList[i].data[base + 2];
					let A2 = imageDataList[i].data[base + 3];
					dst_imgDat.data[base + 0] += Math.floor(((R1 * A1) + (R2 * A2)) / 510.0);
					dst_imgDat.data[base + 1] += Math.floor(((G1 * A1) + (G2 * A2)) / 510.0);
					dst_imgDat.data[base + 2] += Math.floor(((B1 * A1) + (B2 * A2)) / 510.0);
					dst_imgDat.data[base + 3] += 255;
				}
			}
		}
		// for (let py = 0; py < height; ++py) {
		// 	let head = py * 4 * width;
		// 	for (let px = 0; px < width; ++px) {
		// 		let base = head + px * 4;
		// 		dst_imgDat.data[base + 0] = 255;
		// 		dst_imgDat.data[base + 1] = 255;
		// 		dst_imgDat.data[base + 2] = 255;
		// 		dst_imgDat.data[base + 3] = 255;
		// 	}
		// }

		// キャンバスに描画
		let dst_ctx = m_joint_canvas.getContext('2d');
		dst_ctx.putImageData(dst_imgDat, 0, 0);
	}
}

//
//  マルチレイヤーサンプル
//

function sample01(layers)
{
//  if ( ! layers || ! canvas.getContext ) { return false; }
  var ctx = layers[0].getContext('2d');
  /* 半透明度を指定 */
  ctx.globalAlpha = 0.7;
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
//  画像をクリックして動かすサンプル
//

var n=0; //変数nの初期値0
var m=50; //変数mの初期値50
function startMove() {
	n=n+m;
	var moveNode=document.getElementById("moveImg"); //変数moveNodeに、id="moveImg"のノードを代入
	moveNode.style.left=n+"px"; //moveNodeのスタイルを変更→left:[n]px;
	if (n>300) { //nが300を超えたら
		n=0-m; //nを最初の場所に戻す
	}
}

var i=1; //変数iの初期値1
function fadeOut() {
	var fadeImg=document.getElementById("btnMove"); //変数fadeImgに、id="btnMove"のノードを代入
	i -= 0.1; //i=i-0.1
	fadeImg.style.opacity=i; //fadeImgのスタイルを変更→透明度の変更
	fadeImg.style.filter="alpha(opacity="+(i*100)+")"; //IE対策
	if (i<0) {
		i=0;
	}
}
function fadeIn() {
	var fadeImg=document.getElementById("btnMove"); //変数fadeImgに、id="btnMove"のノードを代入
	i += 0.1; //i=i+0.1
	fadeImg.style.opacity=i; //fadeImgのスタイルを変更→透明度の変更
	fadeImg.style.filter="alpha(opacity="+(i*100)+")"; //IE対策
	if (i>1) {
		i=1;
	}

}
