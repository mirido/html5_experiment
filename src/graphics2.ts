
// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IPoint } from './app-def';
import { assert } from './dbg-util';
import { jsPoint } from './geometry';
import { get_components_from_RGBx } from './ui-util';

'use strict'

//
//	塗り潰し
//

export class FloodFillState {
  m_canvas: HTMLCanvasElement;
  m_context: CanvasRenderingContext2D;
  m_nxtColors: number[];
  m_cursor: IPoint;
  m_curColors: Uint8ClampedArray;
  m_stack: IPoint[];

  /// 新しいインスタンスを初期化する。
  constructor(canvas: HTMLCanvasElement, px: number, py: number, color: string) {
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
    const imgd_sta = this.m_context.getImageData(px, py, 1, 1);
    assert(imgd_sta.data.length == 4);
    this.m_curColors = imgd_sta.data;
    assert(this.m_curColors.length == 4);
    // console.dir(this.m_curColors);
    // console.dir(this.m_nxtColors);

    // 塗り替え開始ポイント設定
    this.m_stack = [];
    this.m_stack.push(jsPoint(px, py));
    for (let i = 0; i < 4; i++) {
      if (this.m_curColors[i] != this.m_nxtColors[i]) {
        return;		// 領域色と配置色が相違するならGO
      }
    }
    console.log("No area to paint.");
    this.m_stack = [];	// 領域色と配置色が同一ならNOGO (NOP)
  }

