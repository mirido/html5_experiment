'use strict';

//
//  ImagePatch
//

/// 画像のパッチを表す。
function ImagePatch(src_ctx, src_width, src_height, points, margin)
{
  this.m_imageData = null;
  this.m_bounds = null;
  this.m_abs_dirty = null;
  this.m_center = null;

  if (points.length <= 0) {
    return;
  }

  // 点列pointsを包含する矩形を取得
  this.m_bounds = get_outbounds(points, margin);
  console.dir(points);
  console.log("margin=" + margin);
  console.dir(this.m_bounds);

  // 中心点を記憶
  this.m_center = new JsPoint(
    Math.floor(this.m_bounds.x + this.m_bounds.width / 2),
    Math.floor(this.m_bounds.y + this.m_bounds.height / 2)
  );
  console.dir(this.m_center);

  // 領域のクリッピング
  this.m_abs_dirty = clip_rect(this.m_bounds, src_width, src_height);

  // 画像データを記憶
  let r = this.m_abs_dirty;    // Alias
  this.m_imageData = src_ctx.getImageData(r.x, r.y, r.width, r.height);
}

/// 画像を復元する。
/// dst_ctxは、構築時にsrc_width、src_heightで与えた大きさ以上の
/// キャンバスのコンテキストと想定。
ImagePatch.prototype.restore = function(dst_ctx)
{
  let r = this.m_abs_dirty;   // Alias
  dst_ctx.putImageData(this.m_imageData, r.x, r.y);
}

/// 画像を配置する。
/// dst_ctxと構築時に与えたsrc_ctxの関係は任意。
ImagePatch.prototype.put = function(cx, cy, dst_ctx, dst_width, dst_height)
{
  // Image patchをputすべき(sx, sy)
  let sx = Math.ceil(cx - this.m_bounds.width / 2);
  let sy = Math.ceil(cy - this.m_bounds.height / 2);

  // Image patchを移動させるべき量
  let ofs_x = Math.floor(cx - this.m_center.x);
  let ofs_y = Math.floor(cy - this.m_center.y);

  // 画像全体の矩形
  let mod_img_bounds = new JsRect(0, 0, dst_width, dst_height);

  // 移動後image patch基準の座標に変換
  mod_img_bounds.x -= ofs_x;
  mod_img_bounds.y -= ofs_y;

  // Dirty rect確定
  let dirty = get_common_rect(this.m_abs_dirty, mod_img_bounds);
  dirty.x -= this.m_abs_dirty.x;
  dirty.y -= this.m_abs_dirty.y;
  console.dir(this.m_bounds);
  console.dir(mod_img_bounds);
  console.dir(dirty);
  console.log("sx=" + sx + ", sy=" + sy);

  // 描画
  dst_ctx.putImageData(
    this.m_imageData,
    sx, sy,
    dirty.x, dirty.y, dirty.width, dirty.height
  );
}
