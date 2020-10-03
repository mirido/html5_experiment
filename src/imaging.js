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
} from './dbg-util.js';
// import {
// 	get_guide_image,
// 	get_mirror_image,
// 	get_vert_flip_image,
// 	blend_image,
// 	fill_image,
// 	make_opaque,
// 	erase_single_layer,
// 	putImageDataEx,
// 	erase_canvas,
// 	copy_layer,
// 	get_destinaton_out_image,
// 	get_mask_image,
// 	fix_image_w_mask,
// 	get_joint_image
// } from './imaging.js';
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
import {
  pre_render_pixel,
  pre_render_square,
  put_point,
  put_point_1px,
  draw_line_w_plot_func,
  draw_line,
  draw_line_w_runtime_renderer,
  draw_line_1px,
  draw_rect,
  draw_rect_R,
  draw_circle,
  FloodFillState,
  get_max_run_len_histogram,
  get_halftone_definition,
  gen_halftones
} from './graphics.js';
import {
  getBrowserType,
  unify_rect,
  get_getBoundingClientRectWrp,
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
  KeyStateManager,
  draw_icon_face,
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
  LayerTool
} from './oebi-tool.js';
import {
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

'use strict';

//
//  画像データ操作
//

/// ガイド表示用の半透明 & 色反転画像データを取得する。
export function get_guide_image(src_imgd, dst_imgd) {
  const width = src_imgd.width;
  const height = src_imgd.height;
  assert(dst_imgd.width == width && dst_imgd.height == height);
  let colors = [];
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;

      // 色を変換の上で半透明化
      // 色の変換規則は現状get_cursor_color()の規則と合わせている。
      if (src_imgd.data[base + 3] != 0) {
        colors[0] = (0xff ^ src_imgd.data[base + 0]);
        colors[1] = (0xff ^ src_imgd.data[base + 1]);
        colors[2] = (0xff ^ src_imgd.data[base + 2]);
        if ((colors[0] == 255 && colors[1] == 255 && colors[2] == 255)
          || (colors[0] == 0 && colors[1] == 0 && colors[2] == 0)) {
          // 白色(デフォルト背景色と同じ)や黒色は避ける。
          colors[0] = colors[1] = colors[2] = 128;
        }
        dst_imgd.data[base + 0] = colors[0];
        dst_imgd.data[base + 1] = colors[1];
        dst_imgd.data[base + 2] = colors[2];
        dst_imgd.data[base + 3] = 128;
      }
    }
  }
}

/// 左右反転した画像データを取得する。
export function get_mirror_image(src_imgd, dst_imgd) {
  const width = src_imgd.width;
  const height = src_imgd.height;
  assert(dst_imgd.width == width && dst_imgd.height == height);
  let colors = [];
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    let tail = head + 4 * (width - 1);
    for (let px = 0; px < width; ++px) {
      let base_src = head + px * 4;
      let base_dst = tail - px * 4;
      dst_imgd.data[base_dst + 0] = src_imgd.data[base_src + 0];
      dst_imgd.data[base_dst + 1] = src_imgd.data[base_src + 1];
      dst_imgd.data[base_dst + 2] = src_imgd.data[base_src + 2];
      dst_imgd.data[base_dst + 3] = src_imgd.data[base_src + 3];
    }
  }
}

/// 上下反転した画像データを取得する。
export function get_vert_flip_image(src_imgd, dst_imgd) {
  const width = src_imgd.width;
  const height = src_imgd.height;
  assert(dst_imgd.width == width && dst_imgd.height == height);
  let colors = [];
  for (let py = 0; py < height; ++py) {
    let head_src = py * 4 * width;
    let head_dst = ((height - 1) - py) * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base_src = head_src + px * 4;
      let base_dst = head_dst + px * 4;
      dst_imgd.data[base_dst + 0] = src_imgd.data[base_src + 0];
      dst_imgd.data[base_dst + 1] = src_imgd.data[base_src + 1];
      dst_imgd.data[base_dst + 2] = src_imgd.data[base_src + 2];
      dst_imgd.data[base_dst + 3] = src_imgd.data[base_src + 3];
    }
  }
}

