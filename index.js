'use strict';

window.onload=init; //ページの読み込みが完了したとき、initを実行する
function init() {
	document.getElementById("btnMove").onclick=startMove;

  var layers = [
    document.getElementById("canvas_0"),
    document.getElementById("canvas_1")
  ];

  sample01(layers);
//  var ctx = layers[1].getContext('2d');
//  ctx.fillStyle = "#552233";
//  ctx.fillRect(0, 0, layers[1].width, layers[1].height);
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
