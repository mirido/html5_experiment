// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IPoint, IRect } from './app-def';
import { assert } from './dbg-util';

'use strict';

//
//	Operation for rectangle
//

/// 矩形をデコードする。
export function decode_rect<T extends IRect>(rect: T, coords: number[]): void {
	coords[0] = rect.x;
	coords[1] = rect.y;
	coords[2] = rect.x + rect.width;
	coords[3] = rect.y + rect.height;
}

/// 矩形にエンコードする。
export function encode_to_rect<T extends IRect>(
	ctor: { new(x: number, y: number, width: number, height: number): T; },
	px1: number, py1: number, px2: number, py2: number
): T {
	if (px1 > px2) {
		// eslint-disable-next-line no-param-reassign
		const tmp = px1; px1 = px2; px2 = tmp;
	}
	if (py1 > py2) {
		// eslint-disable-next-line no-param-reassign
		const tmp = py1; py1 = py2; py2 = tmp;
	}
	const w = px2 - px1 + 1;
	const h = py2 - py1 + 1;
	const rect: T = new ctor(px1, py1, w, h);
	return rect;
}

/// 矩形にエンコードする。(in-place)
export function encode_to_rect_in_place<T extends IRect>(
	px1: number, py1: number, px2: number, py2: number, rect: T
): void {
	if (px1 > px2) {
		// eslint-disable-next-line no-param-reassign
		const tmp = px1; px1 = px2; px2 = tmp;
	}
	if (py1 > py2) {
		// eslint-disable-next-line no-param-reassign
		const tmp = py1; py1 = py2; py2 = tmp;
	}
	const w = px2 - px1 + 1;
	const h = py2 - py1 + 1;
	rect.x = px1;
	rect.y = py1;
	rect.width = w;
	rect.height = h;
}

/// 座標列を画像内にクリップする。
export function clip_coords(
	width: number, height: number, coords: number[]): void {
	assert(coords.length % 2 == 0, "*** ERR ***");
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
export function clip_rect_in_place<T extends IRect>(
	width: number, height: number, rect: T
): void {
	const coords: number[] = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	encode_to_rect_in_place(coords[0], coords[1], coords[2], coords[3], rect);
}

/// 矩形を座標内にクリップする。
export function clip_rect<T extends IRect>(
	ctor: { new(x: number, y: number, width: number, height: number): T; },
	rect: T, width: number, height: number
): T {
	const coords: number[] = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	return encode_to_rect(ctor, coords[0], coords[1], coords[2], coords[3]);
}

/// 矩形の共通部分を取得する。
export function get_common_rect<T extends IRect>(
	ctor: { new(x: number, y: number, width: number, height: number): T; },
	rectA: T, rectB: T
): T {
	const sx = Math.max(rectA.x, rectB.x);
	const sy = Math.max(rectA.y, rectB.y);
	const ex = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
	const ey = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
	return new ctor(sx, sy, ex - sx, ey - sy);
}

/// 矩形が共通部分を持つか否か判定する。
export function rects_have_common<T extends IRect>(rect1: T, rect2: T): boolean {
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

//
//	Rectangle v.s. point
//

/// 点列を包含する矩形を取得する。
export function get_outbounds<T extends IRect, U extends IPoint>(
	ctor: { new(x: number, y: number, width: number, height: number): T; },
	points: U[], margin: number
): T {
	if (points.length <= 0) {
		return null;
	}
	let sx = points[0].x;
	let sy = points[0].y;
	let lx = sx;
	let ly = sy;
	for (let i = 1; i < points.length; i++) {
		sx = Math.min(sx, points[i].x);
		sy = Math.min(sy, points[i].y);
		lx = Math.max(lx, points[i].x);
		ly = Math.max(ly, points[i].y);
	}
	sx -= margin;
	sy -= margin;
	lx += margin;
	ly += margin;
	const bounds = new ctor(sx, sy, lx - sx + 1, ly - sy + 1);
	return bounds;
}

/// 点が矩形に含まれるか判定する。
export function rect_includes<T extends IRect, U extends IPoint>(
	rect: T, point: U
): boolean {
	return (
		(rect.x <= point.x && point.x < rect.x + rect.width)
		&& (rect.y <= point.y && point.y < rect.y + rect.height)
	);
}

//
//	Distance
//

/// 2点間のチェビシェフ距離を求める。
export function get_chv_dist<T extends IPoint>(pt1: T, pt2: T): number {
	return Math.max(Math.abs(pt1.x - pt2.x), Math.abs(pt1.y - pt2.y));
}

/// 2点間のマンハッタン距離を求める。
export function get_mht_dist<T extends IPoint>(pt1: T, pt2: T): number {
	return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}

//
//	Immutable shape
//

/// Immutable point
export function jsPoint(par_x: number, par_y: number): IPoint {
	return { x: par_x, y: par_y }
}

/// Immutable rectangle
export function jsRect(
	par_x: number,
	par_y: number,
	par_width: number,
	par_height: number
): IRect {
	return {
		x: par_x,
		y: par_y,
		width: par_width,
		height: par_height
	};
}

//
//	Mutable shape
//

/// Mutable point
export class JsPoint {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}

/// Mutable rectangle
export class JsRect {
	x: number;
	y: number;
	width: number;
	height: number;
	constructor(x: number, y: number, width: number, height: number) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}
