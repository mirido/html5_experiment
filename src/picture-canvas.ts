// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IPoint, IRect } from 'app-def';
import { g_keyStateManager, g_pointManager } from './app-global';
import { assert } from './dbg-util';
import { jsPoint } from './geometry';
import {
    blend_image,
    erase_canvas,
    erase_single_layer,
    get_joint_image
} from './imaging';
import { IToolUIEvent } from './tool-palette';
import {
    IConfigClosure,
    IEffect,
    IReproClosure,
    UIOpHistory
} from './ui-element';
import {
    add_to_unique_list,
    getBoundingClientRectWrp,
    IDrawTool, isIDrawCanvas,
    register_pointer_event_handler,
    remove_from_unique_list
} from './ui-util';

'use strict';

//
//	DrawingEvent
//

// Description:
// ポインティングイベントを表す。

/// Interface of drawing event.
export interface IDrawingEvent {
    m_sender: PictureCanvas;
    m_point: IPoint;
    m_spKey: number;
    m_type: string;
    m_button: number;
}

/// 新しいインスタンスを初期化する。
export class DrawingEvent implements IDrawingEvent {
    m_sender: PictureCanvas;
    m_point: IPoint;
    m_spKey: number;
    m_type: string;
    m_button: number;

    constructor(sender: PictureCanvas, e: MouseEvent) {
        this.m_sender = sender;
        const bounds = sender.getBoundingDrawAreaRect();
        this.m_point = jsPoint(
            e.clientX - bounds.x,
            e.clientY - bounds.y
        );
        this.m_spKey = g_keyStateManager.getSpKeyState();
        this.m_type = e.type;
        this.m_button = e.button;
    }
}

/// クリックイベントを合成する。
export class VirtualClickEvent implements DrawingEvent {
    m_sender: PictureCanvas;
    m_point: IPoint;
    m_spKey: number;
    m_type: string;
    m_button: number;

    constructor(sender: PictureCanvas, iconBounds: IRect) {
        this.m_sender = sender;
        const bounds = sender.getBoundingDrawAreaRect();
        let cx: number;
        let cy: number;
        if (iconBounds != null) {
            cx = Math.floor(iconBounds.x + iconBounds.width / 2);
            cy = Math.floor(iconBounds.y + iconBounds.height / 2);
        } else {
            cx = bounds.x - 1;
            cy = bounds.y - 1;
        }
        this.m_point = jsPoint(cx, cy);
        this.m_spKey = 0x0;
        this.m_type = 'mousedown';
        this.m_button = 1;
    }
}

/// クリックイベントをクリック完了イベントに変更する。(In-place)
export function modify_click_event_to_end_in_place(e: IToolUIEvent) {
    e.m_type = 'mouseup';
}

//
//	PictureCanvas
//

// Type guard
function isNumber(arg: any): arg is number {
    return typeof arg === "number";
}

export class PictureCanvas implements EventListenerObject {
    // DOMオブジェクト取得
    m_view_port: HTMLCanvasElement;
    m_allLayers: HTMLCanvasElement[];
    m_joint_canvas: HTMLCanvasElement;
    // レイヤー区分
    m_workingLayers: HTMLCanvasElement[];
    m_lastVisibilityList: boolean[];
    m_floating: HTMLCanvasElement;
    m_surface: HTMLCanvasElement;
    m_overlay: HTMLCanvasElement
    m_floatingLayerUser: HTMLCanvasElement;
    // 描画担当ツール
    m_drawers: IDrawTool[];
    // 描画担当ツールに引き渡す情報
    m_nTargetLayerNo: number;
    // ポインタデバイスのドラッグ状態
    m_draggingButton: number;
    m_lastEvent: DrawingEvent;
    // レイヤーのオフセット取得
    m_layer_left: number;
    m_layer_top: number;

    // レイヤ固定要求リスナ
    m_layerFixListeners: IDrawTool[];

    // 操作履歴
    m_history: UIOpHistory;

