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
  this.m_altImagePatch = null;
  this.m_bWrtProtect = false;
}

/// 描画ストローク開始時に呼ばれる。
DrawerBase.prototype.OnDrawStart = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
  let context = curLayer.getContext('2d');
  let alt_ctx = (this.m_drawOp.getAltContext != null)
    ? this.m_drawOp.getAltContext(e)
    : null;
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
    // レイヤー上の画素確定
    this.m_effect.apply(this.m_points, context);
    e.m_sender.appendPoints(this.m_effect, this.m_points);   // 点列追記(Undo/Redo)
    this.m_points.splice(0, this.m_points.length - 1);  // 末尾以外を削除
  } else {
    // ガイド表示
    this.m_imagePatch = new ImagePatch(context, w, h, this.m_points, margin);
    if (alt_ctx != null) {
      this.m_altImagePatch = new ImagePatch(alt_ctx, w, h, this.m_points, margin);
    }
    this.m_drawOp.guideOnDrawStart(e, this.m_points, context);
  }

  // カーソル描画
  let ctx_cursor = e.m_sender.getOverlay().getContext('2d');
  this.m_cursor.put(e, cur_pt, ctx_cursor);
}

/// 描画ストローク中に随時呼ばれる。
DrawerBase.prototype.OnDrawing = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
  let context = curLayer.getContext('2d');
  let alt_ctx = (this.m_drawOp.getAltContext != null)
    ? this.m_drawOp.getAltContext(e)
    : null;
  let cur_pt = e.m_point;
  let margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

  // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
  if (this.m_bWrtProtect) {
    return;
  }

  // カーソルクリア
  let ctx_cursor = e.m_sender.getOverlay().getContext('2d');
  this.m_cursor.clear(ctx_cursor);

  // 領域復元
  if (this.m_imagePatch != null) {
    this.m_imagePatch.restore(context);
    this.m_imagePatch = null;
  }
  if (this.m_altImagePatch != null) {
    this.m_altImagePatch.restore(alt_ctx);
    this.m_altImagePatch = null;
  }

  // 点列記憶
  this.m_points.push(cur_pt);

  // 描画内容確定 or ガイド表示
  let bFixed = this.m_drawOp.testOnDrawing(e, this.m_points, context);
  if (bFixed) {
  	// レイヤー上の画素確定
    this.m_effect.apply(this.m_points, context);
    e.m_sender.appendPoints(this.m_effect, this.m_points);   // 点列追記(Undo/Redo)
    this.m_points.splice(0, this.m_points.length - 1);  // 末尾以外を削除
  } else {
  	// ガイド表示
    this.m_imagePatch = new ImagePatch(context, w, h, this.m_points, margin);
    if (alt_ctx != null) {
      this.m_altImagePatch = new ImagePatch(alt_ctx, w, h, this.m_points, margin);
    }
    this.m_drawOp.guideOnDrawing(e, this.m_points, context);
  }

  // カーソル描画
  this.m_cursor.put(e, cur_pt, ctx_cursor);
}

