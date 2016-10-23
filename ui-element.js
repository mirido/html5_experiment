// Copyright (c) 2016, mirido
// All rights reserved.

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

  // 中心点を記憶
  this.m_center = new JsPoint(
    Math.floor(this.m_bounds.x + this.m_bounds.width / 2),
    Math.floor(this.m_bounds.y + this.m_bounds.height / 2)
  );

  // 領域のクリッピング
  this.m_abs_dirty = clip_rect(this.m_bounds, src_width, src_height);

  // 画像データを記憶
  let r = this.m_abs_dirty;    // Alias
  if (r.width > 0 && r.height > 0) {    // ChromeではこうしないとNG。
    this.m_imageData = src_ctx.getImageData(r.x, r.y, r.width, r.height);
  } else {
    this.m_imageData = null;
  }
}

/// 画像を復元する。
/// dst_ctxは、構築時にsrc_width、src_heightで与えた大きさ以上の
/// キャンバスのコンテキストと想定。
ImagePatch.prototype.restore = function(dst_ctx)
{
  if (this.m_imageData == null)
    return;

  let r = this.m_abs_dirty;   // Alias
  dst_ctx.putImageData(this.m_imageData, r.x, r.y);
}

/// 画像を配置する。
/// dst_ctxと構築時に与えたsrc_ctxの関係は任意。
ImagePatch.prototype.put = function(cx, cy, dst_ctx, dst_width, dst_height)
{
  if (this.m_imageData == null)
    return;

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

  // 描画
  dst_ctx.putImageData(
    this.m_imageData,
    sx, sy,
    dirty.x, dirty.y, dirty.width, dirty.height
  );
}

//
//  DrawerBase
//

/// 新しいインスタンスを初期化する。
function DrawerBase(drawOp, effect, cursor)
{
  // 関連オブジェクト
  this.m_drawOp = drawOp;
  this.m_effect = effect;
  this.m_cursor = cursor;

  // 描画管理
  this.m_points = [];
  this.m_imagePatch = null;
  this.m_bWrtProtect = false;
}

/// 描画ストローク開始時に呼ばれる。
DrawerBase.prototype.OnDrawStart = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.clientWidth;
  let h = curLayer.clientHeight;
  let context = curLayer.getContext('2d');
  let cur_pt = e.m_point;
  let margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

  // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
  if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
    this.m_bWrtProtect = true;
    return;
  }

  // 点列記憶
  this.m_points.splice(0, this.m_points.length);   // 全クリア
  this.m_points.push(cur_pt);

  // 描画内容確定 or ガイド表示
  let bFixed = this.m_drawOp.testOnDrawStart(e, this.m_points, context);
  if (bFixed) {
    this.m_effect.apply(this.m_points, context);
    this.m_points.splice(0, this.m_points.length - 1);  // 末尾以外を削除
  } else {
    this.m_imagePatch = new ImagePatch(context, w, h, this.m_points, margin);
    this.m_drawOp.guideOnDrawStart(e, this.m_points, context);
  }

  // カーソル描画
  let ctx_surface = e.m_sender.getSurface().getContext('2d');
  this.m_cursor.put(e, cur_pt, ctx_surface);
}

/// 描画ストローク中に随時呼ばれる。
DrawerBase.prototype.OnDrawing = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.clientWidth;
  let h = curLayer.clientHeight;
  let context = curLayer.getContext('2d');
  let cur_pt = e.m_point;
  let margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

  // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
  if (this.m_bWrtProtect) {
    return;
  }

  // カーソルクリア
  let ctx_surface = e.m_sender.getSurface().getContext('2d');
  this.m_cursor.clear(ctx_surface);

  // 領域復元
  if (this.m_imagePatch != null) {
    this.m_imagePatch.restore(context);
    this.m_imagePatch = null;
  }

  // 点列記憶
  this.m_points.push(cur_pt);

  // 描画内容確定 or ガイド表示
  let bFixed = this.m_drawOp.testOnDrawing(e, this.m_points, context);
  if (bFixed) {
    this.m_effect.apply(this.m_points, context);
    this.m_points.splice(0, this.m_points.length - 1);  // 末尾以外を削除
  } else {
    this.m_imagePatch = new ImagePatch(context, w, h, this.m_points, margin);
    this.m_drawOp.guideOnDrawing(e, this.m_points, context);
  }

  // カーソル描画
  this.m_cursor.put(e, cur_pt, ctx_surface);
}