    /// 新しいインスタンスを初期化する。
    constructor() {
        // DOMオブジェクト取得
        this.m_view_port = <HTMLCanvasElement>document.getElementById("viewport");
        this.m_allLayers = [
            <HTMLCanvasElement>document.getElementById("canvas_0"),
            <HTMLCanvasElement>document.getElementById("canvas_1"),
            <HTMLCanvasElement>document.getElementById("floating"),
            <HTMLCanvasElement>document.getElementById("surface"),
            <HTMLCanvasElement>document.getElementById("overlay"),
        ];
        this.m_joint_canvas = <HTMLCanvasElement>document.getElementById("joint_canvas");

        // レイヤー区分
        this.m_workingLayers = [
            this.m_allLayers[0],
            this.m_allLayers[1]
        ];
        this.m_lastVisibilityList = [
            false,
            false
        ]
        this.m_floating = this.m_allLayers[2];
        this.m_surface = this.m_allLayers[3];
        this.m_overlay = this.m_allLayers[4];
        this.m_floatingLayerUser = null;
        this.m_floating.hidden = true;

        // 描画担当ツール
        // イベントのフックを実現可能なように、複数登録を許す。
        this.m_drawers = [];

        // 描画担当ツールに引き渡す情報
        this.m_nTargetLayerNo = this.m_workingLayers.length - 1;		// 描画対象レイヤー

        // ポインタデバイスのドラッグ状態
        this.m_draggingButton = null;
        this.m_lastEvent = null;

        // イベントハンドラ登録
        register_pointer_event_handler(this.m_view_port, this);

        // コンテキストメニュー無効化
        // http://tmlife.net/programming/javascript/javascript-right-click.html
        const avoid_context_menu = function (e: MouseEvent) { e.preventDefault(); e.stopPropagation(); }
        for (let i = 0; i < this.m_allLayers.length; i++) {
            this.m_allLayers[i].addEventListener("contextmenu", avoid_context_menu, false);
        }
        this.m_view_port.addEventListener("contextmenu", avoid_context_menu, false);

        // レイヤーのサイズ調整
        this.fitCanvas();

        // レイヤーのオフセット取得
        // fitCanvas()呼出し後である必要がある。
        this.m_layer_left = parseInt(this.m_allLayers[0].style.left);
        this.m_layer_top = parseInt(this.m_allLayers[0].style.top);

        // レイヤ固定要求リスナ
        this.m_layerFixListeners = [];

        // 操作履歴
        // attatchHistory()メソッドで設定する。
        this.m_history = null;    // (Undo/Redo)
    }

    /// イベントリスナ。
    handleEvent(e: MouseEvent): void {
        // console.log("Event: " + e.type);
        // console.dir(e);
        // console.log("event=" + e.type + ", button=" + e.button);

        // 描画ツールに引き渡す情報を構成
        const mod_e = new DrawingEvent(this, e);
        // this.m_lastEvent = Object.assign({}, mod_e);		// 値コピー	-- NG. IEは非サポート
        this.m_lastEvent = new DrawingEvent(this, e);
        // console.dir(this.m_lastEvent);

        // イベント別処理
        switch (e.type) {
            case 'mousedown':
            case 'touchstart':
                if (this.m_draggingButton == null) {		// (非ドラッグ状態)
                    // mouseupやtouchendを確実に捕捉するための登録
                    g_pointManager.notifyPointStart(this, e);

                    // ドラッグ状態に遷移
                    this.m_draggingButton = e.button;

                    // 描画ストローク開始を通知
                    for (let i = 0; i < this.m_drawers.length; i++) {
                        const drawer = this.m_drawers[i];
                        if (isIDrawCanvas(drawer)) {
                            drawer.OnDrawStart(mod_e);
                        }
                    }
                }
                break;
            case 'mouseup':
            case 'touchend':
                // 描画終了を通知
                if (this.m_draggingButton != null) {				// (ドラッグ状態)
                    if (e.button == this.m_draggingButton) {	// (ドラッグ開始したボタンの押下解除イベント)
                        // 描画ストローク終了を通知
                        for (let i = 0; i < this.m_drawers.length; i++) {
                            const drawer = this.m_drawers[i];
                            if (isIDrawCanvas(drawer)) {
                                drawer.OnDrawEnd(mod_e);
                            }
                        }

                        // ドラッグ状態解除
                        this.m_draggingButton = null;
                    }
                }
                break;
            case 'mousemove':
            case 'touchmove':
                // ポインタの移動を通知
                if (this.m_draggingButton != null) {		// (ドラッグ状態)
                    for (let i = 0; i < this.m_drawers.length; i++) {
                        const drawer = this.m_drawers[i];
                        if (isIDrawCanvas(drawer)) {
                            drawer.OnDrawing(mod_e);
                        }
                    }
                }
                break;
            default:
                break;
        }
    }

