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
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
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
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
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
  let w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
  let h = curLayer.height;  // (同上)
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
    // 最新描画色取得
    let setting = this.m_setting;
    let color = setting.getColor();

    // ガイド矩形描画
    let pt1 = points[0];
    let pt2 = points[points.length - 1];
    context.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
    context.fillStyle = color;
    if (this.m_bFilled) {
      let w = pt2.x - pt1.x + 1;
      let h = pt2.y - pt1.y + 1;
      context.fillRect(pt1.x, pt1.y, w, h);
    } else {
      draw_rect(pt1.x, pt1.y, pt2.x, pt2.y, context);
    }
    context.globalCompositeOperation = 'source-over';
  }
}

/// 描画ストローク終了時ガイド表示処理。
// DrawOp_Rectangle.prototype.guideOnDrawEnd = function(e, points, context)

/// マージンを取得する。
DrawOp_Rectangle.prototype.getMargin = function() { return 0; }

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
  context.fillStyle = color;
  if (bFilled) {
    let w = px2 - px1 + 1;
    let h = py2 - py1 + 1;
    context.fillRect(px1, py1, w, h);
  } else {
    draw_rect(px1, py1, px2, py2, context);
  }
}

/// パラメータを設定する。(クラス固有)
Effect_PencilRect.prototype.setParam = function(color)
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
  let colors = get_components_from_RGBx(color);
  colors[0] ^= 0xff;
  colors[1] ^= 0xff;
  colors[2] ^= 0xff;
  if ( (colors[0] == 255 && colors[1] == 255 && colors[2] == 255)
  	|| (colors[0] == 0 && colors[1] == 0 && colors[2] == 0) )
  {
    // 白色(デフォルト背景色と同じ)や黒色は避ける。
    colors[0] = colors[1] = colors[2] = 128;
  }
  color = get_color_as_RGB(colors);

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
  let layer = e.m_sender.getCurLayer();
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