/// 描画ストローク終了時に呼ばれる。
DrawerBase.prototype.OnDrawEnd = function(e)
{
  let curLayer = e.m_sender.getCurLayer();
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
  let context = curLayer.getContext('2d');
  let alt_ctx = (this.m_drawOp.getAltContext != null)
    ? this.m_drawOp.getAltContext(e)
    : null;
  let cur_pt = e.m_point;
  let margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

  // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
  if (this.m_bWrtProtect) {
    this.m_bWrtProtect = false;
    return;
  }

  // カーソルクリア
  let ctx_cursor = e.m_sender.getOverlay().getContext('2d');
  this.m_cursor.clear(ctx_cursor);

  // 領域復元
  if (this.m_imagePatch != null) {
    this.m_imagePatch.restore(context);
    this.m_imagePatch = null;
  }
  if (this.m_altImagePatch != null) {
    this.m_altImagePatch.restore(alt_ctx);
    this.m_altImagePatch = null;
  }

  // 点列記憶
  this.m_points.push(cur_pt);

  // 描画内容確定判断
  let bFixed = this.m_drawOp.testOnDrawEnd(e, this.m_points, context);
  if (bFixed) {
    this.m_effect.apply(this.m_points, context);
    e.m_sender.appendPoints(this.m_effect, this.m_points);   // 点列追記(Undo/Redo)
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
NullEffect.prototype.setParam = function() { return function(obj) { /*NOP*/ }; }

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
  this.guideOnDrawing(e, points, context);
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
//  描画オペレータ2: 矩形領域指定(直線, 線四角, 四角 etc.)
//

/// 新しいインスタンスを初期化する。
function DrawOp_Rectangle(setting, bFilled)
{
  this.m_bFilled = bFilled;
  this.m_setting = setting;
}

/// 描画ストローク開始時の画素固定判断を行う。
DrawOp_Rectangle.prototype.testOnDrawStart = function(e, points, context)
{
  return false;
}

/// 描画ストローク中の画素固定判断を行う。
DrawOp_Rectangle.prototype.testOnDrawing = function(e, points, context)
{
  if (points.length > 2) {
    points.splice(1, points.length - 2);  // 先頭と末尾以外を削除
    return false;
  }
}

/// 描画ストローク終了時の画素固定判断を行う。
DrawOp_Rectangle.prototype.testOnDrawEnd = function(e, points, context)
{
  return true;
}

/// 描画ストローク開始時ガイド表示処理。
DrawOp_Rectangle.prototype.guideOnDrawStart = function(e, points, context)
{
  this.guideOnDrawing(e, points, context);
}

/// 描画ストローク中ガイド表示処理。
DrawOp_Rectangle.prototype.guideOnDrawing = function(e, points, context)
{
  if (points.length >= 2) {
    let alt_ctx = e.m_sender.getOverlay().getContext('2d');

    // 最新描画色取得
    let setting = this.m_setting;
    let color = setting.getColor();

    // ガイド矩形決定
    let pt1 = points[0];
    let pt2 = points[points.length - 1];
    let r = encode_to_rect(pt1.x, pt1.y, pt2.x, pt2.y);

    // ガイド矩形描画
    // context.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
    context.globalAlpha = 0.5;
    context.fillStyle = color;
    if (this.m_bFilled) {
      context.fillRect(r.x, r.y, r.width, r.height);
    } else {
      draw_rect_R(r, context);
    }
    context.globalAlpha = 1.0;
    // context.globalCompositeOperation = 'source-over';

    // オーバレイにもガイドを描画
    alt_ctx.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
    alt_ctx.fillStyle = get_cursor_color(color);
    // alt_ctx.globalAlpha = 0.5;
    draw_rect_R(r, alt_ctx);
    // alt_ctx.globalAlpha = 1.0;
    alt_ctx.globalCompositeOperation = 'source-over';
  }
}

/// 描画ストローク終了時ガイド表示処理。
// DrawOp_Rectangle.prototype.guideOnDrawEnd = function(e, points, context)

/// マージンを取得する。
DrawOp_Rectangle.prototype.getMargin = function() { return 0; }

/// 代替描画先コンテキストを指定する。(Optional)
DrawOp_Rectangle.prototype.getAltContext = function(e)
{
  let ctx_overlay = e.m_sender.getOverlay().getContext('2d');
  return ctx_overlay;
}

//
//  EffectBase01: 描画効果全般の基底クラス
//

// キャンバスに画素を直接置くタイプの効果(鉛筆や消しペン)の他、
// 将来水彩等にも使えるようにしている(つもり)。

/// 新しいインスタンスを取得する。
function EffectBase01()
{
  this.setParamEx(null, null, null, null);
}

/// パラメータを設定する。(クラス固有)
EffectBase01.prototype.setParamEx = function(
  ha,                   // [in] Pre-rendering配置オフセット
  pre_rendered,         // [in] Pre-rendering結果
  runtime_renderer1,    // [in] 実行時render関数(1点用)
  runtime_renderer2     // [in] 実行時render関数(2点用)
)
{
  this.m_ha = ha;
  this.m_pre_rendered = pre_rendered;
  this.m_runtime_renderer1 = runtime_renderer1;
  this.m_runtime_renderer2 = runtime_renderer2;
}

/// エフェクトを適用する。
EffectBase01.prototype.apply = function(points, context)
{
  if (points.length == 1) {
    let pt = points[0];
    if (this.m_pre_rendered) {    // (Pre-rendering結果存在)
      put_point(pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
    } else {
      // 実行時render関数(1点用)呼び出し
      // runtime_render1の引数仕様がここに適用される。
      this.m_runtime_renderer1(pt.x, pt.y, context);
    }
  } else {
    assert(points.length > 0);
    let prev = points[0];
    for (let i = 1; i < points.length; ++i) {
      let pt = points[i];
      if (this.m_pre_rendered) {  // (Pre-rendering結果存在)
        draw_line(prev.x, prev.y, pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
      } else {
        // 実行時render関数(2点用)呼び出し
        // runtime_render2の引数仕様がここに適用される。
        this.m_runtime_renderer2(prev.x, prev.y, pt.x, pt.y, context);
      }
      prev = pt;
    }
  }
}

/// マージンを取得する。
/// これは派生クラスで定義する。
// EffectBase01.prototype.getMargin = function() { return 0; }

//
//  エフェクト1: 鉛筆
//

/// 新しいインスタンスを取得する。
function Effect_Pencil()
{
  this.m_effectBase = new EffectBase01();
  this.m_margin = null;
}

/// Pre-render関数。
Effect_Pencil.pre_renderer = function(ha, diameter, color)
{
  console.log("color=" + color);
  if (diameter > 1) {
    return pre_render_pixel(ha, diameter, color, true);
  } else {
    return null;    // 1 px描画時はpre-renderingしない。(好みの問題)
  }
}

/// 実行時render関数(1点用)。
Effect_Pencil.runtime_renderer1_ex = function(px, py, diameter, color, context)
{
  // console.log("Effect_Pencil.runtime_renderer1() called.");
  assert(diameter == 1);    // 1 px描画時のみ呼ばれるはず。
  context.fillStyle = color;
  put_point_1px(px, py, context);
}

/// 実行時render関数(2点用)。
Effect_Pencil.runtime_renderer2_ex = function(px1, py1, px2, py2, diameter, color, context)
{
  // console.log("Effect_Pencil.runtime_renderer2() called.");
  assert(diameter == 1);    // 1 px描画時のみ呼ばれるはず。
  context.fillStyle = color;
  draw_line_1px(px1, py1, px2, py2, context);
}

/// パラメータを設定する。(クラス固有)
Effect_Pencil.prototype.setParam = function(diameter, color)
{
  // マージン決定
  this.m_margin = (diameter > 1) ? Math.ceil(diameter / 2) + 10 : 0;

  // 引数仕様合わせのためのクロージャ生成
  let runtime_renderer1 = function(px, py, context) {
    Effect_Pencil.runtime_renderer1_ex(px, py, diameter, color, context);
  };
  let runtime_renderer2 = function(px1, py1, px2, py2, context) {
    draw_line_1px(px1, py1, px2, py2, context);
    Effect_Pencil.runtime_renderer2_ex(px1, py1, px2, py2, diameter, color, context);
  };

  // 描画条件決定
  let ha = this.m_margin;
  this.m_effectBase.setParamEx(
    ha,
    Effect_Pencil.pre_renderer(ha, diameter, color),
    runtime_renderer1,
    runtime_renderer2
  );

  // 再設定のためのクロージャを返す(Undo/Redo)
  return function(obj) { obj.setParam(diameter, color); };
}

/// エフェクトを適用する。
Effect_Pencil.prototype.apply = function(points, context)
{
  this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_Pencil.prototype.getMargin = function() { return this.m_margin; }

//
//  エフェクト2: 消しペン
//

/// 新しいインスタンスを取得する。
function Effect_Eraser(diameter, color)
{
  this.m_effectBase = new EffectBase01();
  this.m_margin = null;
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_Eraser.runtime_renderer1_ex = function(px, py, diameter, context)
{
  let radius = diameter / 2;
	let sx = Math.ceil(px - radius);
  let sy = Math.ceil(py - radius);
	let lx = Math.floor(px + radius);
	let d = lx - sx + 1;
	context.clearRect(sx, sy, d, d);
}

/// 実行時render関数(2点用)。
Effect_Eraser.runtime_renderer2_ex = function(px1, py1, px2, py2, runtime_renderer1, context)
{
  // console.log("runtime_renderer2() called.");
  // console.dir(runtime_renderer1);
  draw_line_w_runtime_renderer(px1, py1, px2, py2, runtime_renderer1, context);
}

/// パラメータを設定する。(クラス固有)
Effect_Eraser.prototype.setParam = function(diameter, color)
{
  // マージン決定
  this.m_margin = (diameter > 1) ? Math.ceil((1.5 * diameter) / 2) : 0;

  // 引数仕様合わせのためのクロージャ生成
  let runtime_renderer1 = function(px, py, context) {
    Effect_Eraser.runtime_renderer1_ex(px, py, diameter, context);
  };
  let runtime_renderer2 = function(px1, py1, px2, py2, context) {
    Effect_Eraser.runtime_renderer2_ex(px1, py1, px2, py2, runtime_renderer1, context);
  };
  // console.dir(runtime_renderer1);
  // console.dir(runtime_renderer2);

  // 描画条件決定
  let ha = this.m_margin;
  this.m_effectBase.setParamEx(
    ha,
    null,
    runtime_renderer1,
    runtime_renderer2
  );

  // 再設定のためのクロージャを返す(Undo/Redo)
  return function(obj) { obj.setParam(diameter, color); };
}

/// エフェクトを適用する。
Effect_Eraser.prototype.apply = function(points, context)
{
  this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_Eraser.prototype.getMargin = function() { return this.m_margin; }

//
//  エフェクト3: 鉛筆による線四角 or 四角
//

/// 新しいインスタンスを取得する。
function Effect_PencilRect(bFilled)
{
  this.m_effectBase = new EffectBase01();
  this.m_bFilled = bFilled;
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_PencilRect.runtime_renderer1_ex = function(px, py, color, context)
{
  assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_PencilRect.runtime_renderer2_ex = function(px1, py1, px2, py2, color, bFilled, context)
{
  let r = encode_to_rect(px1, py1, px2, py2);

  context.fillStyle = color;
  if (bFilled) {
    context.fillRect(r.x, r.y, r.width, r.height);
  } else {
    draw_rect_R(r, context);
  }
}

/// パラメータを設定する。(クラス固有)
/// 第1引数thicknessは、DrawToolBase.OnDrawStart()から共通に呼ぶ都合上設けたもので、非使用。
Effect_PencilRect.prototype.setParam = function(thickness, color)
{
  // 引数仕様合わせのためのクロージャ生成
  let runtime_renderer1 = function(px, py, context) {
    Effect_PencilRect.runtime_renderer1_ex(px, py, color, context);
  };
  let bFilled = this.m_bFilled;
  let runtime_renderer2 = function(px1, py1, px2, py2, context) {
    Effect_PencilRect.runtime_renderer2_ex(px1, py1, px2, py2, color, bFilled, context);
  };

  // 描画条件決定
  this.m_effectBase.setParamEx(
    0,
    null,
    runtime_renderer1,
    runtime_renderer2
  );

  // 再設定のためのクロージャを返す(Undo/Redo)
  return function(obj) { obj.setParam(thickness, color); };
}

/// エフェクトを適用する。
Effect_PencilRect.prototype.apply = function(points, context)
{
  this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_PencilRect.prototype.getMargin = function() { return 0; }

//
//  CursorBase01: 円形や方形等のカーソルの基底クラス
//

/// 新しいインスタンスを取得する。
function CursorBase01(diameter, pixel_pre_renderer)
{
  this.m_pre_renderer = pixel_pre_renderer;

  if (diameter == null) { diameter = 1; }
  this.setParam(diameter, 'rgb(0,0,0)', pixel_pre_renderer);
}

/// パラメータを設定する。(クラス固有)
CursorBase01.prototype.setParam = function(diameter, color, pixel_pre_renderer)
{
  const margin = Math.ceil(diameter / 2);
  color = get_cursor_color(color);

  this.m_pre_rendered = null;
  this.m_ha = 0;
  this.m_prev_pt = null;

  if (diameter > 1) {
    this.m_ha = Math.ceil(diameter / 2 + margin);
    this.m_pre_rendered = pixel_pre_renderer(this.m_ha, diameter, color, false);
  }

  this.m_imagePatch = null;
}

/// カーソルを描画する。
CursorBase01.prototype.put = function(e, cur_pt, context)
{
  let layer = e.m_sender.getOverlay();
  let w = layer.width;    // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = layer.height;   // (同上)
  // console.log("layer: w=" + layer.width + ", h=" + layer.height);

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
CursorBase01.prototype.clear = function(context)
{
  if (this.m_imagePatch) {
    this.m_imagePatch.restore(context);
  }
  this.m_imagePatch = null;
}

//
//  カーソル1: 円形カーソル
//

/// 新しいインスタンスを取得する。
function Cursor_Circle(diameter)
{
  this.m_cursorBase = new CursorBase01(diameter, pre_render_pixel);
}

/// パラメータを設定する。(クラス固有)
Cursor_Circle.prototype.setParam = function(diameter, color)
{
  this.m_cursorBase.setParam(diameter, color, pre_render_pixel);
}

/// カーソルを描画する。
Cursor_Circle.prototype.put = function(e, cur_pt, context)
{
  this.m_cursorBase.put(e, cur_pt, context);
}

/// カーソルをクリアする。
Cursor_Circle.prototype.clear = function(context)
{
  this.m_cursorBase.clear(context);
}

//
//  カーソル2: 方形カーソル
//

/// 新しいインスタンスを取得する。
function Cursor_Square(diameter)
{
  this.m_cursorBase = new CursorBase01(diameter, pre_render_square);
}

/// パラメータを設定する。(クラス固有)
Cursor_Square.prototype.setParam = function(diameter, color)
{
  this.m_cursorBase.setParam(diameter, color, pre_render_square);
}

/// カーソルを描画する。
Cursor_Square.prototype.put = function(e, cur_pt, context)
{
  this.m_cursorBase.put(e, cur_pt, context);
}

/// カーソルをクリアする。
Cursor_Square.prototype.clear = function(context)
{
  this.m_cursorBase.clear(context);
}

//
//	History
//

const OebiEventType = {
  Normal: 1,
  Paint: 2,
  VisibilityChange: 3
};

/// 新しいインスタンスを初期化する。
function History(toolPalette, pictCanvas)
{
  // 関連オブジェクト
  this.m_toolPalette = toolPalette;
  this.m_pictCanvas = pictCanvas;

  // 履歴メモリ
	this.m_eventHistory = [];

  // 画像添付エントリの辞書
  this.m_imageLog = {};

  // 履歴カーソル
  // 次にイベントを追記すべき場所を示す。
	this.m_historyCursor = 0;

  // イベント追記制御
  this.m_bDealing = false;
  this.m_bTakeSnapshotOnDrawStart = false;
}

/// 空か否かを返す。
History.prototype.empty = function()
{
  return !(this.m_eventHistory.length > 0);
}

/// 操作履歴の長さ(イベント数)を返す。
History.prototype.getLength = function()
{
	return this.m_eventHistory.length;
}

/// 操作履歴のカーソル位置を返す。
History.prototype.getCursorIdx = function()
{
  // appendEffect()他、履歴カーソルを進めるメソッドを呼んだ直後は、
  // 当メソッドの戻り値と、getLength()メソッドの戻り値は一致する。
  // wayBackTo()メソッドを呼ぶと、引数に与えたidxに対し、
  // (idxが正しく履歴の範囲内ならば)当メソッドの戻り値もidxになる。
  return this.m_historyCursor;
}

/// エフェクト内容を追記する。
/// 当メソッド呼び出しで、履歴カーソルが1エントリ進む。
History.prototype.appendEffect = function(effectObj, configClosure, layerNo)
{
  if (this.m_bDealing)
    return;

  // 履歴カーソル以降を削除
  this.resetEvent(this.m_historyCursor);
  console.log("History::appendEffect() called. Cursor=" + this.m_historyCursor);

  // キャンバス状態のスナップショット取得判断
  if (this.m_bTakeSnapshotOnDrawStart) {
    this.attatchImage();
    this.m_bTakeSnapshotOnDrawStart = false;
  }

  // イベント追記
  let histEnt = [];
  histEnt.push(OebiEventType.Normal);   // 通常の描画イベント
  histEnt.push(effectObj);              // エフェクト
  histEnt.push(configClosure);          // エフェクトを設定するクロージャ
  histEnt.push(layerNo);                // 対象レイヤー番号
  histEnt.push([]);                     // 点列
  let maskTool = this.m_toolPalette.getActiveMaskTool();
  histEnt.push(maskTool);               // マスクツール
  let maskColor = this.m_toolPalette.getCommonSetting().getMaskColor();
  histEnt.push(maskColor);              // マスク色
	this.m_eventHistory.push(histEnt);
  console.log(this.m_imageLog);

  // 履歴カーソル修正
  // (インクリメントと同じ)
	this.m_historyCursor = this.m_eventHistory.length;
}

/// 履歴カーソルの一つ前のエントリに点列を追記する。
/// 当メソッドでは履歴カーソルは動かない。
History.prototype.appendPoints = function(effectObj, points)
{
  if (this.m_bDealing)
    return;
  console.log("History::appendPoints() called. Cursor=" + (this.m_historyCursor - 1));

  // 点列追記
  // 追記先は、エフェクト内容を最後に追記したエントリ。
  assert(this.m_historyCursor > 0);
  let histEnt = this.m_eventHistory[this.m_historyCursor - 1];
  assert(histEnt[0] == OebiEventType.Normal && histEnt[1] == effectObj);
  for (let i = 0; i < points.length; ++i) {
    histEnt[4].push(points[i]);
  }
}

/// 塗り潰し操作を追記する。
/// 当メソッド呼び出しで、履歴カーソルが1エントリ進む。
History.prototype.appendPaintOperation = function(point, color, layerNo)
{
  if (this.m_bDealing)
    return;

  // 履歴カーソルより後を削除
  this.resetEvent(this.m_historyCursor);
  console.log("History::appendPaintOperation() called. Cursor=" + this.m_historyCursor);

  // キャンバス状態のスナップショット取得判断
  if (this.m_bTakeSnapshotOnDrawStart) {
    this.attatchImage();
    this.m_bTakeSnapshotOnDrawStart = false;
  }

  // イベント追記
  let histEnt = [];
  histEnt.push(OebiEventType.Paint);      // 塗り潰しイベント
  histEnt.push(point);                    // 開始点
  histEnt.push(color);                    // 配置色
  histEnt.push(layerNo);                  // 対象レイヤー番号
  let maskTool = this.m_toolPalette.getActiveMaskTool();
  histEnt.push(maskTool);                 // マスクツール
  let maskColor = this.m_toolPalette.getCommonSetting().getMaskColor();
  histEnt.push(maskColor);                // マスク色
  this.m_eventHistory.push(histEnt);
  console.log(this.m_imageLog);

  // 履歴カーソル修正
  // (インクリメントと同じ)
	this.m_historyCursor = this.m_eventHistory.length;
}

/// レイヤー可視属性変更を追記する。
/// 当メソッド呼び出しで、履歴カーソルが1エントリ進む。
/// ただし、操作履歴の先頭以外での呼び出しは何もしない。
History.prototype.appendVisibilityChange = function()
{
  // レイヤー可視属性が変わったので、
  // 次回描画ストローク開始時にスナップショット取得判断させる。
  this.m_bTakeSnapshotOnDrawStart = true;

  // 過去履歴中か否か判定
  if (this.m_historyCursor < this.m_eventHistory.length) {
    // 途中までundoされた状態(過去履歴中)なので何もしない。
    // m_bTakeSnapshotOnDrawStartフラグに基づき、描画ストローク開始時に
    // スナップショット取得を判断させる。
    return;
  }

  // 以下、操作履歴の先端に居る場合の処理。
  // 操作履歴の先端にレイヤーの最新の可視属性変更を追記する。
  // これは、一旦undoされた後、redoで最新状態に戻されたとき、
  // 可視状態まで含めてキャンバスの状態を復元するために必要である。
  assert(this.m_historyCursor == this.m_eventHistory.length);   // resetEvent()は不要のはず。

  // レイヤー可視属性取得
	let visibilityList = [];
  let nlayers = this.m_pictCanvas.getNumLayers();
	for (let i = 0; i < nlayers; ++i) {
    let layer = this.m_pictCanvas.getLayer(i);
		visibilityList[i] = !layer.hidden;
	}

  // レイヤー可視属性記録
  let histEnt = [];
  histEnt.push(OebiEventType.VisibilityChange);
  histEnt.push(visibilityList);
  this.m_eventHistory.push(histEnt);

  // 履歴カーソル修正
  // (インクリメントと同じ)
	this.m_historyCursor = this.m_eventHistory.length;
}

/// 履歴カーソルが指すエントリに対し、画像添付を予約する。
/// 当メソッド呼び出しでは履歴カーソルは変化しない。
History.prototype.attatchImage = function()
{
  if (this.m_bDealing)
    return;
	console.log("History::attatchImage() called. Cursor=" + this.m_historyCursor);

  // 画像に変化があったか確認
  // メモリ消費削減のため、変化が無ければ何もしない。
  // (古い添付画像があった場合は例外で、それは消す)
  let bChanged;
  if (this.empty()) {
    console.log("History::attatchImage(): First recording.");
    bChanged = true;    // イベント初回は変化があったとみなす。
  } else {
    bChanged = this.m_pictCanvas.isPictureStateChanged();
    console.log("History::attatchImage(): Picture change state=" + bChanged);
  }
  if (!bChanged) {
    if (this.m_historyCursor > 0) {
      delete this.m_imageLog[this.m_historyCursor];
    }
    return false;
  }

  // 作業中レイヤーを固定
  this.m_pictCanvas.raiseLayerFixRequest();

	// レイヤーの画像データと可視属性取得
	let imgdList = [];
	let visibilityList = [];
  let nlayers = this.m_pictCanvas.getNumLayers();
	for (let i = 0; i < nlayers; ++i) {
    let layer = this.m_pictCanvas.getLayer(i);
		let w = layer.width;
		let h = layer.height;
		let ctx = layer.getContext('2d');
		imgdList[i] = ctx.getImageData(0, 0, w, h);
		visibilityList[i] = !layer.hidden;
	}
  let pictureInfo = {
		m_imageDataList: imgdList,
		m_visibilityList: visibilityList
	};

	// 画像添付予約
  this.m_imageLog[this.m_historyCursor] = pictureInfo;
  console.log("History::attatchImage(): Reserved to cursor " + this.m_historyCursor + ".");

  // 画像の次の変化を捉える準備
  this.m_pictCanvas.registerPictureState();
}

/// 指定エントリの画像を復元する。
History.prototype.restoreImage = function(idx, pictureCanvas)
{
  if (!idx in this.m_imageLog)
    return false;     // 画像無しエントリならfalseを返す。
  console.log("History::restoreImage(): Restoreing cursor " + idx + "...");

	// レイヤーの画像と可視属性を復元
  let pictureInfo = this.m_imageLog[idx];
  let nlayers = pictureCanvas.getNumLayers();
	for (let i = 0; i < nlayers; ++i) {
		let imgd = pictureInfo.m_imageDataList[i];
    let layer = pictureCanvas.getLayer(i);
    assert(imgd.width == layer.width && imgd.height == layer.height);
		let ctx = layer.getContext('2d');
		ctx.putImageData(imgd, 0, 0);
		layer.hidden = !pictureInfo.m_visibilityList[i];
	}

  // レイヤー可視属性をレイヤーツールに反映
  this.m_toolPalette.setLayerVisibilityEx(pictureInfo.m_visibilityList);

  // マスク/逆マスクツールのinvalidate
  // サーフェス上の画像と内部状態を破棄し、復元画像で作り直す。
  this.m_toolPalette.invalidateMaskTools();

	return true;
}

/// 添付画像付き(またや予約中)履歴エントリのindexを昇順で返す。
History.prototype.getImageHavingIndices = function()
{
  let keys = Object.keys(this.m_imageLog);
  let indices = [];
  for (let i = 0; i < keys.length; ++i) {
    indices.push(parseInt(keys[i]));
  }
  indices.sort(function(a, b) { a - b; });
  return indices;
}

/// イベントをリセットする。
History.prototype.resetEvent = function(resetPointIdx)
{
	if (resetPointIdx >= this.m_eventHistory.length)
		return false;

	// [resetPointIdx]以降のイベントエントリを削除
	let deleteCount = this.m_eventHistory.length - resetPointIdx;
	this.m_eventHistory.splice(resetPointIdx, deleteCount);
	this.m_historyCursor = resetPointIdx;

  // [resetPointIdx]より後の添付画像を削除
  // [resetPointIdx]への画像添付予約はそのままとする。
  let indices = this.getImageHavingIndices();
  for (let i = 0; i < indices.length; ++i) {
    if (indices[i] > resetPointIdx) {
      delete this.m_imageLog[indices[i]];
    }
  }

	return true;
}

/// 指定indexに対し、現在または直近過去の(未来ではない)画像付きエントリのindexを返す。
History.prototype.getImageHavingIdxBefore = function(idx)
{
  // [0..idx]の範囲で逆順でループを回すのではなく
  // History::getImageHavingEventIndices()を呼ぶのは、
  // (idx == this.m_eventHistory.length)のときがあるため。
  let foundIdx = null;
  let indices = this.getImageHavingIndices();
  for (let i = 0; i < indices.length; ++i) {
    if (indices[i] <= idx) {
      foundIdx = indices[i];
    } else {
      break;
    }
  }
  return foundIdx;
}

/// 履歴を指定位置に戻す。
/// 履歴エントリの先頭から[idx-1]までの内容を復元する。
/// ただし、[idx]が画像付きエントリの場合は当該画像を直接描画する。
History.prototype.wayBackTo_Core = function(idx)
{
  // 未来でない直近の画像付きエントリ取得
  let restorePointIdx = this.getImageHavingIdxBefore(idx);
  assert(restorePointIdx != null);    // [0]が必ず画像付きのため、nullにはならないはず。

  // 画像付きエントリの画像を描画
  this.restoreImage(restorePointIdx, this.m_pictCanvas);

  // [idx-1]までを差分再生
  for (let i = restorePointIdx; i < idx; ++i) {
    this.wayBackTo_Sub(i);
  }

  // 履歴カーソル修正
  this.m_historyCursor = idx;
}

/// 差分計算して画像を更新する。
History.prototype.wayBackTo_Sub = function(idx)
{
  // 描画準備
  let histEnt = this.m_eventHistory[idx];
  let k = 0;
  let evtType = histEnt[k++];
  if (evtType == OebiEventType.Normal) {
    let effectObj = histEnt[k++];
    let configClosure = histEnt[k++];
    let layerNo = histEnt[k++];
    let points = histEnt[k++];
    let maskTool = histEnt[k++];
    let maskColor = histEnt[k++];
    configClosure(effectObj);     // 適切なEffect::setParam()を描画時の引数で呼ぶ。
    this.m_toolPalette.activateMaskTool(maskTool, maskColor);   // マスクツール設定

    // 描画
    // 描画ツールをクリックだけして別のツールをクリックした場合は
    // 点列が空の履歴エントリとなるので、(points.length > 0)のガード条件が必要。
    if (points.length > 0) {
      let layer = this.m_pictCanvas.getLayer(layerNo);
      let context = layer.getContext('2d');
      effectObj.apply(points, context);
    }
  } else if (evtType == OebiEventType.Paint) {
    let point = histEnt[k++];
    let color = histEnt[k++];
    let layerNo = histEnt[k++];
    let maskTool = histEnt[k++];
    let maskColor = histEnt[k++];
    this.m_toolPalette.activateMaskTool(maskTool, maskColor);   // マスクツール設定

    // 描画
    let layer = this.m_pictCanvas.getLayer(layerNo);
    let ffst = new FloodFillState(layer, point.x, point.y, color);
    ffst.fill();
  } else if (evtType == OebiEventType.VisibilityChange) {
    let visibilityList = histEnt[k++];
    this.m_toolPalette.setLayerVisibilityEx(visibilityList);
  } else {
    assert(false);
  }
}

/// 履歴を指定位置に戻す。
History.prototype.wayBackTo = function(idx)
{
  this.m_bDealing = true;
  this.wayBackTo_Core(idx);
  this.m_bDealing = false;
}

//
//  「元に戻す」ボタン
//

/// 新しいインスタンスを初期化する。
function UndoButton(history)
{
  this.m_history = history;
  this.m_undoButton = document.getElementById('undo');
  let undoButton = this;    // 束縛変数
  this.m_undoButton.onclick = function() {
    undoButton.OnClicked();
  }
}

/// 「元に戻す」ボタンがクリックされたとき呼ばれる。
UndoButton.prototype.OnClicked = function()
{
  let curIdx = this.m_history.getCursorIdx();
  if (curIdx > 0) {
    --curIdx;
    console.log("UndoButton::OnClicked(): waiBackTo(" + curIdx + ")");
    this.m_history.wayBackTo(curIdx);
  }
}

//
//  「やり直し」ボタン
//

/// 新しいインスタンスを初期化する。
function RedoButton(history)
{
  this.m_history = history;
  this.m_redoButton = document.getElementById('redo');
  let redoButton = this;    // 束縛変数
  this.m_redoButton.onclick = function() {
    redoButton.OnClicked();
  }
}

/// 「やり直し」ボタンがクリックされたとき呼ばれる。
RedoButton.prototype.OnClicked = function()
{
  let curIdx = this.m_history.getCursorIdx();
  if (curIdx < this.m_history.getLength()) {
    ++curIdx;
    console.log("RedoButton::OnClicked(): waiBackTo(" + curIdx + ")");
    this.m_history.wayBackTo(curIdx);
  }
}
