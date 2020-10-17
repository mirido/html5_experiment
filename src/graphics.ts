// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IPlotFunc, IRect } from './app-def';
import { assert } from './dbg-util';

'use strict'

//
//	プリレンダリング
//

/// 大きさを持った画素をプリレンダリングする。
/// diameterが画素の大きさにあたる。
/// 通常はha = Math.ceil(diameter / 2 + マージン)とする。
export function pre_render_pixel(ha: number, diameter: number, color: string, bFilled: boolean): HTMLCanvasElement {
  // pre-rendering用キャンバス生成
  const mini_canvas = document.createElement('canvas');
  mini_canvas.width = 2 * ha + 1;
  mini_canvas.height = 2 * ha + 1;

  // アンチエリアシング対策
  const radius = diameter / 2;
  const px = ha;

  // 描画
  const context = mini_canvas.getContext('2d');
  context.fillStyle = color;
  context.strokeStyle = color;
  draw_circle(px, px, radius, context, bFilled);

  return mini_canvas;
}

/// 大きさを持った正方形をプリレンダリングする。
/// diameterが画素の大きさ(矩形の幅)にあたる。
/// 通常はha = Math.ceil(diameter / 2 + マージン)とする。
export function pre_render_square(ha: number, diameter: number, color: string, bFilled: boolean): HTMLCanvasElement {
  // pre-rendering用キャンバス生成
  const mini_canvas = document.createElement('canvas');
  mini_canvas.width = 2 * ha + 1;
  mini_canvas.height = 2 * ha + 1;

  // アンチエリアシング対策
  const radius = diameter / 2;
  const px = ha;

  // 描画
  const context = mini_canvas.getContext('2d');
  context.fillStyle = color;
  context.strokeStyle = color;
  const sx = Math.floor(px - radius);
  const lx = Math.ceil(px + radius);
  if (bFilled) {
    const d = lx - sx + 1;
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
export function put_point(
  px: number,
  py: number,
  ha: number,
  pre_rendered: ImageBitmap,
  context: CanvasRenderingContext2D
) {
  context.drawImage(pre_rendered, px - ha, py - ha);
}

/// 1 pxの点を打つ。
export function put_point_1px(
  px: number,
  py: number,
  context: CanvasRenderingContext2D
) {
  context.fillRect(px, py, 1, 1);
}

/// プレゼンハムのアルゴリズムで直線を描画する。(Plot関数指定)
export function draw_line_w_plot_func(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plotFunc: IPlotFunc,
  context: CanvasRenderingContext2D
) {
  let tmp;

  let bSteep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
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
  let deltax = x1 - x0
  let deltay = Math.abs(y1 - y0)
  let error = Math.floor(deltax / 2.0);
  let ystep
  let y = y0
  if (y0 < y1) {
    ystep = 1;
  } else {
    ystep = -1;
  }
  for (let x = x0; x <= x1; x++) {
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
export function draw_line(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ha: number,
  pre_rendered: ImageBitmap,
  context: CanvasRenderingContext2D
) {
  const plotFunc: IPlotFunc = function (x, y, context) {
    context.drawImage(pre_rendered, x - ha, y - ha);
  };
  draw_line_w_plot_func(x0, y0, x1, y1, plotFunc, context);
}

/// 直線を描画する。(実行時render指定)
export function draw_line_w_runtime_renderer(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  run_time_renderer: IPlotFunc,
  context: CanvasRenderingContext2D
) {
  draw_line_w_plot_func(x0, y0, x1, y1, run_time_renderer, context);
}

/// プレゼンハムのアルゴリズムで1画素幅の直線を描画する。
export function draw_line_1px(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  context: CanvasRenderingContext2D
) {
  let tmp;

  let bSteep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
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
  let deltax = x1 - x0
  let deltay = Math.abs(y1 - y0)
  let error = Math.floor(deltax / 2.0);
  let ystep
  let y = y0
  if (y0 < y1) {
    ystep = 1;
  } else {
    ystep = -1;
  }
  for (let x = x0; x <= x1; x++) {
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
export function draw_rect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  context: CanvasRenderingContext2D
) {
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
export function draw_rect_R<T extends IRect>(rect: T, context: CanvasRenderingContext2D) {
  draw_rect(
    rect.x, rect.y,
    rect.x + rect.width - 1, rect.y + rect.height - 1,
    context
  );
}

/// 円を描画する。
/// 低速なので呼び出し頻度を極力下げること。
export function draw_circle(
  cx: number,
  cy: number,
  radius: number,
  context: CanvasRenderingContext2D,
  bFilled: boolean
) {
  if (radius <= 0.5) {
    context.fillRect(Math.floor(cx), Math.floor(cy), 1, 1);
    return;
  }

  // 以下、Math.floor()とMath.ceil()の使い分けは、
  // (cx, cy)が整数座標である前提。
  // (cx, cy)が整数座標でない場合は、破綻はしないが円がやや歪になる恐れがある。
  const fr = radius;
  const frr = fr * fr;
  const r = Math.floor(fr);
  let prev_px1 = Math.round(cx - r);	// fr∈[1.0, 2.0)がcxの左隣
  let prev_px2 = Math.round(cx + r);	// fr∈[1.0, 2.0)がcxの右隣
  let prev_py1 = Math.round(cy);
  let prev_py2 = Math.round(cy);
  const dy_max = Math.ceil(r);
  for (let dy = (bFilled) ? 0 : 1; dy <= dy_max; dy++) {
    const fd = frr - dy * dy;
    if (fd < 0.0)
      break;
    const fdx = Math.sqrt(fd);
    const dx = Math.floor(fdx);
    const px1 = Math.round(cx - dx);
    const px2 = Math.round(cx + dx);
    const py1 = Math.round(cy - dy);
    const py2 = Math.round(cx + dy);
    if (bFilled) {
      const len = px2 - px1 + 1;
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
