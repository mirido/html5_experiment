// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IIconGraphicFunc, IRect, textColor } from './app-def';
import { assert, dbgv } from './dbg-util';
import { draw_line_1px } from './graphics';
import { FloodFillState } from './graphics2';
import {
    copy_layer, erase_single_layer,
    fix_image_w_mask, get_destinaton_out_image,
    get_mask_image
} from './imaging';
import { DrawingEvent, IDrawingEvent, PictureCanvas } from './picture-canvas';
import { CommonSetting, IToolUIEvent, ToolPalette, ToolType } from './tool-palette';
import {
    Cursor_Circle,
    Cursor_Square,
    DrawerBase,
    DrawOp_BoundingRect,
    DrawOp_FreeHand,
    DrawOp_Rectangle,
    DrawOp_RectCapture,
    Effect_Eraser,
    Effect_FlipRect,
    Effect_Pencil,
    Effect_PencilRect,
    Effect_RectEraser,
    Effect_RectPaste,
    ICursor, IDrawOp,
    IEffect,
    NullCursor, UIOpHistory
} from './ui-element';
import {
    draw_color_palette,
    draw_icon_ex,
    draw_icon_wrp,
    get_color_as_RGB,
    get_components_from_RGBx,
    IDrawCanvas,
    IDrawTool,
    ISettingChangeListenerObject, ListBox,
    MicroSlideBar,
    SpKey
} from './ui-util';
'use strict';

//
//  DrawToolBase
//

/// 新しいインスタンスを初期化する。
export class DrawToolBase implements IDrawTool, IDrawCanvas, ISettingChangeListenerObject {
    m_iconBounds: IRect;
    m_text: string;
    m_drawOp: IDrawOp;
    m_effect: IEffect;
    m_cursor: ICursor;
    m_drawerCore: DrawerBase;
    m_setting: CommonSetting;

    /// 新しいインスタンスを初期化する。
    constructor(
        iconBounds: IRect,
        text: string,
        drawOp?: IDrawOp,
        effect?: IEffect,
        cursor?: ICursor
    ) {
        this.m_iconBounds = iconBounds;
        this.m_text = text;

        if (drawOp != undefined && effect != undefined && cursor != undefined) {
            // 全引数指定された。
            this.ctor2(drawOp, effect, cursor);
        } else if (drawOp == undefined && effect == undefined && cursor == undefined) {
            // 省略可能引数が全て省略された。
            /*pass*/
        } else {
            // 省略可能引数が部分的に省略された。
            throw new Error("*** ERR ***");
        }

        this.m_setting = null;
    }

    /// 構築後の初期化を行う。
    ctor2(
        drawOp: IDrawOp,
        effect: IEffect,
        cursor: ICursor
    ): void {
        this.m_drawOp = drawOp;
        this.m_effect = effect;
        this.m_cursor = cursor;
        this.m_drawerCore = new DrawerBase(this.m_drawOp, this.m_effect, this.m_cursor);
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        const context = toolCanvas.getContext('2d');

        // 非選択時アイコン描画
        draw_icon_ex(this.m_iconBounds, this.m_text, null, false, context);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent) {
        // console.log("DrawerBase::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

        // 選択時アイコン描画
        draw_icon_wrp(this.m_iconBounds, this.m_text, null, true, e);

        // 共通設定オブジェクト記憶
        // this.m_setting = e.m_sender.getCommonSetting();
        this.m_setting = e.m_sender.getCommonSetting();

        // 描画ツール設定
        e.m_sender.addDrawer(this);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        // console.log("DrawerBase::OnDiselected() called. ");

        // OnDrawEnd()時のガイド表示(もしあれば)を消去
        this.m_drawerCore.restoreImageOnDrawEnd();

        // 描画ツール解除
        e.m_sender.removeDrawer(this);

        // 非選択時アイコン描画
        draw_icon_wrp(this.m_iconBounds, this.m_text, null, false, e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("DrawerBase::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        /*NOP*/
    }

    /// クリック終了またはドラッグ終了時に呼ばれる。
    OnPointingEnd(e: IToolUIEvent): void {
        /*pass*/
    }

    /// 設定が変更されたとき呼ばれる。
    OnSettingChanged(setting: CommonSetting): void {
        /*pass*/
    }

    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory): void {
        /*pass*/
    }

    /// 描画ストローク開始時に呼ばれる。(IDrawCanvas)
    OnDrawStart(e: IDrawingEvent): void {
        // console.log("DrawerBase.OnDrawStart() called.");

        // 最新の描画設定を反映
        const configClosure = this.m_effect.setParam(this.m_setting);
        assert(configClosure != null);    // (Undo/Redo)
        this.m_cursor.setParam(this.m_setting);

        // 操作履歴にエフェクト内容追記(Undo/Redo)
        let param3: (number | HTMLCanvasElement);
        if (this.m_effect.getMasterLayer != null) {
            // Ad-hoc; getMasterLayer()が返すレイヤーは一般にレイヤー番号を持たないため、
            // レイヤー番号の代わりにレイヤーへの参照そのものを記録する。
            param3 = this.m_effect.getMasterLayer(e);
        } else {
            param3 = e.m_sender.getCurLayerNo();
        }
        e.m_sender.appendEffect(this.m_effect, configClosure, param3);

        // DrawerBaseに委譲
        this.m_drawerCore.OnDrawStart(e);
    }

    /// 描画ストローク中に随時呼ばれる。(IDrawCanvas)
    OnDrawing(e: IDrawingEvent): void {
        // DrawerBaseに委譲
        this.m_drawerCore.OnDrawing(e);
    }

    /// 描画ストローク終了時に呼ばれる。(IDrawCanvas)
    OnDrawEnd(e: IDrawingEvent): void {
        // DrawerBaseに委譲
        this.m_drawerCore.OnDrawEnd(e);
    }

    /// レイヤー固定時に呼ばれる。(IDrawCanvas)
    OnLayerToBeFixed(canvas: PictureCanvas, layer: HTMLCanvasElement): void {
        /*pass*/
    }

    /// OnDrawEnd()時に描画したガイドを消す。
    restoreImageOnDrawEnd() {
        // DrawerBaseに委譲
        this.m_drawerCore.restoreImageOnDrawEnd();
    }
}

//
//  鉛筆ツール
//

export class PencilTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(
            iconBounds,
            '鉛筆',
            new DrawOp_FreeHand(),
            new Effect_Pencil(),
            new Cursor_Circle()
        );
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Pencil);
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Pencil);     /*** */
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  四角ツール
//