/// 描画ストローク終了時に呼ばれる。
DrawerBase.prototype.OnDrawEnd = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.clientWidth;
  let h = curLayer.clientHeight;
  let context = curLayer.getContext('2d');
  let cur_pt = e.m_point;
  let margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

  // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
  if (this.m_bWrtProtect) {
    this.m_bWrtProtect = false;
    return;
  }

  // カーソルクリア
  let ctx_surface = e.m_sender.getSurface().getContext('2d');
  this.m_cursor.clear(ctx_surface);

  // 領域復元
  if (this.m_imagePatch != null) {
    this.m_imagePatch.restore(context);
    this.m_imagePatch = null;
  }

  // 点列記憶
  this.m_points.push(cur_pt);

  // 描画内容確定判断
  let bFixed = this.m_drawOp.testOnDrawEnd(e, this.m_points, context);
  if (bFixed) {
    this.m_effect.apply(this.m_points, context);
  }
}

//
//  描画オペレーター0: NullDrawOp
//

/// 新しいインスタンスを初期化する。
function NullDrawOp() { }

/// 描画ストローク開始時の画素固定判断を行う。
NullDrawOp.prototype.testOnDrawStart = function(e, points, context) { return false; }

/// 描画ストローク中の画素固定判断を行う。
NullDrawOp.prototype.testOnDrawing = function(e, points, context) { return false; }

/// 描画ストローク終了時の画素固定判断を行う。
NullDrawOp.prototype.testOnDrawEnd = function(e, points, context) { return false; }

/// 描画ストローク開始時ガイド表示処理。
NullDrawOp.prototype.guideOnDrawStart = function(e, points, context) { }

/// 描画ストローク中ガイド表示処理。
NullDrawOp.prototype.guideOnDrawing = function(e, points, context) { }

/// 描画ストローク終了時ガイド表示処理。
NullDrawOp.prototype.guideOnDrawEnd = function(e, points, context) { }

/// マージンを取得する。
NullDrawOp.prototype.getMargin = function() { return 0; }

/// パラメータ設定のためのplace holder。引数は派生クラス固有。
NullDrawOp.prototype.setParam = function() { }

//
//  エフェクト0: NullEffect
//

/// 新しいインスタンスを取得する。
function NullEffect() { }

/// エフェクトを適用する。
NullEffect.prototype.apply = function(points, context) { }

/// マージンを取得する。
NullEffect.prototype.getMargin = function() { return 0; }

/// パラメータ設定のためのplace holder。引数は派生クラス固有。
NullEffect.prototype.setParam = function() { }

//
//  カーソル0: NullCursor
//

/// 新しいインスタンスを取得する。
function NullCursor() { }

/// カーソルを描画する。
NullCursor.prototype.put = function(e, cur_pt, context) { }

/// カーソルをクリアする。
NullCursor.prototype.clear = function(context) { }

/// パラメータ設定のためのplace holder。引数は派生クラス固有。
NullCursor.prototype.setParam = function() { }

//
//  描画オペレーター1: 手書き
//

/// 新しいインスタンスを初期化する。
function DrawOp_FreeHand()
{
  this.m_bLineMode = false;
}

/// 描画ストローク開始時の画素固定判断を行う。
DrawOp_FreeHand.prototype.testOnDrawStart = function(e, points, context)
{
  return this.testOnDrawing(e, points, context);
}

/// 描画ストローク中の画素固定判断を行う。
DrawOp_FreeHand.prototype.testOnDrawing = function(e, points, context)
{
  // console.log("testOnDrawing: e.m_spKey=" + e.m_spKey);

  if (this.m_bLineMode) {   // (直線ガイドモード)
    if (points.length > 2) {
      points.splice(1, points.length - 2);  // 先頭と末尾以外を削除
    }
    if ((e.m_spKey & SpKey.KY_SHIFT) != 0) {  // (SHIFTキー押下)
      // 引き続き直線ガイドモード
      return false;
    } else {
      // 手書きモードに遷移
      this.m_bLineMode = false;
      return true;    // 直線ガイド内容でエフェクトをかける。
    }
  } else {    // (手書きモード)
    if ((e.m_spKey & SpKey.KY_SHIFT) != 0) {  // (SHIFTキー押下)
      // 直線ガイドモードに遷移
      this.m_bLineMode = true;
      return false;
    } else {
      // 手書きの標準動作: 即effect。
      return true;
    }
  }
  assert(false);
}

/// 描画ストローク終了時の画素固定判断を行う。
DrawOp_FreeHand.prototype.testOnDrawEnd = function(e, points, context)
{
  return true;
}

/// 描画ストローク開始時ガイド表示処理。
DrawOp_FreeHand.prototype.guideOnDrawStart = function(e, points, context)
{
  return this.testOnDrawing(e, points, context);
}

