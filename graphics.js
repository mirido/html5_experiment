// Copyright (c) 2016, mirido
// All rights reserved.

'use strict'

//
//	プリレンダリング
//

/// 大きさを持った画素をプリレンダリングする。
/// diameterが画素の大きさにあたる。
/// 通常はha = Math.ceil(diameter / 2 + マージン)とする。
function pre_render_pixel(ha, diameter, color, bFilled)
{
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
function pre_render_square(ha, diameter, color, bFilled)
{
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
function put_point(px, py, ha, pre_rendered, context)
{
	context.drawImage(pre_rendered, px - ha, py - ha);
}

/// 1 pxの点を打つ。
function put_point_1px(px, py, context)
{
	context.fillRect(px, py, 1, 1);
}

/// プレゼンハムのアルゴリズムで直線を描画する。(Pre-rendering前提)
function draw_line(x0, y0, x1, y1, ha, pre_rendered, context)
{
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
			context.drawImage(pre_rendered, y - ha, x - ha);
		} else {
			// plot(x, y);
			context.drawImage(pre_rendered, x - ha, y - ha);
		}
		error -= deltay;
		if (error < 0) {
			y += ystep;
			error += deltax;
		}
	}
}

/// プレゼンハムのアルゴリズムで直線を描画する。(実行時render指定)
function draw_line_w_runtime_renderer(x0, y0, x1, y1, run_time_renderer, context)
{
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
			run_time_renderer(y, x, context);
		} else {
			// plot(x, y);
			run_time_renderer(x, y, context);
		}
		error -= deltay;
		if (error < 0) {
			y += ystep;
			error += deltax;
		}
	}
}

/// プレゼンハムのアルゴリズムで1画素幅の直線を描画する。
function draw_line_1px(x0, y0, x1, y1, context)
{
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
function draw_rect(x0, y0, x1, y1, context)
{
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
function draw_rect_R(rect, context)
{
	draw_rect(
		rect.x, rect.y,
		rect.x + rect.width - 1, rect.y + rect.height - 1,
		context
	);
}

/// 円を描画する。
/// 低速なので呼び出し頻度を極力下げること。
function draw_circle(cx, cy, radius, context, bFilled)
{
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
function FloodFillState(canvas, px, py, color)
{
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
FloodFillState.prototype.isBorder = function(px, imgd)
{
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
FloodFillState.prototype.fillLine = function(px, py)
{
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
FloodFillState.prototype.fill = function()
{
	console.log("stack_size=" + this.m_stack.length);
	while (this.m_stack.length > 0) {
		let point = this.m_stack.pop();
		// console.log("point=(" + point.x + "," + point.y + ")");
		this.fillLine(point.x, point.y);
	}
}