    /// 描画ストローク中か否かを返す。
    isDrawing(): boolean {
        return (this.m_draggingButton != null);
    }

    /// 要素の絶対座標を返す。
    getBoundingDrawAreaRect(): IRect {
        const bounds = getBoundingClientRectWrp(this.m_surface);	// hiddenでは有り得ないレイヤーを指定する。
        return bounds;
    }

    /// 描画ツールを追加する。
    /// 異なる描画ツールを複数追加可能。
    /// その場合、描画イベント発生時に描画イベントハンドラが追加順で呼ばれる。
    /// 同一の描画ツールの複数追加はできない。(2回目以降の追加を無視する。)
    /// イベント通知先ツールから呼ばれる想定。
    addDrawer(drawer: IDrawTool): boolean {
        assert(drawer != null);
        if (this.m_draggingButton != null) {		// (ドラッグ状態)
            assert(false);
            return false;
        }
        return add_to_unique_list(this.m_drawers, drawer);
    }

    /// 指定した描画ツールを削除する。
    removeDrawer(drawer: IDrawTool): boolean {
        assert(drawer != null);
        if (this.m_draggingButton != null) {		// (ドラッグ状態)
            assert(false);
            return false;
        }
        return remove_from_unique_list(this.m_drawers, drawer);
    }

    /// レイヤー数を取得する。
    getNumLayers(): number {
        return this.m_workingLayers.length;
    }

    /// レイヤーを取得する。
    getLayer(layerNo: number): HTMLCanvasElement {
        assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
        return this.m_workingLayers[layerNo];
    }

    /// カレントレイヤーを変更する。
    changeLayer(layerNo: number): void {
        assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
        // this.raiseLayerFixRequest(this.m_workingLayers[layerNo]);	// イベント最適化
        this.m_nTargetLayerNo = layerNo;
        /*=	<イベント最適化>
         *	当メソッドを呼び出すのは、現状専らCommonSettingクラスであり、
         *	そのときすでにthis.raiseLayerFixRequest()を呼び出しているため、
         *	ここでの呼び出しを省略する。
         */
    }

    /// カレントレイヤーを取得する。
    getCurLayer(): HTMLCanvasElement {
        return this.m_workingLayers[this.m_nTargetLayerNo];
    }

    /// カレントレイヤー番号を返す。
    getCurLayerNo(): number {
        return this.m_nTargetLayerNo;
    }

    /// カレント描画先レイヤーを取得する。
    /// フローティングレイヤーがあればそちらを返し、
    /// 無ければカレントレイヤーを返す。
    getCurDstLayer(): HTMLCanvasElement {
        if (this.m_floatingLayerUser != null) {
            return this.m_floating;
        } else {
            return this.getCurLayer();
        }
    }

    /// サーフェスを取得する。
    getSurface(): HTMLCanvasElement {
        // console.log("this.m_surface: w=" + this.m_surface.width + ", h=" + this.m_surface.height);
        return this.m_surface;
    }

    /// オーバレイを取得する。
    getOverlay(): HTMLCanvasElement {
        return this.m_overlay;
    }

    /// レイヤーの可視属性を取得する。
    getLayerVisibility(layerNo: number): boolean {
        assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
        return !this.m_workingLayers[layerNo].hidden;
    }

    /// レイヤーの可視属性を設定する。
    setLayerVisibility(layerNo: number, bVisible: boolean): void {
        assert(0 <= layerNo && layerNo < this.m_workingLayers.length);
        this.m_workingLayers[layerNo].hidden = !bVisible;
    }

    /// キャンバスを全クリアする。
    /// サーフェス等も含め、全レイヤーをクリアする。
    eraseCanvas(): void {
        erase_canvas(this.m_allLayers);
    }

    /// 描画レイヤーおよび背景を合成する。
    /// サーフェス等、効果のためのレイヤーは含まない。
    getJointImage(dstCanvas: HTMLCanvasElement): void {
        get_joint_image(this.m_workingLayers, dstCanvas);
    }