export class FillRectTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(
            iconBounds,
            '四角'
        );
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.ctor2(
            new DrawOp_Rectangle(setting, true),
            new Effect_PencilRect(true),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  線四角ツール
//

export class LineRectTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(iconBounds, '線四角');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.ctor2(
            new DrawOp_Rectangle(setting, false),
            new Effect_PencilRect(false),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  コピーツール
//

export class CopyTool extends DrawToolBase {
    m_captureOp: DrawOp_RectCapture;

    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(iconBounds, 'コピー');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        this.m_captureOp = new DrawOp_RectCapture(setting);
        super.ctor2(
            this.m_captureOp,
            new Effect_RectPaste(this.m_captureOp),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        e.m_sender.addHistoryRewindListener(this);    // (Undo/Redo)
        this.m_captureOp.resetCapture();
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
        e.m_sender.removeHistoryRewindListener(this);   // (Undo/Redo)
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }

    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory) {
        super.restoreImageOnDrawEnd();
        history.attachImage();
        this.m_captureOp.resetCapture();
    }
}

//
//  左右反転ツール
//

export class MirrorTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(iconBounds, '左右反転');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.ctor2(
            new DrawOp_BoundingRect(setting),
            new Effect_FlipRect(false),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  上下反転ツール
//

export class VertFlipTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(iconBounds, '上下反転');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.ctor2(
            new DrawOp_BoundingRect(setting),
            new Effect_FlipRect(true),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  消しペンツール
//

export class EraseTool extends DrawToolBase {
    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect) {
        super(
            iconBounds,
            '消しペン',
            new DrawOp_FreeHand(),
            new Effect_Eraser(),
            new Cursor_Square()
        );
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Eraser);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  消し四角ツール
//

/// 新しいインスタンスを初期化する。
export class EraseRectTool extends DrawToolBase {
    constructor(iconBounds: IRect) {
        super(iconBounds, '消し四角');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        super.ctor2(
            new DrawOp_BoundingRect(setting),
            new Effect_RectEraser(),
            new NullCursor()
        );
        super.show(setting, toolCanvas);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);
        super.OnSelected(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        super.OnDiselected(e);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        super.OnPicked(e);
    }
}

//
//  線幅ツール
//

/// 新しいインスタンスを初期化する。
export class ThicknessTool implements IDrawTool {
    m_slideBar: MicroSlideBar;
    m_toolCanvas: HTMLCanvasElement;
    m_setting: CommonSetting;

    constructor(iconBounds: IRect) {
        this.m_slideBar = new MicroSlideBar(
            iconBounds, true,
            'rgb(0,0,0)',
            1, 30, 1,
            "", "px",
            0, 30
        );
        this.m_toolCanvas = null;
        this.m_setting = null;
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        const val = setting.getThickness();
        const context = toolCanvas.getContext('2d');
        this.m_slideBar.show(val, context);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        // console.log("ThicknessTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Independent);

        // キャンバス記憶
        this.m_toolCanvas = e.m_sender.getToolPaletteCanvas();

        // 設定変更追跡のための登録
        this.m_setting = e.m_sender.getCommonSetting();
        this.m_setting.addListener(this);

        const val = e.m_sender.getCommonSetting().getThickness();
        this.m_slideBar.OnSelected(e, val);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        // console.log("ThicknessTool::OnDiselected() called. ");

        // 設定変更追跡のための登録を解除
        const setting = e.m_sender.getCommonSetting();
        setting.removeListener(this);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("ThicknessTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        const val: number = this.m_slideBar.OnPicked(e);

        // 共通設定変更
        assert(this.m_setting == e.m_sender.getCommonSetting());
        this.m_setting.setThickness(val);
    }

    /// クリック終了またはドラッグ終了時に呼ばれる。
    OnPointingEnd(e: IToolUIEvent): void {
        /*pass*/
    }

    /// 設定が変化したとき呼ばれる。
    OnSettingChanged(setting: CommonSetting): void {
        if (this.m_toolCanvas != null) {
            const val = setting.getThickness();
            const context = this.m_toolCanvas.getContext('2d');
            this.m_slideBar.drawValue(val, context);
        }
    }

    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory): void {
        /*pass*/
    }
}

//
//  カラーパレット
//

/// 新しいインスタンスを初期化する。
export class ColorPalette implements IDrawTool {
    m_iconBounds: IRect;
    m_color: string;
    m_setting: CommonSetting;
    m_toolCanvas: HTMLCanvasElement;
    // 画像合成先キャンバス
    m_joint_canvas: HTMLCanvasElement;

    constructor(iconBounds: IRect) {
        this.m_iconBounds = iconBounds;
        this.m_color = null;

        this.m_setting = null;
        this.m_toolCanvas = null;

        // 画像合成先キャンバス
        // 暫定的に、index.html内のものを使う。
        this.m_joint_canvas = <HTMLCanvasElement>document.getElementById("joint_canvas");
    }

    /// 最初の表示を行う。
    show(color: string, bActive: boolean, toolCanvas: HTMLCanvasElement) {
        const context = toolCanvas.getContext('2d');

        this.m_color = color;
        draw_color_palette(this.m_iconBounds, this.m_color, bActive, context);
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        // console.log("ColorPalette::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Standard);

        // アイコン描画(選択状態)
        const context = e.m_sender.getToolPaletteCanvas().getContext('2d');
        draw_color_palette(this.m_iconBounds, this.m_color, true, context);

        // 設定更新
        this.m_setting = e.m_sender.getCommonSetting();
        this.m_setting.setColor(this.m_color);

        // キャンバス記憶
        this.m_toolCanvas = e.m_sender.getToolPaletteCanvas();

        // スポイト操作のための登録
        e.m_sender.addDrawer(this);

        // 設定変更追跡のための登録
        this.m_setting.addListener(this);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        // console.log("ColorPalette::OnDiselected() called. ");
        const setting = e.m_sender.getCommonSetting();

        // 設定変更追跡のための登録を解除
        setting.removeListener(this);

        // 登録解除
        e.m_sender.removeDrawer(this);

        // アイコン描画(非選択状態)
        const context = e.m_sender.getToolPaletteCanvas().getContext('2d');
        draw_color_palette(this.m_iconBounds, this.m_color, false, context);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("ColorPalette::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        /*NOP*/
    }

    /// クリック終了またはドラッグ終了時に呼ばれる。
    OnPointingEnd(e: IToolUIEvent): void {
        /*pass*/
    }

    /// 設定が変化したとき呼ばれる。
    OnSettingChanged(setting: CommonSetting) {
        if (this.m_toolCanvas != null) {
            this.m_color = setting.getColor();
            const context = this.m_toolCanvas.getContext('2d');
            draw_color_palette(this.m_iconBounds, this.m_color, true, context);
        }
    }

    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory): void {
        /*pass*/
    }

    /// 描画ストローク開始時に呼ばれる。(IDrawCanvas)
    OnDrawStart(e: IToolUIEvent): void {
        // スポイト操作
        if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
            // 画像合成
            e.m_sender.getJointImage(this.m_joint_canvas);

            // 画素データ取得
            const jointCtx = this.m_joint_canvas.getContext('2d');
            const px_data = jointCtx.getImageData(e.m_point.x, e.m_point.y, 1, 1);
            assert(px_data.data.length == 4);

            // 設定更新
            const color = get_color_as_RGB(Array.prototype.slice.call(px_data.data));
            eval(dbgv(['color']));
            this.m_color = color;
            this.m_setting.setColor(this.m_color);

            // 表示更新
            const context = this.m_toolCanvas.getContext('2d');
            draw_color_palette(this.m_iconBounds, this.m_color, true, context);
        }
    }
}

//
//  色ツール
//

/// 新しいインスタンスを初期化する。
export class ColorCompoTool implements IDrawTool {
    m_iconBounds: IRect;
    m_slideBar: MicroSlideBar;
    m_colorCompoIdx: number;
    m_toolCanvas: HTMLCanvasElement;
    m_objId: string;
    // Object IDの生成源
    static m_instanceCnt: number = 0;

    constructor(iconBounds: IRect) {
        this.m_iconBounds = iconBounds;
        this.m_slideBar = null;
        this.m_colorCompoIdx = null;
        this.m_toolCanvas = null;
        this.m_objId = null;
    }

    /// 最初の表示を行う。
    /// ここで与える引数により、RGBAのどのツールなのかが決まる。
    show(setting: CommonSetting, colorCompoIdx: number, toolCanvas: HTMLCanvasElement) {
        this.m_colorCompoIdx = colorCompoIdx;
        this.m_toolCanvas = null;
        this.m_objId = "ColorCompoTool_" + colorCompoIdx + "_" + ((ColorCompoTool.m_instanceCnt)++);

        // 現在の色を取得する。
        const color = setting.getColor();
        const colors = color.match(/\d+/g);
        assert(colors.length >= 3);

        // 色成分別処理
        let viewColor: string, pfx: string, iniVal: number;
        switch (colorCompoIdx) {
            case 0:
                viewColor = 'rgb(255,150,150)';
                pfx = 'R';
                iniVal = parseInt(colors[0]);
                break;
            case 1:
                viewColor = 'rgb(130,242,56)';
                pfx = 'G';
                iniVal = parseInt(colors[1]);
                break;
            case 2:
                viewColor = 'rgb(128,128,255)';
                pfx = 'B';
                iniVal = parseInt(colors[2]);
                break;
            case 3:
                viewColor = 'rgb(170,170,170)';
                pfx = 'A';
                iniVal = setting.getAlpha();
                break;
            default:
                assert(false);
                return;
        }
        // eval(dbgv([ 'iniVal' ]));

        // スライドバー構成
        this.m_slideBar = new MicroSlideBar(
            this.m_iconBounds, false,
            viewColor,
            ((colorCompoIdx == 3) ? 1 : 0), 255, iniVal,    // A値の下限は1
            pfx, "",
            -1, 255     // 値0でも色つきの線を表示させるため、exValMin=-1とする。
        );

        // 最初の表示
        const context = toolCanvas.getContext('2d');
        this.m_slideBar.show(iniVal, context);

        // イベントハンドラ登録
        this.m_toolCanvas = toolCanvas;
        setting.addListener(this);
    }

    /// 共通設定から必要な値を取得する。
    getValue(setting: CommonSetting) {
        let val: number = null;

        switch (this.m_colorCompoIdx) {
            case 0:
            case 1:
            case 2:
                {
                    const color = setting.getColor();
                    const colors = get_components_from_RGBx(color);
                    val = colors[this.m_colorCompoIdx];
                }
                break;
            case 3:
                val = setting.getAlpha();
                break;
            default:
                assert(false);
                break;
        }

        return val;
    }

    /// 共通設定を変更する。
    setValue(val: number, setting: CommonSetting) {
        switch (this.m_colorCompoIdx) {
            case 0:
            case 1:
            case 2:
                {
                    let color = setting.getColor();
                    const colors = get_components_from_RGBx(color);
                    colors[this.m_colorCompoIdx] = val;
                    color = get_color_as_RGB(colors);
                    setting.setColor(color);
                }
                break;
            case 3:
                setting.setAlpha(val);
                break;
            default:
                assert(false);
                break;
        }
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        // console.log("ColorCompoTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        e.m_sender.getCommonSetting().beginEdit(this.m_objId);
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Independent);
        const setting = e.m_sender.getCommonSetting();
        const val = this.getValue(setting);
        this.m_slideBar.OnSelected(e, val);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        // console.log("ColorCompoTool::OnDiselected() called. ");
        e.m_sender.getCommonSetting().releaseEdit(this.m_objId);
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("ColorCompoTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        e.m_sender.getCommonSetting().extendEdit(this.m_objId);
        const val = this.m_slideBar.OnPicked(e);
        const setting = e.m_sender.getCommonSetting();
        this.setValue(val, setting);
    }

    /// クリック終了またはドラッグ終了時に呼ばれる。
    OnPointingEnd(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().endEdit(this.m_objId);
    }

    /// 設定が変更されたとき呼ばれる。
    OnSettingChanged(setting: CommonSetting) {
        if (this.m_toolCanvas != null) {
            const val = this.getValue(setting);
            const context = this.m_toolCanvas.getContext('2d');
            this.m_slideBar.drawValue(val, context);
        }
    }

    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory): void {
        /*pass*/
    }
}

//
//  マスクツール
//

/// レイヤーの番号を取得するためのヘルパ関数。
function get_layer_no(toolPalette: ToolPalette, layer: HTMLCanvasElement) {
    const nlayers = toolPalette.getNumLayers();
    for (let i = 0; i < nlayers; i++) {
        const layer_i = toolPalette.getLayer(i);
        if (layer_i == layer)
            return i;
    }
    return null;
}

/// 新しいインスタンスを初期化する。
export class MaskTool implements IDrawTool {
    m_iconBounds: IRect;
    m_drawCompoIdx: number;
    m_faceText: string;
    m_tgColor: string

    m_joint_canvas: HTMLCanvasElement;
    m_dbg_canvas: HTMLCanvasElement;
    m_maskCanvas: HTMLCanvasElement;
    m_saveCanvas: HTMLCanvasElement;
    m_surfaceUser: HTMLCanvasElement;

    m_bDealing: boolean;
    m_lastToolPalette: ToolPalette;
    m_bActive: boolean;     // (Undo/Redo)

    constructor(iconBounds: IRect) {
        this.m_iconBounds = iconBounds;
        this.m_drawCompoIdx = null;
        this.m_faceText = null;
        this.m_tgColor = null;

        this.m_joint_canvas = <HTMLCanvasElement>document.getElementById("joint_canvas");
        this.m_dbg_canvas = <HTMLCanvasElement>document.getElementById("dbg_canvas");
        this.m_maskCanvas = null;
        this.m_saveCanvas = null;
        this.m_surfaceUser = null;

        this.m_bDealing = false;
        this.m_lastToolPalette = null;
        this.m_bActive = false;     // (Undo/Redo)
    }

    /// アイコングラフィックを表示する。
    drawIcon(color: string, context: CanvasRenderingContext2D): void {
        const iconGraphicFunc: IIconGraphicFunc = function (iconBounds, context) {
            context.fillStyle = color;
            const b = iconBounds;   // Alias
            context.fillRect(b.x + 3, b.y + 2, b.width - 7, Math.floor((b.height - 4) / 2));
        };
        draw_icon_ex(this.m_iconBounds, this.m_faceText, iconGraphicFunc, false, context);
    }

    /// 最初の表示を行う。
    /// ここで与える引数により、描画合成方法が決まる。
    show(
        setting: CommonSetting,
        drawCompoIdx: number,
        toolCanvas: HTMLCanvasElement
    ): void {
        this.m_drawCompoIdx = drawCompoIdx;
        this.m_tgColor = setting.getMaskColor();

        switch (this.m_drawCompoIdx) {
            case 0:
                this.m_faceText = '通常';
                break;
            case 1:
                this.m_faceText = 'マスク';
                this.m_maskCanvas = document.createElement('canvas');
                this.m_saveCanvas = document.createElement('canvas');
                break;
            case 2:
                this.m_faceText = '逆マスク';
                this.m_maskCanvas = document.createElement('canvas');
                this.m_saveCanvas = document.createElement('canvas');
                break;
            default:
                assert(false);
                break;
        }

        // アイコン描画
        // 当ツールの表示上のアイコン状態は常にfalse。
        const context = toolCanvas.getContext('2d');
        this.drawIcon(this.m_tgColor, context);
    }

    /// 表示マスク画像を生成する。
    setupSurface(
        toolPalette: ToolPalette,
        layer: HTMLCanvasElement,
        mask: HTMLCanvasElement,
        bInv: boolean,
        surface: HTMLCanvasElement
    ): void {
        const workCanvas = <HTMLCanvasElement>document.createElement('canvas');
        workCanvas.setAttribute('width', layer.width.toString());
        workCanvas.setAttribute('height', layer.height.toString());

        // ■ 表示マスク画像
        // 対象画素以外を操作者の見かけ上変更させないためのマスク。
        // これは、操作者が見る画像(=レイヤー合成結果画像)から、
        // 下記を両方満たす画素のみを除外(透明化)してできる画素の集まりに等しい。
        //   (1) 指定レイヤー(layer)において書き換え可能である。(マスクされない。)
        //   (2) 指定レイヤーより上のレイヤーに覆われない。(操作者から直接見える。)

        // マスク画像(mask)から、対象レイヤー(layer)より
        // 上のレイヤーで覆われる画素を除外する。
        // 当処理により、workCanvasに下記画像がセットされる。
        // マスクツール(bInv==false)の場合: 表示上書き換え禁止の画素の集合
        // 逆マスクツール(bInv==false)の場合: 表示上書き換え可能な画素の集合
        copy_layer(mask, workCanvas);
        const nlayers = toolPalette.getNumLayers();
        let found_idx = -1;
        for (let i = 0; i < nlayers; i++) {
            const layer_i = toolPalette.getLayer(i);
            if (found_idx < 0) {        // (layer未発見(layer_iはlayerより上ではない))
                if (layer_i == layer) {   // (layer発見)
                    found_idx = i;          // インデックスを記憶
                }
            } else {    // (layer発見済み(layer_iはlayerより上))
                // this.m_maskCanvasからlayer_iの不透明画素に対応する画素を除外
                get_destinaton_out_image(layer_i, workCanvas);
            }
        }

        // レイヤー合成結果画像からthis.m_maskCanvasの不透明画素に対応する画素を除外
        toolPalette.getJointImage(this.m_joint_canvas);
        fix_image_w_mask(this.m_joint_canvas, workCanvas, bInv, surface);
    }

    /// マスク画像を生成する。
    setupMaskImage(
        toolPalette: ToolPalette,
        layer: HTMLCanvasElement,
        surface: HTMLCanvasElement
    ): void {
        switch (this.m_drawCompoIdx) {
            case 0:
                // erase_single_layer(surface);   // 最初からクリアされている想定で省略。
                break;
            case 1:
            case 2:
                // マスク/逆マスク画像生成
                {
                    // マスク画像生成
                    // 指定レイヤー(layer)上の、色がthis.m_tgColorである画素の集まり。
                    this.m_maskCanvas.setAttribute('width', layer.width.toString());
                    this.m_maskCanvas.setAttribute('height', layer.height.toString());
                    get_mask_image(layer, this.m_tgColor, this.m_maskCanvas);

                    // 指定レイヤー(layer)のバックアップ
                    this.m_saveCanvas.setAttribute('width', layer.width.toString());
                    this.m_saveCanvas.setAttribute('height', layer.height.toString());
                    copy_layer(layer, this.m_saveCanvas);

                    // 表示マスク生成
                    // 当メソッドがOnLayerToBeFixed()イベントリスナから呼ばれた際、
                    // 共通設定は最新の値に更新後であることが保証されるが、
                    // それ以外は不明。よって、layerの可視属性をlayer直からでなく、
                    // 共通設定から参照する。
                    const setting = toolPalette.getCommonSetting();
                    const layerNo = get_layer_no(toolPalette, layer);
                    assert(layerNo != null);
                    console.log("layerVisibility(" + layerNo + ")=" + setting.getLayerVisibility(layerNo));
                    if (setting.getLayerVisibility(layerNo)) {  // (この後layerが可視になる)
                        // layerを可視化
                        const bHidden = layer.hidden;
                        layer.hidden = false;

                        // サーフェス上に表示マスク構成
                        const bInv = (this.m_drawCompoIdx == 2);    // 逆マスク時true
                        this.setupSurface(toolPalette, layer, this.m_maskCanvas, bInv, surface);

                        // layerの可視状態を復元
                        layer.hidden = bHidden;
                    } else {    // (この後layerが不可視になる)
                        erase_single_layer(surface);
                    }
                }
                break;
            default:
                assert(false);
                break;
        }
        if (this.m_dbg_canvas != null) {
            copy_layer(surface, this.m_dbg_canvas);   // DEBUG
        }

        // サーフェス有効化を記憶
        this.m_surfaceUser = layer;
    }

    /// マスク画像を定着させる。
    fixMaskImage(surface: HTMLCanvasElement, layer: HTMLCanvasElement): void {
        switch (this.m_drawCompoIdx) {
            case 0:
                /*NOP*/
                break;
            case 1:
                fix_image_w_mask(this.m_saveCanvas, this.m_maskCanvas, false, layer);
                erase_single_layer(surface);
                break;
            case 2:
                fix_image_w_mask(this.m_saveCanvas, this.m_maskCanvas, true, layer);
                erase_single_layer(surface);
                break;
            default:
                assert(false);
                break;
        }

        this.m_surfaceUser = null;
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        // console.log("MaskTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + "), txt=" + this.m_faceText);
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Independent);
        const toolPalette = e.m_sender;

        // マスク対象色取得
        const setting = toolPalette.getCommonSetting();
        this.m_tgColor = setting.getMaskColor();

        // マスク画像作成
        const layer = toolPalette.getCurLayer();
        const surface = toolPalette.getSurface();
        this.setupMaskImage(toolPalette, layer, surface);

        // アイコン描画
        const context = toolPalette.getToolPaletteCanvas().getContext('2d');
        this.drawIcon(this.m_tgColor, context);

        // マスク処理
        this.OnPicked(e);

        // レイヤー固定要求リスナ登録
        this.m_lastToolPalette = toolPalette;
        toolPalette.addLayerFixListener(this);

        this.m_bActive = true;    // (Undo/Redo)
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        const toolPalette = e.m_sender;

        // レイヤー固定要求リスナ登録解除
        toolPalette.removeLayerFixListener(this);

        // マスク画像定着
        if (this.m_surfaceUser != null) {
            const layer = this.m_surfaceUser;
            const surface = toolPalette.getSurface();
            this.fixMaskImage(surface, layer);
        }

    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("MaskTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
        const toolPalette = e.m_sender;
        const setting = toolPalette.getCommonSetting();
        const context = toolPalette.getToolPaletteCanvas().getContext('2d');

        // CTRLキーが押されていたら対象色を変更する。
        if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
            this.m_tgColor = setting.getColor();
            setting.setMaskColor(this.m_tgColor);
            this.drawIcon(this.m_tgColor, context);

            // イベント最適化
            // マスクツールがCTRLキーとともにクリックされたということは、
            // それに先立つ描画色の変更でマスク画像定着はすでに実施済みのため、
            // ここでの定着は省略する。
            // // マスク画像定着(もしあれば)
            // if (this.m_surfaceUser != null) {
            //   const toolPalette = e.m_sender;
            //   const layer = this.m_surfaceUser;
            //   const surface = toolPalette.getSurface();
            //   this.fixMaskImage(surface, layer);
            // }
            //
            // // マスク画像作成
            // this.setupMaskImage(toolPalette, layer, surface);
        }
    }

    /// 作業中レイヤーを固定すべきとき呼ばれる。
    OnLayerToBeFixed(pictCanvas: PictureCanvas, nextLayer: HTMLCanvasElement): void {
        console.log("MaskTool::OnLayerToBeFixed() called.");

        // 再入防止
        // 非同期の再入は無いはずなのでatomic性とか気にしない。
        if (this.m_bDealing)
            return;
        this.m_bDealing = true;

        // 例えばマスク色赤色でマスクツール使用中あっても、
        // ユーザーは赤色で描画はできる。
        // これをどこかのタイミングでマスクに含めねばならない。
        // --> ここで行う。
        const surface = pictCanvas.getSurface();
        if (this.m_surfaceUser != null) {
            const layer = this.m_surfaceUser;
            this.fixMaskImage(surface, layer);    // サーフェス使用中レイヤーのマスキング結果を一旦固定
        }
        this.setupMaskImage(this.m_lastToolPalette, nextLayer, surface);  // 次のレイヤーのマスキングを行う。

        this.m_bDealing = false;
    }

    /// 作業中内容を破棄し、マスクを作り直す。(Undo/Redo)
    invalidate(pictCanvas: PictureCanvas): void {
        if (this.m_bActive) {
            console.log("MaskTool::invalidate() called.");
            this.m_bDealing = true;

            const surface = pictCanvas.getSurface();
            erase_single_layer(surface);
            this.setupMaskImage(this.m_lastToolPalette, this.m_surfaceUser, surface);

            this.m_bDealing = false;
        }
    }

    /// アクティブか否かを返す。(Undo/Redo)
    isActive(): boolean { return this.m_bActive; }
}

