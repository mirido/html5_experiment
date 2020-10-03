'use strict';

/// UTEST: プリレンダリング実験。
export function utest_pre_rendering()
{
  let diameter = 19;
  let ha = 32;
  let px = this.m_lastPoint.x - ha;
  let py = this.m_lastPoint.y - ha;

  let mini_canvas = pre_render_pixel(ha, diameter, 'rgb(255, 0, 0)', true);
  // make_opaque(mini_canvas, 255);
  let ctx = this.m_lastSender.getLayer().getContext('2d');
  ctx.globalAlpha = 1.0;
  ctx.drawImage(mini_canvas, px, py);

  mini_canvas = pre_render_pixel(ha, diameter, 'rgb(0, 255, 0)', false);
  // make_opaque(mini_canvas, 255);
  ctx.drawImage(mini_canvas, px, py)
}

/// UTEST: ImagePatchのテスト。
export function utest_ImagePatch()
{
  let layer1 = g_pictureCanvas.getLayer(0);
  let layer2 = g_pictureCanvas.getLayer(1);

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
  draw_rect_R(r, ctx2);
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
  patch.put(399, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 右下隅にpatch中心を一致させる	OK
  // patch.put(-200, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 全くの範囲外	OK
}

/// UTEST: 色表現の変換
export function utesst_ColorConversion()
{
  let colors1 = get_components_from_RGBx("#123456");
	console.dir(colors1);
	let colors2 = get_components_from_RGBx("rgb(1,2,3)");
	console.dir(colors2);
	let colors3 = get_components_from_RGBx("rgba(4,5,6,7)");
	console.dir(colors3);
  let colors4 = get_components_from_RGBx("#a55abb");
	console.dir(colors4);
  let colors5 = get_components_from_RGBx("#CCDDEEFF");
	console.dir(colors5);
}

/// UTEST: Canvas 2D Contextの実験
export function utest_canvas_2d_context(canvas)
{
  {
    let ctx1 = canvas.getContext('2d');
    ctx1.fillStyle = 'rgb(255,0,0)';
    ctx1.fillRect(0, 0, 100, 100);    // 赤色の矩形を描画
    let imgd1 = ctx1.getImageData(0, 0, canvas.width, canvas.height);
    ctx1.putImageData(imgd1, 1, 1);
  }
  erase_single_layer(canvas);
  {
    // 同一イベント処理内でのコンテキストの取得し直し実験
    let ctx2 = canvas.getContext('2d');
    ctx2.fillStyle = 'rgb(0,255,0)';
    ctx2.fillRect(100, 100, 100, 100);  // 緑色の矩形を描画
  }
}

/// UTEST: マスク機能のための基礎関数のテスト。
export function utest_get_mask_image()
{
  console.log("utestmask_image() called.");
  let view_port = document.getElementById("viewport");
	let layers = [
		document.getElementById("canvas_0"),
		document.getElementById("canvas_1"),
		// document.getElementById("canvas_2")
	];
	let surface = document.getElementById("surface");
	let joint_canvas = document.getElementById("joint_canvas");

  let tg_layer = layers[1];

  {
    // tg_layerに描画 -- 黒色円弧の右下が青色矩形で一部欠ける。
    let ctx_tg = tg_layer.getContext('2d');
    ctx_tg.fillStyle = 'rgb(0,0,255)';
    ctx_tg.fillRect(250, 250, 100, 100);
  }

  // マスク取得 -- 黒色円弧の右下が欠けたものがマスクになる。
  get_mask_image(tg_layer, 'rgb(0,0,0)', surface);

  // tg_layerにさらに描画(黒色以外)
  // このとき、surfaceにマスク描画されているので、黒色線は一切欠けない。
  {
    let ctx_tg = tg_layer.getContext('2d');
    ctx_tg.fillStyle = 'rgb(0,255,255)';
    ctx_tg.fillRect(100, 100, 200, 200);
  }

  // マスク定着
  if (true) {
    fix_image_w_mask(surface, surface, false, tg_layer);
  } else {
    let ctx_mask = surface.getContext('2d');
    let imgd = ctx_mask.getImageData(0, 0, surface.width, surface.height);
    let ctx_tg = tg_layer.getContext('2d');
    ctx_tg.putImageData(imgd, 0, 0);
  }

  // surface消去 -- これを行ってももはや画像は変わらない。
  erase_single_layer(surface);

  if (false) {
    let ctx_tg = tg_layer.getContext('2d');
    ctx_tg.fillStyle = 'rgb(255,0,0)';
    ctx_tg.fillRect(10, 10, 300, 350);
    let imgd = ctx_tg.getImageData(0, 0, 200, 200);
    ctx_tg.putImageData(imgd, 100, 100);
  }
}

/// UTEST: ハーフトーン描画のテスト。
export function utest_half_tone()
{
  let canvas = document.getElementById("canvas_0");
  let width = canvas.width;
  let height = canvas.height;
  let context = canvas.getContext('2d');

  erase_single_layer(canvas);

  // パターン生成
  let ha = half_tone_std_ha;
  let ptnList = gen_halftones(ha);
  console.log(ptnList);

  // 描画色指定
  let RGB_cc = get_components_from_RGBx('rgb(255,0,0)');

  let fa = 2 * ha + 1;
  let cyc = fa - 1;
  // let sz = 2 * cyc;
  let sz = 11;
  let ncolumns = 32;

  let ptn_x = 0;
  let ptn_y = 0;
  let py_end = 0;
  let z_fAlpha = -1;
  for (let k = 0; k < ptnList.length; ++k) {
    let ent = ptnList[k];
    let fAlpha = ent.m_fAlpha;
    let definition = ent.m_definition;
    let ptn = ent.m_ptn;
    console.log("k=" + k + ", fAlpha=" + fAlpha + ", definition=" + definition);

    // 描画先決定
    if (ptn_x + (sz + 1) <= Math.min(ncolumns * (sz + 1), width)) {
      py_end = Math.max(py_end, ptn_y + (sz + 1));
    } else {
      ptn_x = 0;
      ptn_y = py_end;
    }
    if (ptn_y >= height)
      break;

    // 描画
    let imgd = context.createImageData(sz, sz);
    for (let py = 0; py < sz; ++py) {
      let head = (4 * sz) * py;
      let src_head = cyc * (py % cyc);
      for (let px = 0; px < sz; ++px) {
        let base = head + 4 * px;
        let bDot = ptn[src_head + (px % cyc)];
        if (bDot) {
          imgd.data[base + 0] = RGB_cc[0];
          imgd.data[base + 1] = RGB_cc[1];
          imgd.data[base + 2] = RGB_cc[2];
          imgd.data[base + 3] = 255;
        }
      }
    }
    context.putImageData(imgd, ptn_x + 1, ptn_y + 1);
    context.fillStyle = 'rgb(128,128,128)';
    if (fAlpha != z_fAlpha) {
      draw_rect(ptn_x, ptn_y, ptn_x + sz + 1, ptn_y + sz + 1, context);
      z_fAlpha = fAlpha;
    }

    // 次へ
    ptn_x += (sz + 1);
  }
}