    /// View portをキャンバスにfitさせる。
    fitCanvas(): void {
        const width_margin = 100;
        const height_margin = 50;
        const layer_margin_horz = 5;
        const layer_margin_vert = 5;
        const layer_client_width_min = 400;
        const layer_client_height_min = 400;

        // レイヤーのオフセット設定
        // オフセットの値はCSSで指定してあるが、なぜかプログラムから
        // 1回は明示的に設定せねばプログラムで値を取得できない。FireFoxにて確認。
        for (let i = 0; i < this.m_allLayers.length; i++) {
            this.m_allLayers[0].style.left = layer_margin_horz + "px";
            this.m_allLayers[0].style.top = layer_margin_vert + "px";
        }

        // View portの寸法取得
        const vport_client_width = this.m_view_port.clientWidth;
        const vport_client_height = this.m_view_port.clientHeight;
        const vport_outer_width = this.m_view_port.offsetWidth;
        const vport_outer_height = this.m_view_port.offsetHeight;
        // {	/*UTEST*/		// スクロールバーの幅の算出
        // 	// 次の関係が成り立つ。
        // 	//   vport_client_width < vport_outer_width == vport_bounds.width
        // 	// vport_client_widthがスクロールバーを含まない領域幅のようだ。
        // 	const vport_bounds = this.m_view_port.getBoundingClientRect();
        // 	console.log("vport_client_width=" + vport_client_width
        // 	 	+ ", vport_outer_width=" + vport_outer_width
        // 		+ ", vport_bounds.width=" + vport_bounds.width
        // 	);
        // 	console.log("scroll bar width(?)=" + (vport_outer_width - vport_client_width));
        // 	console.log("layer client width=" + this.m_allLayers[0].clientWidth);
        // }

        // レイヤーの寸法取得
        let layer_outer_width = this.m_allLayers[0].offsetWidth;
        let layer_outer_height = this.m_allLayers[0].offsetHeight;
        {
            const layer_client_width = this.m_allLayers[0].clientWidth;
            const layer_client_height = this.m_allLayers[0].clientHeight;
            if (layer_client_width < layer_client_width_min) {
                layer_outer_width += (layer_client_width_min - layer_client_width);
            }
            if (layer_client_height < layer_client_height_min) {
                layer_outer_height += (layer_client_height_min - layer_client_height);
            }
        }

        // レイヤーのオフセット取得
        const layer_left = parseInt(this.m_allLayers[0].style.left);
        const layer_top = parseInt(this.m_allLayers[0].style.top);
        // console.log("layer_left=" + layer_left + ", layer_top=" + layer_top);

        // View portの必要なサイズを取得
        const delta_w = layer_left + layer_outer_width - vport_client_width;
        const delta_h = layer_top + layer_outer_height - vport_client_height;
        let vport_outer_width_min = vport_outer_width + delta_w;
        let vport_outer_height_min = vport_outer_height + delta_h;

        // ウィンドウの表示領域サイズで制限をかける
        // console.log("window.innerWidth=" + window.innerWidth);
        // console.log("window.innerHeight=" + window.innerHeight);
        if (vport_outer_width_min > window.innerWidth - width_margin) {
            vport_outer_width_min = window.innerWidth - width_margin;
        }
        if (vport_outer_height_min > window.innerHeight - height_margin) {
            vport_outer_height_min = window.innerHeight - height_margin;
        }

        // View portのサイズ設定
        this.m_view_port.style.width = vport_outer_width_min + "px";
        this.m_view_port.style.height = vport_outer_height_min + "px";
    }

    /// レイヤー固定要求リスナを追加する。
    addLayerFixListener(listener: IDrawTool): boolean {
        // console.log("PictureCanvas::addLayerFixListener() called.")
        assert(listener != null);
        return add_to_unique_list(this.m_layerFixListeners, listener);
    }

    /// レイヤー固定要求リスナを削除する。
    removeLayerFixListener(listener: IDrawTool): boolean {
        // console.log("PictureCanvas::removeLayerFixListener() called.")
        assert(listener != null);
        return remove_from_unique_list(this.m_layerFixListeners, listener);
    }

