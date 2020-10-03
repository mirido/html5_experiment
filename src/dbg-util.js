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
// import {
// 	dump_event,
// 	assert,
// 	dbgv
// } from './dbg-util.js';
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
//	Debug util
//

/// イベントをダンプする。
export function dump_event(func, e) {
	console.log("<" + func + "()>");
	if (true) {
		console.log("sender: " + e.sender);
		console.log("client: (" + e.client.x + ", " + e.client.y + ")");
		console.log("parent: (" + e.parent.x + ", " + e.parent.y + ")");
		console.log(" local: (" + e.local.x + ", " + e.local.y + ")");
	} else {
		console.dir(e);		// お手軽だが表示内容を見るにはコンソールにて手動で展開せねばならない。
	}
}

/// Assert関数。下記より拝借。
/// http://stackoverflow.com/questions/15313418/javascript-assert
export function assert(condition, message) {
	if (!condition) {
		message = message || "Assertion failed";
		if (typeof Error !== "undefined") {
			throw new Error(message);
		}
		throw message; // Fallback
	}
}

/// 変数内容を簡単に確認するためのログ出力関数。
export function dbgv(vars) {
	let str_vars = '';
	for (let i = 0; i < vars.length; ++i) {
		if (i <= 0) {
			str_vars += '\"';
		} else {
			str_vars += ' + \", ';
		}
		str_vars += (vars[i] + '=\" + (' + vars[i] + ')');
	}
	let cmd = "console.log(" + str_vars + ");";
	return cmd;
}
