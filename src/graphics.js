// Copyright (c) 2016, mirido
// All rights reserved.

import {
  utest_pre_rendering,
  utest_ImagePatch,
  utesst_ColorConversion,
  utest_canvas_2d_context,
  utest_get_mask_image,
  utest_half_tone
} from './_doc/utest.js';
import {
  dump_event,
  assert,
  dbgv
} from './dbg-util';
import {
  get_guide_image,
  get_mirror_image,
  get_vert_flip_image,
  blend_image,
  fill_image,
  make_opaque,
  erase_single_layer,
  putImageDataEx,
  erase_canvas,
  copy_layer,
  get_destinaton_out_image,
  get_mask_image,
  fix_image_w_mask,
  get_joint_image
} from './imaging.js';
import {
  jsPoint,
  jsRect,
  JsPoint,
  JsRect,
  decode_rect,
  encode_to_rect,
  encode_to_rect_in_place,
  clip_coords,
  clip_rect_in_place,
  clip_rect,
  get_outbounds,
  get_common_rect,
  get_chv_dist,
  get_mht_dist,
  rect_includes,
  rects_have_common
} from './geometry.js';
// import {
// 	pre_render_pixel,
// 	pre_render_square,
// 	put_point,
// 	put_point_1px,
// 	draw_line_w_plot_func,
// 	draw_line,
// 	draw_line_w_runtime_renderer,
// 	draw_line_1px,
// 	draw_rect,
// 	draw_rect_R,
// 	draw_circle,
// 	FloodFillState,
// 	get_max_run_len_histogram,
// 	get_halftone_definition,
// 	gen_halftones	
// } from './graphics.js';
import {
  getBrowserType,
  unify_rect,
  getBoundingClientRectWrp,
  conv_page_client_to_wnd_client,
  get_color_as_RGB,
  get_color_as_RGBA,
  get_components_from_RGBx,
  get_cursor_color,
  add_to_unique_list,
  remove_from_unique_list,
  PointManager,
  register_pointer_event_handler,
  change_selection,
  ThicknessSelector,
  SpKey,
  KeyStateManager,
  draw_icon_face,
  borderColor,
  activeIconColors,
  inactiveIconColors,
  textColor,
  textCharWidth,
  draw_icon_face_ex,
  draw_icon_face_wrp,
  draw_icon_ex,
  draw_icon_wrp,
  draw_color_palette,
  MicroSlideBar,
  ListBox
} from './ui-util.js';
import {
  ImagePatch,
  DrawerBase,
  NullDrawOp,
  NullEffect,
  NullCursor,
  DrawOp_FreeHand,
  DrawOp_Rectangle,
  DrawOp_RectCapture,
  DrawOp_BoundingRect,
  EffectBase01,
  Effect_Pencil,
  Effect_Eraser,
  Effect_PencilRect,
  Effect_RectPaste,
  Effect_RectEraser,
  Effect_FlipRect,
  Effect_Halftone,
  CursorBase01,
  Cursor_Circle,
  Cursor_Square,
  History,
  UndoButton,
  RedoButton
} from './ui-element.js';
import {
  PointingEvent,
  PointingEventClone,
  VirtualClickEvent,
  modify_click_event_to_end_in_place,
  PictureCanvas
} from './picture-canvas.js';
import {
  DrawToolBase,
  PencilTool,
  FillRectTool,
  LineRectTool,
  CopyTool,
  MirrorTool,
  VertFlipTool,
  EraseTool,
  EraseRectTool,
  ThicknessTool,
  ColorPalette,
  ColorCompoTool,
  MaskTool,
  get_layer_no,
  PaintTool,
  LayerTool,
  generateTool
} from './oebi-tool.js';
import {
  ToolType,
  CommonSetting,
  ToolChain,
  addToolHelper,
  ToolPalette
} from './tool-palette.js';

import {
  g_pointManager,
  g_keyStateManager,
  g_pictureCanvas,
  g_toolPalette,
  g_paintTool,
  g_history,
  g_UndoButton
} from './index.js';