/// α値に基づき合成する。(src_imgd × dst_imgd → dst_imgd)
export function blend_image(src_imgd, dst_imgd) {
  const width = src_imgd.width;
  const height = src_imgd.height;
  assert(dst_imgd.width == width && dst_imgd.height == height);
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;

      // dst_imgdの画素値
      let R1 = dst_imgd.data[base + 0];
      let G1 = dst_imgd.data[base + 1];
      let B1 = dst_imgd.data[base + 2];
      let A1 = dst_imgd.data[base + 3];

      // src_imgdの画素値
      let R2 = src_imgd.data[base + 0];
      let G2 = src_imgd.data[base + 1];
      let B2 = src_imgd.data[base + 2];
      let A2 = src_imgd.data[base + 3];

      // 合成
      // 正規化α値1.0(完全不透明)の背景画像があると仮定して、
      // 背景画像の前にdst_imgd、src_imgdの順で半透明の壁がある場合の見え方(a)と、
      // 背景画像の前にdst_imgdとsrc_imgdを合成した1枚の壁がある場合の見え方(b)が同じになるように
      // dst_imgdとsrc_imgdを合成する。
      if (A2 == 0) {    // (src_imdgが完全透明)
        // 上記モデルに従い、dst_imgdの画素値は変更しない。
        /*NOP*/
      } else if (A2 == 255) {   // (src_imgdが完全不透明)
        // 上記モデルに従い、dst_imgdの画素値をsrc_imgdの画素値に置き換える。
        dst_imgd.data[base + 0] = R2;
        dst_imgd.data[base + 1] = G2;
        dst_imgd.data[base + 2] = B2;
        dst_imgd.data[base + 3] = 255;
      } else {  // (src_imgdが1～254の範囲内のα値を有する)
        // 上記モデルに従いsrc_imgdとdst_imgdを合成し、結果をdst_imgdに書く。
        // 下記joint_fAlphaが、見え方(b)における合成後の壁の正規化α値にあたる。
        let fAlpha2 = A2 / 255.0;     // 0.0 < fAlpha2 && fAlpha2 < 1.0が保証される。
        let fAlpha1 = A1 / 255.0;
        let joint_fAlpha = 1.0 - (1.0 - fAlpha2) * (1.0 - fAlpha1);
        let a = (1.0 - fAlpha2) * fAlpha1;
        let b = fAlpha2;
        dst_imgd.data[base + 0] = Math.floor(((R1 * a) + (R2 * b)) / joint_fAlpha);
        dst_imgd.data[base + 1] = Math.floor(((G1 * a) + (G2 * b)) / joint_fAlpha);
        dst_imgd.data[base + 2] = Math.floor(((B1 * a) + (B2 * b)) / joint_fAlpha);
        dst_imgd.data[base + 3] = Math.floor(255.0 * joint_fAlpha);
      }
    }
  }
}

/// 指定の画素値で埋める。
export function fill_image(R_cpnt, G_cpnt, B_cpnt, A_cpnt, dst_imgd) {
  const width = dst_imgd.width;
  const height = dst_imgd.height;
  for (let py = 0; py < height; ++py) {
    let head = py * 4 * width;
    for (let px = 0; px < width; ++px) {
      let base = head + px * 4;
      dst_imgd.data[base + 0] = R_cpnt;
      dst_imgd.data[base + 1] = G_cpnt;
      dst_imgd.data[base + 2] = B_cpnt;
      dst_imgd.data[base + 3] = A_cpnt;
    }
  }
}

//
//  単一キャンバス操作
//

/// レイヤーをの非透明画素(α値>0)のα値を再設定する。
export function make_opaque(canvas, new_alpha) {
  assert(new_alpha > 0);    // 0で実行すると非可逆になるので…
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
      if (imgd.data[base + 3] <= 0) { // (完全透明な画素)
        imgd.data[base + 0] = 0;
        imgd.data[base + 1] = 0;
        imgd.data[base + 2] = 0;
      } else {    // (完全透明ではない画素)
        imgd.data[base + 3] = new_alpha;
      }
    }
  }

  // 再描画
  ctx.putImageData(imgd, 0, 0);
}

/// レイヤー1枚を透明にする。
export function erase_single_layer(canvas) {
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/// レイヤーに、合成操作'source-over'で画像データをputする。
export function putImageDataEx(src_imgd, context, sx, sy) {
  const w = src_imgd.width;
  const h = src_imgd.height;

  // 描画先画像データ取得
  // 矩形領域(sx, sy, w, h)が画像外にはみ出していてもクリッピングは不要。
  // HTML5 canvas 2D contextの仕様
  // https://www.w3.org/TR/2dcontext/
  // の「14 Pixel manipulation」によると、getImageData()での画像データ主得時、
  // 画像からはみ出した範囲は「透明な黒」で埋められたデータが返される。
  let dst_imgd = context.getImageData(sx, sy, w, h);

  // ソース画像データsrc_imgdの不透明画素のみをcanvasのデータに反映
  for (let py = 0; py < h; ++py) {
    let head = py * 4 * w;
    for (let px = 0; px < w; ++px) {
      let base = head + px * 4;
      if (src_imgd.data[base + 3] > 0) {
        dst_imgd.data[base + 0] = src_imgd.data[base + 0];
        dst_imgd.data[base + 1] = src_imgd.data[base + 1];
        dst_imgd.data[base + 2] = src_imgd.data[base + 2];
        dst_imgd.data[base + 3] = src_imgd.data[base + 3];
      }
    }
  }

  // 再描画
  context.putImageData(dst_imgd, sx, sy);
}

//
//  マルチレイヤー操作
//

/// キャンバスを全消去する。
export function erase_canvas(
  layers      // : canvas[]; [ref] レイヤー ([0]が最も奥と想定)
) {
  for (let i = 0; i < layers.length; ++i) {
    let ctx = layers[i].getContext('2d');
    ctx.clearRect(0, 0, layers[i].width, layers[i].height);
  }
}

/// レイヤーをコピーする。
export function copy_layer(src_canvas, dst_canvas) {
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
export function get_destinaton_out_image(src_canvas, dst_canvas) {
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
      if (A1 == 255) {
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
export function get_mask_image(src_canvas, color, dst_canvas) {
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
      let bMatched = (A1 == 255 && (R1 == colors[0] && G1 == colors[1] && B1 == colors[2]));
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
export function fix_image_w_mask(src_canvas, mask_canvas, bInv, dst_canvas) {
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
      let bMatched = (A_mask == 255);   // (マスク画素)
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
export function get_joint_image(
  layers,       // : canvas[];  [in]  レイヤー([0]が最も奥と想定)
  dst_canvas    // : canvas;    [out] canvas: 合成画像出力先キャンバス
) {
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
