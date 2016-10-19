// Copyright (c) 2016, mirido
// All rights reserved.

'use strict';

/// Immutableな座標のコンストラクタ。
function jsPoint(x, y)
{
	return { x: x, y: y };
}

/// Immutableな矩形のコンストラクタ。
function jsRect(x, y, width, height)
{
	return { x: x, y: y, width: width, height: height };
}

/// Mutableな座標のコンストラクタ。
function JsPoint(x, y)
{
	this.x = x;
	this.y = y;
}

/// Mutableな座標のコンストラクタ。
function JsRect(x, y, width, height)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

/// 矩形をデコードする。
function decode_rect(rect, coords)
{
	coords[0] = rect.x;
	coords[1] = rect.y;
	coords[2] = rect.x + rect.width;
	coords[3] = rect.y + rect.height;
}

/// 矩形にエンコードする。
function encode_rect(coords)
{
	let rect = jsRect(
		coords[0],
		coords[1],
		coords[2] - coords[0] + 1,
		coords[3] - coords[1] + 1
	);
	return rect;
}

/// 矩形にエンコードする。(in-place)
function encode_rect_in_place(coords, rect)
{
	rect.x = coords[0];
	rect.y = coords[1];
	rect.width  = coords[2] - coords[0] + 1;
	rect.height = coords[3] - coords[1] + 1;
}

/// 座標列を画像内にクリップする。
function clip_coords(width, height, coords)
{
	assert(coords.length % 2 == 0);
	for (let i = 0; i < coords.length; i += 2) {
		let px = coords[i];
		let py = coords[i + 1];
		if (px < 0) {
			px = 0;
		} else if (px >= width) {
			px = width - 1;
		}
		if (py < 0) {
			py = 0;
		} else if (py >= height) {
			py = height - 1;
		}
		coords[i] = px;
		coords[i + 1] = py;
	}
}

/// 矩形を座標内にクリップする。
function clip_rect_in_place(width, height, rect)
{
	let coords = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	encode_rect_in_place(coords, rect);
}

/// 矩形を座標内にクリップする。
function clip_rect(rect, width, height)
{
	let coords = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	return encode_rect(coords);
}

/// 点列を包含する矩形を取得する。
function get_outbounds(points, margin)
{
	if (points.length <= 0) {
		return null;
	}
	let sx = points[0].x;
	let sy = points[0].y;
	let lx = sx;
	let ly = sy;
  for (let i = 1; i < points.length; ++i) {
    sx = Math.min(sx, points[i].x);
    sy = Math.min(sy, points[i].y);
    lx = Math.max(lx, points[i].x);
    ly = Math.max(ly, points[i].y);
  }
  sx -= margin;
  sy -= margin;
  lx += margin;
  ly += margin;
  let bounds = new JsRect(sx, sy, lx - sx + 1, ly - sy + 1);
	return bounds;
}

/// 矩形の共通部分を取得する。
function get_common_rect(rectA, rectB)
{
	let sx = Math.max(rectA.x, rectB.x);
	let sy = Math.max(rectA.y, rectB.y);
	let ex = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
	let ey = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
	return new JsRect(sx, sy, ex - sx, ey - sy);
}

/// 2点間のチェビシェフ距離を求める。
function get_chv_dist(pt1, pt2)
{
	return Math.max(Math.abs(pt1.x - pt2.x), Math.abs(pt1.y - pt2.y));
}

/// 2点間のマンハッタン距離を求める。
function get_mht_dist(pt1, pt2)
{
	return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}

/// 点が矩形に含まれるか判定する。
function rect_includes(rect, point)
{
	return (
		   (rect.x <= point.x && point.x < rect.x + rect.width)
		&& (rect.y <= point.y && point.y < rect.y + rect.height)
		);
}

/// 矩形が共通部分を持つか否か判定する。
function rects_have_common(rect1, rect2)
{
	if (rect1.x + rect1.width <= rect2.x)
		return false;
	if (rect2.x + rect2.width <= rect1.x)
		return false;
	if (rect1.y + rect1.height <= rect2.y)
		return false;
	if (rect2.y + rect2.height <= rect1.y)
		return false;
	return true;
}

/// 2点間を結ぶ線分をROI端を結ぶ線分に拡張(or クリップ)する。
// TBD

/// 単体テスト。