'use strict'

//
//	プリレンダリング
//

/// 大きさを持った画素をプリレンダリングする。
/// diameterが画素の大きさにあたる。
/// 通常はha = Math.ceil(diameter / 2 + マージン)とする。
export function pre_render_pixel(ha, diameter, color, bFilled) {
  // pre-rendering用キャンバス生成
  let mini_canvas = document.createElement('canvas');
  mini_canvas.width = 2 * ha + 1;
  mini_canvas.height = 2 * ha + 1;

  // アンチエリアシング対策
  let radius = diameter / 2;
  let px = ha;

  // 描画
  let context = mini_canvas.getContext('2d');
  context.fillStyle = color;
  context.strokeStyle = color;
  draw_circle(px, px, radius, context, bFilled);

  return mini_canvas;
}

/// 大きさを持った正方形をプリレンダリングする。
/// diameterが画素の大きさ(矩形の幅)にあたる。
/// 通常はha = Math.ceil(diameter / 2 + マージン)とする。
export function pre_render_square(ha, diameter, color, bFilled) {
  // pre-rendering用キャンバス生成
  let mini_canvas = document.createElement('canvas');
  mini_canvas.width = 2 * ha + 1;
  mini_canvas.height = 2 * ha + 1;

  // アンチエリアシング対策
  let radius = diameter / 2;
  let px = ha;

  // 描画
  let context = mini_canvas.getContext('2d');
  context.fillStyle = color;
  context.strokeStyle = color;
  let sx = Math.floor(px - radius);
  let lx = Math.ceil(px + radius);
  if (bFilled) {
    let d = lx - sx + 1;
    context.fillRect(sx, sx, d, d);
  } else {
    draw_rect(sx, sx, lx, lx, context);
  }

  return mini_canvas;
}

//
//	図形描画
//

/// 点を打つ。
export function put_point(px, py, ha, pre_rendered, context) {
  context.drawImage(pre_rendered, px - ha, py - ha);
}

/// 1 pxの点を打つ。
export function put_point_1px(px, py, context) {
  context.fillRect(px, py, 1, 1);
}

/// プレゼンハムのアルゴリズムで直線を描画する。(Plot関数指定)
export function draw_line_w_plot_func(x0, y0, x1, y1, plotFunc, context) {
  var tmp;

  var bSteep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (bSteep) {
    // swap(x0, y0);
    tmp = x0, x0 = y0, y0 = tmp;

    // swap(x1, y1)
    tmp = x1, x1 = y1, y1 = tmp;
  }
  if (x0 > x1) {
    // swap(x0, x1)
    tmp = x0, x0 = x1, x1 = tmp;

    // swap(y0, y1)
    tmp = y0, y0 = y1, y1 = tmp;
  }
  var deltax = x1 - x0
  var deltay = Math.abs(y1 - y0)
  var error = Math.floor(deltax / 2.0);
  var ystep
  var y = y0
  if (y0 < y1) {
    ystep = 1;
  } else {
    ystep = -1;
  }
  for (var x = x0; x <= x1; ++x) {
    if (bSteep) {
      // plot(y, x);
      plotFunc(y, x, context);
    } else {
      // plot(x, y);
      plotFunc(x, y, context);
    }
    error -= deltay;
    if (error < 0) {
      y += ystep;
      error += deltax;
    }
  }
}

/// 直線を描画する。(Pre-rendering前提)
export function draw_line(x0, y0, x1, y1, ha, pre_rendered, context) {
  let plotFunc = function (x, y, context) {
    context.drawImage(pre_rendered, x - ha, y - ha);
  };
  draw_line_w_plot_func(x0, y0, x1, y1, plotFunc, context);
}

/// 直線を描画する。(実行時render指定)
export function draw_line_w_runtime_renderer(x0, y0, x1, y1, run_time_renderer, context) {
  draw_line_w_plot_func(x0, y0, x1, y1, run_time_renderer, context);
}