  /// 境界に達したか否か判定する。
  isBorder(px: number, imgd: ImageData): boolean {
    if (imgd == null) {
      return true;
    }
    const base = 4 * px;
    for (let i = 0; i < 4; i++) {
      const cc = imgd.data[base + i];
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
  fillLine(px: number, py: number): void {
    // 画像上端/下端に達していないか確認
    if (py < 0 || py >= this.m_canvas.height) {
      return;
    }

    // 対象ラインの画素データ取得
    const imgd_tg = this.m_context.getImageData(0, py, this.m_canvas.width, 1);

    // 塗り潰し済みでないか確認
    if (this.isBorder(px, imgd_tg))
      return;

    // 左端に移動
    while (px >= 0 && !this.isBorder(px, imgd_tg)) {
      px--;
    }

    // 直上の画素データ取得
    const imgd_up = (py > 0)
      ? this.m_context.getImageData(0, py - 1, this.m_canvas.width, 1)
      : null;

    // 直下の画素データ取得
    const imgd_lo = (py < this.m_canvas.height - 1)
      ? this.m_context.getImageData(0, py + 1, this.m_canvas.width, 1)
      : null;

    // 塗り潰し範囲決定 & 次の塗り潰し開始位置をスタックにpush
    let prev_up = true;
    let prev_lo = true;
    const px_bgn = px++;
    while (px < this.m_canvas.width && !this.isBorder(px, imgd_tg)) {
      // 直上の画素を確認
      const cur_up = this.isBorder(px, imgd_up);
      if (cur_up != prev_up) {
        if (!cur_up) {
          this.m_stack.push(jsPoint(px, py - 1));
        }
        prev_up = cur_up;
      }

      // 直下の画素を確認
      const cur_lo = this.isBorder(px, imgd_lo);
      if (cur_lo != prev_lo) {
        if (!cur_lo) {
          this.m_stack.push(jsPoint(px, py + 1));
        }
        prev_lo = cur_lo;
      }

      const base = 4 * px;
      imgd_tg.data[base + 0] = this.m_nxtColors[0];
      imgd_tg.data[base + 1] = this.m_nxtColors[1];
      imgd_tg.data[base + 2] = this.m_nxtColors[2];
      imgd_tg.data[base + 3] = this.m_nxtColors[3];

      px++;
    }

    // 現ライン塗り潰し
    assert(px - px_bgn > 0);
    this.m_context.putImageData(imgd_tg, 0, py);
  }

  /// 1ライン塗り潰す。
  fill(): void {
    console.log("stack_size=" + this.m_stack.length);
    while (this.m_stack.length > 0) {
      const point = this.m_stack.pop();
      // console.log("point=(" + point.x + "," + point.y + ")");
      this.fillLine(point.x, point.y);
    }
  }
}

//
//	網点生成
//

/// 水平または斜め1行毎のランレングスのヒストグラムを取得する。
export function get_max_run_len_histogram(
  ptn: boolean[], cyc: number, vy: number, background: boolean
): { [key: number]: number } {
  const pixelFunc = function (px: number, py: number) {
    assert(px >= 0 && py >= 0);
    px %= cyc;
    py %= cyc;
    const idx = cyc * py + px;
    return ptn[idx];
  };

  let histogram: { [key: number]: number } = {};
  for (let py = 0; py < cyc; py++) {
    let T = 0;
    let bChanged = false;
    let run_val = null;
    for (let px = 0; ; px++) {
      const val = pixelFunc(px, py);
      if (!bChanged) {		// (変化点発見前)
        if (run_val == null) {
          run_val = val;
        } else if (val != run_val) {		// (変化点発見)
          T = 1;
          run_val = val;
          bChanged = true;
        } else {
          if (px >= cyc - 1) {		// (変化点発見の見込み無し)
            const run_len = cyc;
            if (run_val == background) {
              if (!(run_len in histogram)) {
                histogram[run_len] = 1;
              } else {
                histogram[run_len]++;
              }
            }
            break;
          }
        }
      } else {		// (変化点発見後)
        let run_len = null;
        const bInBackground = (run_val == background);
        if (val == run_val) {
          if (T < cyc) {
            T++;
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
              histogram[run_len]++;
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
export function get_halftone_definition(
  ptn: boolean[], cyc: number, fAlpha: number
): number {
  // ランレングスのヒストグラム取得
  const background = (fAlpha > 0.5);
  const run_len_histo_h0 = get_max_run_len_histogram(ptn, cyc, 0, background);

  // 数値化
  let definition = 0;
  assert(!(0 in run_len_histo_h0));
  for (let i = 1; i <= cyc; i++) {
    const m = cyc * Math.floor(cyc / i);
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

export interface DefinitioInfo {
  m_fAlpha: number;
  m_definition: number;
  m_ptn: boolean[];
};

/// 網点のリストを生成する。
export function gen_halftones(ha: number): DefinitioInfo[] {
  const nbits = ((ha + 1) * (ha + 2)) / 2;
  const N = 1 << nbits;

  const fa = 2 * ha + 1;
  const cyc = fa - 1;
  const plotFunc = function (px: number, py: number, value: boolean, buf: boolean[]) {
    if (py < cyc && px < cyc) {
      const idx = cyc * py + px;
      buf[idx] = value;
    }
  };

  let ptnList = [];
  for (let i = 0; i < N; i++) {
    // iを種として8方向対称パターンを生成
    let ptn: boolean[] = [];
    for (let py = 0; py < cyc; py++) {
      for (let px = 0; px < cyc; px++) {
        plotFunc(px, py, false, ptn);
      }
    }
    let m = 0x1;
    for (let py = 0; py <= ha; py++) {
      for (let px = 0; px <= py; px++) {
        // console.log("*** px=" + px + ", py=" + py);
        // const i = 0x2ad;		// Test. 市松模様1
        // const i = 0x152;		// Test. 市松模様2
        // const i = 0x20d;		// Test. 市松模様2 (run length=5)
        // const i = 0x3ff;		// Test. (run length=6)
        // const i = 0x01b;		// Test.
        // const i = 0x10;		// Test.
        const bDot = ((i & m) != 0);
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
    for (let py = 0; py < cyc; py++) {
      for (let px = 0; px < cyc; px++) {
        const idx = cyc * py + px;
        if (ptn[idx]) {
          cnt++;
        }
      }
    }
    const fAlpha = cnt / (cyc * cyc);
    // const fAlpha = Math.floor((255 * cnt) / (cyc * cyc));

    // パターンの精細度を計算
    const definition = get_halftone_definition(ptn, cyc, fAlpha);
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