/// 描画ストローク中ガイド表示処理。
DrawOp_FreeHand.prototype.guideOnDrawing = function(e, points, context)
{
  // console.log("guideOnDrawing() called.");
  if (points.length >= 2) {
    let pt1 = points[0];
    let pt2 = points[points.length - 1];
    context.globalCompositeOperation = 'xor';
    context.fillStyle = 'rgb(0,0,0)';
    draw_line_1px(pt1.x, pt1.y, pt2.x, pt2.y, context);
    context.globalCompositeOperation = 'source-over';
    // console.log(
    //   "draw_line_1px called. (" + pt1.x + ", " + pt1.y + ")-(" + pt2.x + ", " + pt2.y + ")"
    // );
  }
}

/// 描画ストローク終了時ガイド表示処理。
// DrawOp_FreeHand.prototype.guideOnDrawEnd = function(e, points, context)

/// マージンを取得する。
DrawOp_FreeHand.prototype.getMargin = function() { return 0; }

//
//  エフェクト1: 鉛筆
//

/// 新しいインスタンスを取得する。
function Effect_Pencil(diameter, color)
{
  if (diameter == null) { diameter = 1; }
  if (color == null) { color = 'rgb(0,0,0)'; }
  this.setParam(diameter, color);
}

/// パラメータを設定する。(クラス固有)
Effect_Pencil.prototype.setParam = function(diameter, color)
{
  const margin = Math.ceil(diameter / 2);

  this.m_pre_rendered = null;
  this.m_color = color;
  this.m_ha = 0;

  if (diameter > 1) {
    this.m_ha = Math.ceil(diameter / 2 + margin);
    this.m_pre_rendered = pre_render_pixel(this.m_ha, diameter, color, true);
  }
}

/// エフェクトを適用する。
Effect_Pencil.prototype.apply = function(points, context)
{
  if (points.length == 1) {
    let pt = points[0];
    if (this.m_pre_rendered) {
      put_point(pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
    } else {
      context.fillStyle = this.m_color;
      put_point_1px(pt.x, pt.y, context);
    }
  } else {
    assert(points.length > 0);
    let prev = points[0];
    for (let i = 1; i < points.length; ++i) {
      let pt = points[i];
      if (this.m_pre_rendered) {
        draw_line(prev.x, prev.y, pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
      } else {
        context.fillStyle = this.m_color;
        draw_line_1px(prev.x, prev.y, pt.x, pt.y, context);
      }
      prev = pt;
    }
  }
}

/// マージンを取得する。
Effect_Pencil.prototype.getMargin = function() { return this.m_ha; }

//
//  カーソル1: 円形カーソル
//

/// 新しいインスタンスを取得する。
function Cursor_Circle(diameter)
{
  if (diameter == null) { diameter = 1; }
  this.setParam(diameter, 'rgb(0,0,0)');
}

/// パラメータを設定する。(クラス固有)
Cursor_Circle.prototype.setParam = function(diameter, color)
{
  const margin = Math.ceil(diameter / 2);
  let colors = get_components_from_RGBx(color);
  colors[0] ^= 0xff;
  colors[1] ^= 0xff;
  colors[2] ^= 0xff;
  color = get_color_as_RGB(colors);

  this.m_pre_rendered = null;
  this.m_ha = 0;
  this.m_prev_pt = null;

  if (diameter > 1) {
    this.m_ha = Math.ceil(diameter / 2 + margin);
    this.m_pre_rendered = pre_render_pixel(this.m_ha, diameter, color, false);
  }

  this.m_imagePatch = null;
}

/// カーソルを描画する。
Cursor_Circle.prototype.put = function(e, cur_pt, context)
{
  let layer = e.m_sender.getCurLayer();
  let w = layer.clientWidth;
  let h = layer.clientHeight;

  context.globalCompositeOperation = 'xor';
  this.m_imagePatch = new ImagePatch(context, w, h, [ cur_pt ], this.m_ha);
  if (this.m_pre_rendered) {
    put_point(cur_pt.x, cur_pt.y, this.m_ha, this.m_pre_rendered, context);
  } else {
    put_point_1px(cur_pt.x, cur_pt.y, context);
  }
  context.globalCompositeOperation = 'source-over';
  this.m_prev_pt = cur_pt;
}

/// カーソルをクリアする。
Cursor_Circle.prototype.clear = function(context)
{
  if (this.m_imagePatch) {
    this.m_imagePatch.restore(context);
  }
  this.m_imagePatch = null;
}