/// プレゼンハムのアルゴリズムで1画素幅の直線を描画する。
export function draw_line_1px(x0, y0, x1, y1, context) {
  var tmp;

  var bSteep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (bSteep) {
    // swap(x0, y0);
    tmp = x0, x0 = y0, y0 = tmp;

    // swap(x1, y1)
    tmp = x1, x1 = y1, y1 = tmp;
  }
  if (x0 > x1) {
    // swap(x0, x1)
    tmp = x0, x0 = x1, x1 = tmp;

    // swap(y0, y1)
    tmp = y0, y0 = y1, y1 = tmp;
  }
  var deltax = x1 - x0
  var deltay = Math.abs(y1 - y0)
  var error = Math.floor(deltax / 2.0);
  var ystep
  var y = y0
  if (y0 < y1) {
    ystep = 1;
  } else {
    ystep = -1;
  }
  for (var x = x0; x <= x1; ++x) {
    if (bSteep) {
      // plot(y, x);
      context.fillRect(y, x, 1, 1);
    } else {
      // plot(x, y);
      context.fillRect(x, y, 1, 1);
    }
    error -= deltay;
    if (error < 0) {
      y += ystep;
      error += deltax;
    }
  }
}

/// 塗り潰し無しの矩形を描画する。
export function draw_rect(x0, y0, x1, y1, context) {
  // console.log("draw_rect: (" + x0 + ", " + y0 + ")-(" + x1 + ", " + y1 + ")");
  draw_line_1px(x0, y0, x1, y0, context);
  if (y0 < y1) {
    if (y1 - y0 > 1) {
      draw_line_1px(x0, y0 + 1, x0, y1 - 1, context);
      draw_line_1px(x1, y0 + 1, x1, y1 - 1, context);
    }
    draw_line_1px(x0, y1, x1, y1, context);
  } else if (y0 > y1) {
    if (y0 - y1 > 1) {
      draw_line_1px(x0, y0 - 1, x0, y1 + 1, context);
      draw_line_1px(x1, y0 - 1, x1, y1 + 1, context);
    }
    draw_line_1px(x0, y1, x1, y1, context);
  }
}

/// 塗り潰し無しの矩形を描画する。
export function draw_rect_R(rect, context) {
  draw_rect(
    rect.x, rect.y,
    rect.x + rect.width - 1, rect.y + rect.height - 1,
    context
  );
}

/// 円を描画する。
/// 低速なので呼び出し頻度を極力下げること。
export function draw_circle(cx, cy, radius, context, bFilled) {
  if (radius <= 0.5) {
    context.fillRect(Math.floor(cx), Math.floor(cy), 1, 1);
    return;
  }

  // 以下、Math.floor()とMath.ceil()の使い分けは、
  // (cx, cy)が整数座標である前提。
  // (cx, cy)が整数座標でない場合は、破綻はしないが円がやや歪になる恐れがある。
  let fr = radius;
  let frr = fr * fr;
  let r = Math.floor(fr);
  let prev_px1 = Math.round(cx - r);	// fr∈[1.0, 2.0)がcxの左隣
  let prev_px2 = Math.round(cx + r);	// fr∈[1.0, 2.0)がcxの右隣
  let prev_py1 = Math.round(cy);
  let prev_py2 = Math.round(cy);
  let dy_max = Math.ceil(r);
  for (let dy = (bFilled) ? 0 : 1; dy <= dy_max; ++dy) {
    let fd = frr - dy * dy;
    if (fd < 0.0)
      break;
    let fdx = Math.sqrt(fd);
    let dx = Math.floor(fdx);
    let px1 = Math.round(cx - dx);
    let px2 = Math.round(cx + dx);
    let py1 = Math.round(cy - dy);
    let py2 = Math.round(cx + dy);
    if (bFilled) {
      let len = px2 - px1 + 1;
      context.fillRect(px1, py1, len, 1);
      context.fillRect(px1, py2, len, 1);
    } else {
      draw_line_1px(prev_px1, prev_py1, px1, py1, context);
      draw_line_1px(prev_px2, prev_py1, px2, py1, context);
      draw_line_1px(prev_px1, prev_py2, px1, py2, context);
      draw_line_1px(prev_px2, prev_py2, px2, py2, context);
      prev_px1 = px1;
      prev_py1 = py1;
      prev_px2 = px2;
      prev_py2 = py2;
    }
  }
  if (!bFilled && prev_px1 != prev_px2) {
    assert(prev_px1 < prev_px2);
    draw_line_1px(prev_px1, prev_py1, prev_px2, prev_py1, context);
    draw_line_1px(prev_px1, prev_py2, prev_px2, prev_py2, context);
  }
}
/// ■ 備考
/// 円描画について
/// プレゼンハムのアルゴリズムやミッチェナーのアルゴリズムの使用を検討したが、
/// どちらも直径が奇数の円を描けないので没にした。
/// ■ 参考
/// http://dencha.ojaru.jp/programs_07/pg_graphic_09a1.html

