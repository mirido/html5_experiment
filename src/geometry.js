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
// import {
// 	jsPoint,
// 	jsRect,
// 	JsPoint,
// 	JsRect,
// 	decode_rect,
// 	encode_to_rect,
// 	encode_to_rect_in_place,
// 	clip_coords,
// 	clip_rect_in_place,
// 	clip_rect,
// 	get_outbounds,
// 	get_common_rect,
// 	get_chv_dist,
// 	get_mht_dist,
// 	rect_includes,
// 	rects_have_common
// } from './geometry.js';
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

/// Immutableな座標のコンストラクタ。
export function jsPoint(x, y) {
	return { x: x, y: y };
}

/// Immutableな矩形のコンストラクタ。
export function jsRect(x, y, width, height) {
	return { x: x, y: y, width: width, height: height };
}

/// Mutableな座標のコンストラクタ。
export function JsPoint(x, y) {
	this.x = x;
	this.y = y;
}

/// Mutableな座標のコンストラクタ。
export function JsRect(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

/// 矩形をデコードする。
export function decode_rect(rect, coords) {
	coords[0] = rect.x;
	coords[1] = rect.y;
	coords[2] = rect.x + rect.width;
	coords[3] = rect.y + rect.height;
}

/// 矩形にエンコードする。
export function encode_to_rect(px1, py1, px2, py2) {
	if (px1 > px2) {
		let tmp = px1; px1 = px2; px2 = tmp;
	}
	if (py1 > py2) {
		let tmp = py1; py1 = py2; py2 = tmp;
	}
	let w = px2 - px1 + 1;
	let h = py2 - py1 + 1;
	let rect = jsRect(px1, py1, w, h);
	return rect;
}

/// 矩形にエンコードする。(in-place)
export function encode_to_rect_in_place(px1, py1, px2, py2, rect) {
	if (px1 > px2) {
		let tmp = px1; px1 = px2; px2 = tmp;
	}
	if (py1 > py2) {
		let tmp = py1; py1 = py2; py2 = tmp;
	}
	let w = px2 - px1 + 1;
	let h = py2 - py1 + 1;
	rect.x = px1;
	rect.y = py1;
	rect.width = w;
	rect.height = h;
}

/// 座標列を画像内にクリップする。
export function clip_coords(width, height, coords) {
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
export function clip_rect_in_place(width, height, rect) {
	let coords = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	encode_to_rect_in_place(coords[0], coords[1], coords[2], coords[3], rect);
}

/// 矩形を座標内にクリップする。
export function clip_rect(rect, width, height) {
	let coords = [];
	decode_rect(rect, coords);
	clip_coords(width, height, coords);
	return encode_to_rect(coords[0], coords[1], coords[2], coords[3]);
}

/// 点列を包含する矩形を取得する。
export function get_outbounds(points, margin) {
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
export function get_common_rect(rectA, rectB) {
	let sx = Math.max(rectA.x, rectB.x);
	let sy = Math.max(rectA.y, rectB.y);
	let ex = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
	let ey = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
	return new JsRect(sx, sy, ex - sx, ey - sy);
}

/// 2点間のチェビシェフ距離を求める。
export function get_chv_dist(pt1, pt2) {
	return Math.max(Math.abs(pt1.x - pt2.x), Math.abs(pt1.y - pt2.y));
}

/// 2点間のマンハッタン距離を求める。
export function get_mht_dist(pt1, pt2) {
	return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}

/// 点が矩形に含まれるか判定する。
export function rect_includes(rect, point) {
	return (
		(rect.x <= point.x && point.x < rect.x + rect.width)
		&& (rect.y <= point.y && point.y < rect.y + rect.height)
	);
}

/// 矩形が共通部分を持つか否か判定する。
export function rects_have_common(rect1, rect2) {
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
