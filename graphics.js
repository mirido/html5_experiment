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

/// プレゼンハムのアルゴリズムで指定幅の直線を描画する。
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
	draw_line_1px(x0, y0, x0, y1, context);
	draw_line_1px(x1, y0, x1, y1, context);
	draw_line_1px(x0, y1, x1, y1, context);
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