//
//	塗り潰し
//

/// 新しいインスタンスを初期化する。
export function FloodFillState(canvas, px, py, color) {
  this.m_canvas = canvas;
  this.m_context = canvas.getContext('2d');
  this.m_context.fillStyle = color;		// α=255と仮定

  // 塗り替え後の色(配置色)の要素を取得
  this.m_nxtColors = get_components_from_RGBx(color);
  assert(this.m_nxtColors.length == 3 || this.m_nxtColors.length == 4);
  this.m_nxtColors[3] = 255;

  // 座標が画像外なら何もしない。
  if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
    this.m_curColors = null;	// 画像外なので取得不能
    this.m_stack = [];				// 塗り替え開始ポイント無し(NOP)
    return;
  }

  // 塗り替え領域の色(領域色)取得
  let imgd_sta = this.m_context.getImageData(px, py, 1, 1);
  assert(imgd_sta.data.length == 4);
  this.m_curColors = imgd_sta.data;
  assert(this.m_curColors.length == 4);
  // console.dir(this.m_curColors);
  // console.dir(this.m_nxtColors);

  // 塗り替え開始ポイント設定
  this.m_stack = [];
  this.m_stack.push(jsPoint(px, py));
  for (let i = 0; i < 4; ++i) {
    if (this.m_curColors[i] != this.m_nxtColors[i]) {
      return;		// 領域色と配置色が相違するならGO
    }
  }
  console.log("No area to paint.");
  this.m_stack = [];	// 領域色と配置色が同一ならNOGO (NOP)
}

/// 境界に達したか否か判定する。
FloodFillState.prototype.isBorder = function (px, imgd) {
  if (imgd == null)
    return true;
  let base = 4 * px;
  for (let i = 0; i < 4; ++i) {
    let cc = imgd.data[base + i];
    assert(cc != null);
    if (cc != this.m_curColors[i]) {
      // 画素の1要素でも領域色と相違したら境界とみなす。
      // ここに来たということは、配置色≠領域色なので、
      // 配置色で塗り潰し済みの画素も境界とみなされる。
      // 領域がドーナツ型であってもこれでOK。
      return true;
    }
  }
  return false;
}