//
//  塗り潰しツール
//

/// 新しいインスタンスを初期化する。
export class PaintTool implements IDrawTool {
    m_toolPalette: ToolPalette;
    m_PaintButton: HTMLButtonElement;

    constructor(toolPalette: ToolPalette) {
        this.m_toolPalette = toolPalette;
        this.m_PaintButton = <HTMLButtonElement>document.getElementById('paint');
        const paintTool = this;   // 束縛変数
        this.m_PaintButton.onclick = function () {
            paintTool.OnClicked();
        };
    }

    OnPicked(e: IToolUIEvent): number | void {
        throw new Error('Method not implemented.');
    }
    OnPointingEnd(e: IToolUIEvent): void {
        throw new Error('Method not implemented.');
    }
    OnSettingChanged(setting: CommonSetting): void {
        throw new Error('Method not implemented.');
    }

    /// 塗り潰しボタンがクリックされたとき呼ばれる。
    OnClicked(): void {
        this.m_toolPalette.redirectTo(this);
    }

    /// ツール選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        console.log("PaintTool::OnSelected() called.");
        e.m_sender.addDrawer(this);
    }

    /// ツール選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        console.log("PaintTool::OnDiselected() called.");
        e.m_sender.removeDrawer(this);
    }

    /// 描画ストローク開始時呼ばれる。
    /// ここでは'mousedown'等、ポインティング開始操作の捕捉のために使っている。
    OnDrawStart(e: DrawingEvent): void {
        console.log("PaintTool::OnDrawStart() called.");
        const toolPalette = this.m_toolPalette;
        const layer = toolPalette.getCurLayer();
        const setting = toolPalette.getCommonSetting();

        if (e.m_spKey == 0x0) {
            const color = setting.getColor();
            const ffst = new FloodFillState(layer, e.m_point.x, e.m_point.y, color);
            ffst.fill();
            e.m_sender.appendPaintOperation(e.m_point, color, e.m_sender.getCurLayerNo());    // (Undo/Redo)
        }
    }
}

