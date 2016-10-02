'use strict'

/// プレゼンハムのアルゴリズムで直線を描画する。
function draw_line(x0, y0, x1, y1, context, thickness)
{
	var tmp;

	if (!thickness)
		thickness = 1;
	var r = thickness / 2;
	var d = thickness;

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
			context.fillRect(y - r, x - r, d, d);
		} else {
			// plot(x, y);
			context.fillRect(x - r, y - r, d, d);
		}
		error -= deltay;
		if (error < 0) {
			y += ystep;
			error += deltax;
		}
	}
}

/// 塗り潰し無しの矩形を描画する。
function draw_rect(x0, y0, x1, y1, context, thickness)
{
	draw_line(x0, y0, x1, y0, context, thickness);
	draw_line(x0, y0, x0, y1, context, thickness);
	draw_line(x1, y0, x1, y1, context, thickness);
	draw_line(x0, y1, x1, y1, context, thickness);
}

/// 塗り潰し無しの矩形を描画する。
function draw_rect_R(x0, y0, width, height, context, thickness)
{
	draw_rect(x0, y0, x0 + width - 1, y0 + height - 1, context, thickness);
}
