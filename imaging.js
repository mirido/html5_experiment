// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

//
//  単一キャンバス操作
//

/// レイヤーを不透明にする。
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

/// レイヤー1枚を透明にする。
function erase_single_layer(canvas)
{
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//
//  マルチレイヤー操作
//

/// キャンバスを全消去する。
function erase_canvas(
  layers      // : canvas[]; [ref] レイヤー ([0]が最も奥と想定)
)
{
  for (let i = 0; i < layers.length; ++i) {
    let ctx = layers[i].getContext('2d');
    ctx.clearRect(0, 0, layers[i].width, layers[i].height);
  }
}

/// レイヤーをコピーする。
function copy_layer(src_canvas, dst_canvas)
{
  const width = src_canvas.width;
  const height = src_canvas.height;

  // 元画像(対象イメージ)データ取得
  let ctx1 = src_canvas.getContext('2d');
  let imgd1 = ctx1.getImageData(0, 0, width, height);
  assert(imgd1.width == width && imgd1.height == height);

  // バッファ(描画先イメージ)取得
  let ctx2 = dst_canvas.getContext('2d');

  // 出力先に描画
  ctx2.putImageData(imgd1, 0, 0);
}

/// src_canvasの不透明画素に対応する
/// dst_canvasの画素を透明化する。
/// (context.globalCompositeOperation = 'destination_out'と同じ。)
function get_destinaton_out_image(src_canvas, dst_canvas)
{
  const width = src_canvas.width;
  const height = src_canvas.height;

  // 元画像(対象イメージ)データ取得
  let ctx1 = src_canvas.getContext('2d');
  let imgd1 = ctx1.getImageData(0, 0, width, height);
  assert(imgd1.width == width && imgd1.height == height);

  // バッファ(描画先イメージ)取得
  let ctx2 = dst_canvas.getContext('2d');
  let imgd2 = ctx2.getImageData(0, 0, width, height);
  assert(imgd2.width == width && imgd2.height == height);

  // 描画
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      let A1 = imgd1.data[base + 3];
      if (A1 != 0) {
        imgd2.data[base + 0] = 0;
        imgd2.data[base + 1] = 0;
        imgd2.data[base + 2] = 0;
        imgd2.data[base + 3] = 0;
      }
    }
  }

  // 出力先に描画
  ctx2.putImageData(imgd2, 0, 0);
}

/// 指定色のみの画像(または指定色以外の画像)を作る。
/// src_canvasとdst_canvasは同一サイズが前提。
function get_mask_image(src_canvas, color, dst_canvas)
{
  const width = src_canvas.width;
  const height = src_canvas.height;
  // 下記を行うとdst_canvasの画像が消えてしまう。
  // dst_canvas.setAttribute('width', width);
  // dst_canvas.setAttribute('height', height);
  // assert(dst_canvas.width == width && dst_canvas.height == height);

  // 元画像データ取得
  let ctx1 = src_canvas.getContext('2d');
  let imgd1 = ctx1.getImageData(0, 0, width, height);
  assert(imgd1.width == width && imgd1.height == height);

  // バッファ取得
  let ctx2 = dst_canvas.getContext('2d');
  let imgd2 = ctx2.getImageData(0, 0, width, height);
  assert(imgd2.width == width && imgd2.height == height);

  // マスク画像作成
  let colors = get_components_from_RGBx(color);
  // console.dir(colors);
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      let R1 = imgd1.data[base + 0];
      let G1 = imgd1.data[base + 1];
      let B1 = imgd1.data[base + 2];
      let A1 = imgd1.data[base + 3];
      let bMatched = (A1 != 0 && (R1 == colors[0] && G1 == colors[1] && B1 == colors[2]));
      if (bMatched) {
        imgd2.data[base + 0] = R1;
        imgd2.data[base + 1] = G1;
        imgd2.data[base + 2] = B1;
        imgd2.data[base + 3] = A1;
      } else {
        imgd2.data[base + 0] = 0;
        imgd2.data[base + 1] = 0;
        imgd2.data[base + 2] = 0;
        imgd2.data[base + 3] = 0;
      }
    }
  }

  // 出力先に描画
  ctx2.putImageData(imgd2, 0, 0);
}

/// src_canvasの内容を、
/// マスク画像(または逆マスク画像)に従い
/// dst_canvasに定着させる。
/// src_canvas、マスク画像、dst_canvasは同一サイズが前提。
function fix_image_w_mask(src_canvas, mask_canvas, bInv, dst_canvas)
{
  const width = src_canvas.width;
  const height = src_canvas.height;

  // 元画像データ取得
  let ctx1 = src_canvas.getContext('2d');
  let imgd1 = ctx1.getImageData(0, 0, width, height);
  assert(imgd1.width == width && imgd1.height == height);

  // マスク画像データ取得
  let ctx_mask = mask_canvas.getContext('2d');
  let imgd_mask = ctx_mask.getImageData(0, 0, width, height);

  // 出力先バッファ取得
  let ctx2 = dst_canvas.getContext('2d');
  let imgd2 = ctx2.getImageData(0, 0, width, height);
  assert(imgd2.width == width && imgd2.height == height);

  // 定着
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      let A_mask = imgd_mask.data[base + 3];
      let bMatched = (A_mask != 0);   // (マスク画素)
      if (bInv) {
        bMatched = !bMatched;
      }
      if (bMatched) {
        let R1 = imgd1.data[base + 0];
        let G1 = imgd1.data[base + 1];
        let B1 = imgd1.data[base + 2];
        let A1 = imgd1.data[base + 3];
        imgd2.data[base + 0] = R1;
        imgd2.data[base + 1] = G1;
        imgd2.data[base + 2] = B1;
        imgd2.data[base + 3] = A1;
      }
    }
  }

  // 出力先に描画
  ctx2.putImageData(imgd2, 0, 0);
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
  let k = 0;
  for (let i = 0; i < n; ++i) {
    if (layers[i].hidden)
      continue;   // 不可視レイヤーをスキップ
    let ctx = layers[i].getContext('2d');
    let imgd = ctx.getImageData(0, 0, width, height);
    assert(imgd.width == width && imgd.height == height);
    imageDataList[k] = imgd;
    // console.log("imageDataList[" + k + "].data.length=" + imageDataList[i].data.length);
    ++k;
  }

  // 合成
  let dst_imgDat = layers[0].getContext('2d').createImageData(width, height);
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;

      // 最も奥のレイヤーに背景色を設定
      // ここでは完全不透明な白色とする。
      dst_imgDat.data[base + 0] = 255;
      dst_imgDat.data[base + 1] = 255;
      dst_imgDat.data[base + 2] = 255;
      dst_imgDat.data[base + 3] = 255;

      // 奥のレイヤーからα合成していく。
      for (let i = 0; i < k; ++i) {
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