//
//  レイヤー選択ツール
//

/// 新しいインスタンスを追加する。
export class LayerTool implements IDrawTool {
    m_iconBounds: IRect;
    m_listBox: ListBox;
    m_toolCanvas: HTMLCanvasElement;

    constructor(iconBounds: IRect) {
        this.m_iconBounds = iconBounds;
        this.m_listBox = null;
    }

    OnPointingEnd(e: IToolUIEvent): void {
        throw new Error('Method not implemented.');
    }

    OnSettingChanged(setting: CommonSetting): void {
        throw new Error('Method not implemented.');
    }

    /// 最初の表示を行う。
    show(setting: CommonSetting, toolCanvas: HTMLCanvasElement): void {
        const nlayers = setting.getNumLayers();
        const curLayerNo = setting.getCurLayerNo();
        this.m_listBox = new ListBox(this.m_iconBounds, nlayers);
        this.m_toolCanvas = toolCanvas;
        this.updateView(setting);
    }

    /// レイヤー選択に従い設定を更新する。
    updateSetting(setting: CommonSetting, e: IToolUIEvent): void {
        // クリックされたレイヤー番号を特定
        const selIdx = this.m_listBox.getSelectionIndex();
        const nitems = this.m_listBox.getNumItems();
        const layerNo = (nitems - 1) - selIdx;

        // 設定変更
        console.log("e.m_button=" + e.m_button);
        switch (e.m_button) {
            case 0:
                setting.setCurLayerNo(layerNo);
                break;
            case 2:
                {
                    const bLayerVisible = setting.getLayerVisibility(layerNo);
                    console.log("bLayerVisible=" + bLayerVisible);
                    setting.setLayerVisibility(layerNo, !bLayerVisible);  // レイヤー可視属性変更
                    break;
                }
            default:
                /*NOP*/
                break;
        }
    }