/// 1ライン塗り潰す。
FloodFillState.prototype.fillLine = function (px, py) {
  // 画像上端/下端に達していないか確認
  if (py < 0 || py >= this.m_canvas.height)
    return;

  // 対象ラインの画素データ取得
  let imgd_tg = this.m_context.getImageData(0, py, this.m_canvas.width, 1);

  // 塗り潰し済みでないか確認
  if (this.isBorder(px, imgd_tg))
    return;

  // 左端に移動
  while (px >= 0 && !this.isBorder(px, imgd_tg)) {
    --px;
  }

  // 直上の画素データ取得
  let imgd_up = (py > 0)
    ? this.m_context.getImageData(0, py - 1, this.m_canvas.width, 1)
    : null;

  // 直下の画素データ取得
  let imgd_lo = (py < this.m_canvas.height - 1)
    ? this.m_context.getImageData(0, py + 1, this.m_canvas.width, 1)
    : null;

  // 塗り潰し範囲決定 & 次の塗り潰し開始位置をスタックにpush
  let prev_up = true;
  let prev_lo = true;
  let px_bgn = ++px;
  while (px < this.m_canvas.width && !this.isBorder(px, imgd_tg)) {
    // 直上の画素を確認
    let cur_up = this.isBorder(px, imgd_up);
    if (cur_up != prev_up) {
      if (!cur_up) {
        this.m_stack.push(jsPoint(px, py - 1));
      }
      prev_up = cur_up;
    }

    // 直下の画素を確認
    let cur_lo = this.isBorder(px, imgd_lo);
    if (cur_lo != prev_lo) {
      if (!cur_lo) {
        this.m_stack.push(jsPoint(px, py + 1));
      }
      prev_lo = cur_lo;
    }

    let base = 4 * px;
    imgd_tg.data[base + 0] = this.m_nxtColors[0];
    imgd_tg.data[base + 1] = this.m_nxtColors[1];
    imgd_tg.data[base + 2] = this.m_nxtColors[2];
    imgd_tg.data[base + 3] = this.m_nxtColors[3];

    ++px;
  }

  // 現ライン塗り潰し
  assert(px - px_bgn > 0);
  this.m_context.putImageData(imgd_tg, 0, py);
}

/// 1ライン塗り潰す。
FloodFillState.prototype.fill = function () {
  console.log("stack_size=" + this.m_stack.length);
  while (this.m_stack.length > 0) {
    let point = this.m_stack.pop();
    // console.log("point=(" + point.x + "," + point.y + ")");
    this.fillLine(point.x, point.y);
  }
}

//
//	網点生成
//

const half_tone_std_ha = 3;

/// 水平または斜め1行毎のランレングスのヒストグラムを取得する。
export function get_max_run_len_histogram(ptn, cyc, vy, background) {
  let pixelFunc = function (px, py) {
    assert(px >= 0 && py >= 0);
    px %= cyc;
    py %= cyc;
    let idx = cyc * py + px;
    return ptn[idx];
  };

  let histogram = {};
  for (let py = 0; py < cyc; ++py) {
    let T = 0;
    let bChanged = false;
    let run_val = null;
    for (let px = 0; ; ++px) {
      let val = pixelFunc(px, py);
      if (!bChanged) {		// (変化点発見前)
        if (run_val == null) {
          run_val = val;
        } else if (val != run_val) {		// (変化点発見)
          T = 1;
          run_val = val;
          bChanged = true;
        } else {
          if (px >= cyc - 1) {		// (変化点発見の見込み無し)
            let run_len = cyc;
            if (run_val == background) {
              if (!(run_len in histogram)) {
                histogram[run_len] = 1;
              } else {
                ++(histogram[run_len]);
              }
            }
            break;
          }
        }
      } else {		// (変化点発見後)
        let run_len = null;
        let bInBackground = (run_val == background);
        if (val == run_val) {
          if (T < cyc) {
            ++T;
          } else {
            run_len = T;
            run_val = val;
            T = 1;
          }
        } else {
          run_len = T;
          run_val = val;
          T = 1;
        }
        if (run_len != null) {
          if (bInBackground) {
            if (!(run_len in histogram)) {
              histogram[run_len] = 1;
            } else {
              ++(histogram[run_len]);
            }
          }
          if (px > cyc) {		// !bChangedだった間の埋め合わせのため、ここは「>」で正しい。
            break;
          }
        }
      }
    }
  }
  return histogram;
}

