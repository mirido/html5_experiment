// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

//
//  単一キャンバス操作
//

/// キャンバスを不透明にする。
function make_opaque(canvas)
{
  const width = canvas.width;
  const height = canvas.height;

  // 画像データ取得
  let ctx = canvas.getContext('2d');
  let imgd = ctx.getImageData(0, 0, width, height);

  // 全画素のα値を255に変更
  // 透明度が0.5未満の画素は、透明な黒に変更する。
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      if (imgd.data[base + 3] < 128) {  // (透明度0.5未満)
        imgd.data[base + 0] = 0;
        imgd.data[base + 1] = 0;
        imgd.data[base + 2] = 0;
      }
      imgd.data[base + 3] = 255;    // α値を255に変更
    }
  }

  // 再描画
  ctx.putImageData(imgd, 0, 0);
}

//
//  マルチレイヤー操作
//

/// キャンバスを全消去する。
/// 最下層キャンバスのみ白色、それ以外は透明になる。
function erase_canvas(
  layers      // : canvas[]; [ref] レイヤー ([0]が最も奥と想定)
)
{
  for (let i = 0; i < layers.length; ++i) {
    let ctx = layers[i].getContext('2d');
    ctx.fillStyle
      = (i == 0)
      ? "rgba(255, 255, 255, 255)"
      : "rgba(0, 0, 0, 0)";
    assert(layers[i].width == layers[0].width);
    assert(layers[i].height == layers[0].height);
    ctx.fillRect(0, 0, layers[i].width, layers[i].height);
  }
}

/// レイヤーの合成画像を取得する。
function get_joint_image(
  layers,       // : canvas[];  [in]  レイヤー([0]が最も奥と想定)
  dst_canvas    // : canvas;    [out] canvas: 合成画像出力先キャンバス
)
{
  const n = layers.length;

  // 描画先準備
  const width = layers[0].width;
  const height = layers[0].height;
  dst_canvas.setAttribute('width', width);
  dst_canvas.setAttribute('height', height);
  assert(dst_canvas.width == width && dst_canvas.height == height);

  // 合成対象データ取得
  let imageDataList = [];
  for (let i = 0; i < n; ++i) {
    let ctx = layers[i].getContext('2d');
    let imgd = ctx.getImageData(0, 0, width, height);
    assert(imgd.width == width && imgd.height == height);
    imageDataList[i] = imgd;
    console.log("imageDataList[" + i + "].data.length=" + imageDataList[i].data.length);
  }

  // 合成
  let dst_imgDat = imageDataList[0];	// Alias (参照コピーだが問題無い。)
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      for (let i = 1; i < n; ++i) {		// 奥のレイヤーからα合成していく。
        // レイヤー[0..i-1]の合成結果(確定済)
        let R1 = dst_imgDat.data[base + 0];
        let G1 = dst_imgDat.data[base + 1];
        let B1 = dst_imgDat.data[base + 2];
        assert(dst_imgDat.data[base + 3] == 255);

        // レイヤー[i]の画素値
        let R2 = imageDataList[i].data[base + 0];
        let G2 = imageDataList[i].data[base + 1];
        let B2 = imageDataList[i].data[base + 2];
        let A2 = imageDataList[i].data[base + 3];
        assert(0 <= A2 && A2 <= 255);
        // {	// UTEST	画素値確認
        // 	let A1 = dst_imgDat.data[base + 3];
        // 	if (px == 150 && py == 150) {
        // 		console.log("R1=" + R1);
        // 		console.log("G1=" + G1);
        // 		console.log("B1=" + B1);
        // 		console.log("A1=" + A1);
        // 		console.log("R2=" + R2);
        // 		console.log("G2=" + G2);
        // 		console.log("B2=" + B2);
        // 		console.log("A2=" + A2);
        // 	}
        // }

        // 合成
        let a = 255 - A2;
        let b = A2;
        dst_imgDat.data[base + 0] = Math.floor(((R1 * a) + (R2 * b)) / 255.0);
        dst_imgDat.data[base + 1] = Math.floor(((G1 * a) + (G2 * b)) / 255.0);
        dst_imgDat.data[base + 2] = Math.floor(((B1 * a) + (B2 * b)) / 255.0);
        dst_imgDat.data[base + 3] = 255;
      }
    }
  }

  // キャンバスに描画
  let dst_ctx = dst_canvas.getContext('2d');
  dst_ctx.putImageData(dst_imgDat, 0, 0);
}