    /// 設定に従いレイヤー選択を更新する。
    updateView(setting: CommonSetting): void {
        // データ更新
        const curLayerNo = setting.getCurLayerNo();
        this.m_listBox.setSelectionIndex(curLayerNo);

        // 基礎部分描画
        this.m_listBox.show(curLayerNo, this.m_toolCanvas);

        // レイヤー状態を表示に反映
        const ctx = this.m_listBox.getContext2d();
        const nitems = this.m_listBox.getNumItems();
        for (let i = 0; i < nitems; i++) {
            const b = this.m_listBox.getBounds(i);
            const layerNo = (nitems - 1) - i;
            if (layerNo == curLayerNo) {
                ctx.fillStyle = textColor;
                ctx.fillText("Layer" + layerNo, b.x + 1, b.y + b.height - 1, b.width - 1);
            }
            if (!setting.getLayerVisibility(layerNo)) {
                ctx.fillStyle = 'rgb(255,0,0)';
                draw_line_1px(b.x, b.y, b.x + b.width - 1, b.y + b.height - 1, ctx);
            }
        }
    }

    /// ツール選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        e.m_sender.getCommonSetting().selectTool(ToolType.TL_Independent);
        this.m_listBox.OnSelected(e);

        const setting = e.m_sender.getCommonSetting();
        this.updateSetting(setting, e);
        this.updateView(setting);
    }

    /// ツール選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        /*NOP*/
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        this.m_listBox.OnSelected(e);

        const setting = e.m_sender.getCommonSetting();
        this.updateSetting(setting, e);
        this.updateView(setting);
    }
}

/// 描画ツールを動的に生成する。
export function generateTool(toolName: string, iconBounds: IRect): IDrawTool {
    const cmd = "new " + toolName + "(iconBounds)";
    return eval(cmd);
}