    /// レイヤー固定要求を発生させる。
    raiseLayerFixRequest(nextLayer?: HTMLCanvasElement): void {
        // console.log("PictureCanvas::raiseLayerFixRequest() called. n=" + this.m_layerFixListeners.length);
        if (nextLayer == null) {
            nextLayer = this.m_workingLayers[this.m_nTargetLayerNo];
        }
        for (let i = 0; i < this.m_layerFixListeners.length; i++) {
            // console.log("PictureCanvas::raiseLayerFixRequest(): Checking listener...");
            const drawer = this.m_layerFixListeners[i];
            if (isIDrawCanvas(drawer)) {
                console.log("PictureCanvas::raiseLayerFixRequest(): Calling listener...");
                drawer.OnLayerToBeFixed(this, nextLayer);
            }
        }
    }

    /// カレントレイヤーにフローティングレイヤーを追加する。
    makeFloatingLayer(): void {
        // フローティングレイヤー作成済か判定
        const curLayer = this.getCurLayer();
        if (this.m_floatingLayerUser == null) {
            this.m_floatingLayerUser = curLayer;
        } else {
            assert(curLayer == this.m_floatingLayerUser);		// ここで引っかかったらreleaseFloatingLayer()の呼び忘れ。
            return;
        }

        // フローティングレイヤー作成
        assert(this.m_floating.hidden);
        const z_idx = parseInt(curLayer.style.zIndex);
        this.m_floating.style.zIndex = (z_idx + 1).toString(10);
        this.m_floating.hidden = false;
        // {	/*UTEST*/
        // 	const context = this.m_floating.getContext('2d');
        // 	const w = this.m_floating.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
        //   const h = this.m_floating.height;  // (同上)
        // 	context.fillStyle = 'rgba(200,0,255,100)';
        // 	context.fillRect(0, 0, w, h);
        // }
    }

    /// フローティングレイヤーを開放する。
    releaseFloatingLayer(/*[opt]*/ bCancel?: boolean): void {
        this.m_floating.hidden = true;
        if (!bCancel) {
            // フローティングレイヤー内容をカレントレイヤーに合成する。
            const curLayer = this.getCurLayer();
            const w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
            const h = curLayer.height;  // (同上)
            assert(w == this.m_floating.width && h == this.m_floating.height);
            const ctx_floating = this.m_floating.getContext('2d');
            const ctx_current = curLayer.getContext('2d');
            const imgd_floating = ctx_floating.getImageData(0, 0, w, h);
            const imgd_current = ctx_current.getImageData(0, 0, w, h);
            blend_image(imgd_floating, imgd_current);
            ctx_current.putImageData(imgd_current, 0, 0);
            erase_single_layer(this.m_floating);
        }
        this.m_floatingLayerUser = null;
    }

    /// 操作履歴オブジェクトを登録する。(Undo/Redo)
    /// Undo/Redo機能を使用する場合は、ツールやキャンバスに対する最初の操作が行われる前に呼ぶ必要がある。
    /// Undo/Redo機能を使わない場合は一切呼んではならない。
    attatchHistory(history: UIOpHistory): void {
        this.m_history = history;
    }
    /// 操作履歴にエフェクト内容を追記する。(Undo/Redo)
    appendEffect(effectObj: IEffect, configClosure: IConfigClosure, layerNo: (number | HTMLCanvasElement)): void {
        if (this.m_history == null)
            return;
        if (isNumber(layerNo)) {
            this.m_history.appendEffect(effectObj, configClosure, layerNo);
        } else {
            throw new Error("*** ERR ***");
        }
    }

    /// 操作履歴に点列を追記する。(Undo/Redo)
    appendPoints(effectObj: IEffect, points: IPoint[], reproClosure: IReproClosure): void {
        if (this.m_history == null)
            return;
        this.m_history.appendPoints(effectObj, points, reproClosure);
    }

    /// 塗り潰し操作を追記する。(Undo/Redo)
    appendPaintOperation(point: IPoint, color: string, layerNo: number): void {
        if (this.m_history == null)
            return;
        this.m_history.appendPaintOperation(point, color, layerNo);
    }

    /// レイヤー可視属性を記憶する。(Undo/Redo)
    recordVisibility(): void {
        if (this.m_history == null)
            return;

        for (let i = 0; i < this.m_workingLayers.length; i++) {
            this.m_lastVisibilityList[i] = !(this.m_workingLayers[i].hidden);
        }
    }
}
