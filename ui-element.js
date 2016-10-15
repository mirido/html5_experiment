'use strict';

//
//  ImagePatch
//

/// 画像のパッチを表す。
function ImagePatch(src_ctx, src_width, src_height, points, margin)
{
  this.m_imageData = null;
  this.m_bounds = null;
  this.m_ofs = null;

  if (points.length <= 0) {
    return;
  }

  // 点列pointsを包含する矩形を取得
  this.m_bounds = get_outbounds(points, margin);

  // 中心点を記憶
  let center = new JsPoint(
    Math.floor(this.m_bounds.x + this.m_bounds.src_width / 2),
    Math.floor(this.m_bounds.y + this.m_bounds.src_height / 2)
  );

  // 領域のクリッピング
  clip_rect(src_width, src_height, this.m_bounds);

  // 中心までのオフセットを記憶
  let r = this.m_bounds;    // Alias
  this.center = new JsPoint(center.x - r.x, center.y - r.y);

  // 画像データを記憶
  this.m_imageData = src_ctx.getImageData(r.x, r.y, r.width, r.height);
}

/// 画像を復元する。
/// dst_ctxは、構築時にsrc_width、src_heightで与えた大きさ以上の
/// キャンバスのコンテキストと想定。
ImagePatch.prototype.restore = function(dst_ctx)
{
  let r = this.m_bounds;    // Alias
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
  let ofs_x = sx - this.m_bounds.x;
  let ofs_y = sy - this.m_bounds.y;

  // 画像全体の矩形
  let mod_img_bounds = new JsRect(0, 0, dst_width, dst_height);

  // 移動後image patch基準の座標に変換
  mod_img_bounds.x -= ofs_x;
  mod_img_bounds.y -= ofs_y;

  // Dirty rect確定
  let dirty = get_common_rect(this.m_bounds, mod_img_bounds);
  dirty.x -= this.m_bounds.x;
  dirty.y -= this.m_bounds.y;
  // console.dir(this.m_bounds);
  // console.dir(mod_img_bounds);
  // console.dir(dirty);
  // console.log("sx=" + sx + ", sy=" + sy);

  // 描画
  dst_ctx.putImageData(
    this.m_imageData,
    sx, sy,
    dirty.x, dirty.y, dirty.width, dirty.height
  );
}
