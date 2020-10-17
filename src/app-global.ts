// Copyright (c) 2016-2020, mirido
// All rights reserved.

'use strict';

import { PaintTool } from './oebi-tool';
import { PictureCanvas } from './picture-canvas';
import { ToolPalette } from './tool-palette';
import { RedoButton, UIOpHistory, UndoButton } from './ui-element';
import { KeyStateManager, PointManager } from './ui-util';

export let g_pointManager: PointManager;        // ui-utils
export let g_keyStateManager: KeyStateManager;  // ui-utils
export let g_pictureCanvas: PictureCanvas;      // picture-canvas
export let g_toolPalette: ToolPalette;          // tool-palette
export let g_paintTool: PaintTool;              // oebi-tools
export let g_history: UIOpHistory;              // ui-element
export let g_UndoButton: UndoButton;            // ui-element
export let g_RedoButton: RedoButton;            // ui-element

export function onInitialize(): void {
    // インスタンス生成
    g_pointManager = new PointManager();
    g_keyStateManager = new KeyStateManager();
    g_pictureCanvas = new PictureCanvas();
    g_toolPalette = new ToolPalette(g_pictureCanvas);
    g_paintTool = new PaintTool(g_toolPalette);

    // 操作履歴追加(Undo/Redo)
    g_history = new UIOpHistory(g_toolPalette, g_pictureCanvas);
    g_pictureCanvas.attatchHistory(g_history);
    g_toolPalette.attatchHistory(g_history);

    // 「元に戻す」/「やり直し」ボタン
    g_UndoButton = new UndoButton(g_history);
    g_RedoButton = new RedoButton(g_history);
}

export function onDispose(): void {
    g_pointManager.dispose();
    g_pointManager = null;
    g_keyStateManager.dispose();
    g_keyStateManager = null;
}
