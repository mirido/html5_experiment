'use strict';

/// UTEST: ImagePatchのテスト。
function utest_ImagePatch()
{
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
  patch.put(399, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 右下隅にpatch中心を一致させる	OK
  // patch.put(-200, 399, ctx2, layer2.clientWidth, layer2.clientHeight);	// 全くの範囲外	OK
}