/// 網点の精細度を取得する。
export function get_halftone_definition(ptn, cyc, fAlpha) {
  // ランレングスのヒストグラム取得
  let background = (fAlpha > 0.5);
  let run_len_histo_h0 = get_max_run_len_histogram(ptn, cyc, 0, background);

  // 数値化
  let definition = 0;
  assert(!(0 in run_len_histo_h0));
  for (let i = 1; i <= cyc; ++i) {
    let m = cyc * Math.floor(cyc / i);
    definition *= (m + 1);
    if (i in run_len_histo_h0) {
      // console.log("run_len=" + i + ": " + run_len_histo_h0[i]);		// UTEST
      assert(run_len_histo_h0[i] <= m);
      definition += run_len_histo_h0[i];
    }
  }
  // throw new Error();		// UTEST

  return definition;
}

/// 網点のリストを生成する。
export function gen_halftones(ha) {
  let nbits = ((ha + 1) * (ha + 2)) / 2;
  let N = 1 << nbits;

  let fa = 2 * ha + 1;
  let cyc = fa - 1;
  let plotFunc = function (px, py, value, buf) {
    if (py < cyc && px < cyc) {
      let idx = cyc * py + px;
      buf[idx] = value;
    }
  };

  let ptnList = [];
  for (let i = 0; i < N; ++i) {
    // iを種として8方向対称パターンを生成
    let ptn = [];
    for (let py = 0; py < cyc; ++py) {
      for (let px = 0; px < cyc; ++px) {
        plotFunc(px, py, false, ptn);
      }
    }
    let m = 0x1;
    for (let py = 0; py <= ha; ++py) {
      for (let px = 0; px <= py; ++px) {
        // console.log("*** px=" + px + ", py=" + py);
        // let i = 0x2ad;		// Test. 市松模様1
        // let i = 0x152;		// Test. 市松模様2
        // let i = 0x20d;		// Test. 市松模様2 (run length=5)
        // let i = 0x3ff;		// Test. (run length=6)
        // let i = 0x01b;		// Test.
        // let i = 0x10;		// Test.
        let bDot = ((i & m) != 0);
        plotFunc(px, py, bDot, ptn);		// (1)
        plotFunc(cyc - px, py, bDot, ptn);		// (1)の左右反転
        plotFunc(px, cyc - py, bDot, ptn);		// (1)の上下反転
        plotFunc(cyc - px, cyc - py, bDot, ptn);		// 上記のmix
        plotFunc(py, px, bDot, ptn);		// (2)方向ベクトル(1, 1)に対して反転
        plotFunc(cyc - py, px, bDot, ptn);		// (2)の左右反転
        plotFunc(py, cyc - px, bDot, ptn);		// (2)の上下反転
        plotFunc(cyc - py, cyc - px, bDot, ptn);		// 上記のmix
        m <<= 1;
      }
    }
    assert(m == N);
    // console.log("*** END");	// UTEST

    // パターンのドット密度を計算
    let cnt = 0;
    for (let py = 0; py < cyc; ++py) {
      for (let px = 0; px < cyc; ++px) {
        let idx = cyc * py + px;
        if (ptn[idx]) {
          ++cnt;
        }
      }
    }
    let fAlpha = cnt / (cyc * cyc);
    // let fAlpha = Math.floor((255 * cnt) / (cyc * cyc));

    // パターンの精細度を計算
    let definition = get_halftone_definition(ptn, cyc, fAlpha);
    // console.log("definition=" + definition);

    // 辞書化
    ptnList.push({
      m_fAlpha: fAlpha,
      m_definition: definition,
      m_ptn: ptn
    });
  }

  // 並べ替え
  ptnList.sort(function (a, b) {
    if (a.m_fAlpha != b.m_fAlpha) {
      return (a.m_fAlpha < b.m_fAlpha) ? -1 : 1;
    } else if (a.m_definition != b.m_definition) {
      return (a.m_definition > b.m_definition) ? -1 : 1;
    } else {
      return 0;
    }
  });

  return ptnList;
}
