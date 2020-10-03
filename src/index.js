// Copyright (c) 2016, mirido
// All rights reserved.

// 以下の特殊コメントはTypescriptでないと機能しない。
/// <reference path="_doc/utest.js" />
/// <reference path="dbg-util.js" />
/// <reference path="imaging.js" />
/// <reference path="geometry.js" />
/// <reference path="graphics.js" />
/// <reference path="ui-util.js" />
/// <reference path="ui-element.js" />
/// <reference path="picture-canvas.js" />
/// <reference path="oebi-tool.js" />
/// <reference path="tool-palette.js" />

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
	getBoundingClientRectWrp,
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
	SpKey,
	KeyStateManager,
	draw_icon_face,
	borderColor,
	activeIconColors,
	inactiveIconColors,
	textColor,
	textCharWidth,
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
	LayerTool,
	generateTool
} from './oebi-tool.js';
import {
	ToolType,
	CommonSetting,
	ToolChain,
	addToolHelper,
	ToolPalette
} from './tool-palette.js';

// import {
// 	g_pointManager,
// 	g_keyStateManager,
// 	g_pictureCanvas,
// 	g_toolPalette,
// 	g_paintTool,
// 	g_history,
// 	g_UndoButton
// } from './index.js';

'use strict';

console.log("index.js starts.");

// ポインタ状態管理
export let g_pointManager;

// キー入力管理
export let g_keyStateManager;

// 描画キャンバス
export let g_pictureCanvas;

// ツールパレット
export let g_toolPalette;

// 塗り潰しツール
export let g_paintTool;

// 操作履歴
export let g_history;			// (Undo/Rdo)

// 「元に戻す」ボタン
export let g_UndoButton;		// (Undo/Rdo)

// 「やり直し」ボタン
export let g_RedoButton;		// (Undo/Rdo)

// イベントハンドラ登録
window.onload = init_wnd;
window.onclose = dispose_wnd;

/// ページのロード完了時に呼ばれる。
function init_wnd() {
	console.log("init() called.");

	// インスタンス生成
	g_pointManager = new PointManager();
	g_keyStateManager = new KeyStateManager();
	g_pictureCanvas = new PictureCanvas();
	g_toolPalette = new ToolPalette(g_pictureCanvas);
	g_paintTool = new PaintTool(g_toolPalette);

	// 操作履歴追加(Undo/Redo)
	g_history = new History(g_toolPalette, g_pictureCanvas);
	g_pictureCanvas.attatchHistory(g_history);
	g_toolPalette.attatchHistory(g_history);

	// 「元に戻す」/「やり直し」ボタン
	g_UndoButton = new UndoButton(g_history);
	g_RedoButton = new RedoButton(g_history);

	// キャンバスを白色でfill
	g_pictureCanvas.eraseCanvas();

	// 図形描画
	sample01(
		g_pictureCanvas.getLayer(1),
		g_pictureCanvas.getLayer(0)
	);

	// utest_ImagePatch();		// UTEST
	// utesst_ColorConversion();		// UTEST
	// utest_canvas_2d_context(g_pictureCanvas.getLayer(0));	// UTEST
	// utest_get_mask_image();		// UTEST
	// utest_half_tone();		// UTEST

	// 画像合成
	let joint_canvas = document.getElementById("joint_canvas");
	g_pictureCanvas.getJointImage(joint_canvas);

	// キャンバス状態を記憶(Undo/Redo)
	// この時点のキャンバス状態がundo/redoの起点となる。
	g_history.attatchImage();
}

/// ウィンドウが閉じるとき呼ばれる。
function dispose_wnd() {
	g_pointManager.dispose();
	g_pointManager = null;
	g_keyStateManager.dispose();
	g_keyStateManager = null;
	// TBD
}

//
//  マルチレイヤーサンプル
//

function sample01(layer1, layer2) {
	var ctx = layer1.getContext('2d');
	/* 半透明度を指定 */
	// ctx.globalAlpha = 0.5;
	/* 円 #1 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(192, 80, 77)'; // 赤
	ctx.arc(70, 45, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* 円 #2 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(155, 187, 89)'; // 緑
	ctx.arc(45, 95, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* 円 #3 */
	ctx.beginPath();
	ctx.fillStyle = 'rgb(128, 100, 162)'; // 紫
	ctx.arc(95, 95, 35, 0, Math.PI * 2, false);
	ctx.fill();
	/* canvasに描いた図形から中心部分のイメージを抜き出す */
	var image = ctx.getImageData(45, 45, 50, 50);

	/* 別のlayerの左上に抜き出したイメージを貼り付ける */
	var ctx2 = layer2.getContext('2d');
	ctx2.fillStyle = "black";
	ctx2.fillRect(0, 0, 140, 140);
	ctx2.putImageData(image, 10, 10);

	// draw_circle()のテスト
	ctx.fillStyle = 'rgb(0, 0, 0)';
	// ctx.globalAlpha = 1.0;
	draw_circle(200, 200, 100, ctx, false);
	draw_circle(200, 200, 30, ctx, false);
	draw_circle(200, 200, 19, ctx, false);
	draw_circle(200, 200, 10, ctx, false);
	ctx.fillRect(150, 150, 50, 50);
}
