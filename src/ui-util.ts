// Copyright (c) 2016-2020, mirido
// All rights reserved.

import {
    activeIconColors,
    borderColor,
    IGetBoundingClientRect,
    IIconGraphicFunc,
    inactiveIconColors,
    IPoint,
    IRect,
    textCharWidth,
    textColor
} from './app-def';
import { assert, dump_event } from './dbg-util';
import { jsPoint, jsRect, JsRect, rect_includes } from './geometry';
import { draw_line_1px, draw_rect_R } from './graphics';
import { DrawingEvent, PictureCanvas } from './picture-canvas';
import { CommonSetting, IToolUIEvent } from './tool-palette';
import { UIOpHistory } from './ui-element';

'use strict';

//
//  ブラウザ仕様差の吸収
//

/// ブラウザを判定する。下記から借用。
/// http://etc9.hatenablog.com/entry/20110927/1317140891
export function getBrowserType() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('opera') != -1) {
        return 'opera';
    } else if (userAgent.indexOf('msie') != -1) {
        return 'ie';
    } else if (userAgent.indexOf('chrome') != -1) {
        return 'chrome';
    } else if (userAgent.indexOf('safari') != -1) {
        return 'safari';
    } else if (userAgent.indexOf('gecko') != -1) {
        return 'gecko';
    } else {
        return null;
    }
}

/// getBoundingClientRect()が返す矩形の環境依存の違いを吸収するwrapper。
export function unify_rect(rect: DOMRect): IRect {
    if (rect.x == undefined) {
        // Chromeのときここに来る。
        // 等倍以外の表示のとき、座標が小数点付きで返されるためMath.floor()で処置する。
        return jsRect(
            Math.floor(rect.left),
            Math.floor(rect.top),
            Math.floor(rect.width),
            Math.floor(rect.height)
        );
    } else {
        return jsRect(rect.x, rect.y, rect.width, rect.height);
    }
}

/// getBoundingClientRect()のブラウザ依存性を吸収するwrapper(関数)を返す関数
function get_getBoundingClientRectWrp(): IGetBoundingClientRect {
    const browserType = getBrowserType();
    console.log(`browserType=${browserType}`);
    if (browserType == 'ie') {
        // IEは2 pxずれた座標を返すので対策する。下記Webページを参照した。
        // http://terurou.hateblo.jp/entry/20080223/1203705170
        // 実はmiridoのIEは'gecko'だったのでテストできていない…
        return function (target: HTMLElement): IRect {
            // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
            // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
            const b = target.getBoundingClientRect();
            const bounds = new JsRect(b.left, b.top, b.width, b.height);
            if (document.body.scrollLeft != void (0)) {
                bounds.x -= document.body.scrollLeft;
            } else if (document.documentElement.scrollLeft != void (0)) {
                bounds.x -= document.documentElement.scrollLeft;
            }
            if (document.body.scrollTop != void (0)) {
                bounds.y -= document.body.scrollTop;
            } else if (document.documentElement.scrollTop != void (0)) {
                bounds.y -= document.documentElement.scrollTop;
            }
            return bounds;
        };
    } else if (browserType == 'gecko') {
        // Geckoは座標を実数(小数点以下有り)で返す。
        // これが原因で、ImagePatchの取得と復元を繰り返す度に画像がずれていく
        // 問題が発生したので、下記wrapperで整数にする。
        return function (target) {
            // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
            // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
            const b = target.getBoundingClientRect();
            const bounds = new JsRect(
                Math.ceil(b.left),
                Math.ceil(b.top),
                Math.ceil(b.width),
                Math.ceil(b.height)
            );
            // 情報をいまいちまとめ切れていないが、
            // 実験する限り、少なくともIE11では下記補正は不要の模様。
            // bounds.x -= document.documentElement.scrollLeft;
            // bounds.y -= document.documentElement.scrollTop;
            return bounds;
        };
    } else {
        // IE以外のgetBoundingClientRect()では座標は問題無いらしい。
        // ただしDOMRectのメンバx, yを持たない無いブラウザが存在する。(Chromeとか)
        // それはunify_rect()で処置しておく。
        return function (target) {
            // eval(dbgv([ 'document.body.scrollLeft', 'document.documentElement.scrollLeft' ]));
            // eval(dbgv([ 'document.body.scrollTop', 'document.documentElement.scrollTop' ]));
            const bounds = target.getBoundingClientRect();
            return unify_rect(bounds);
        };
    }
}

/// getBoundingClientRect()のブラウザ依存性を吸収するwrapper
export const getBoundingClientRectWrp = get_getBoundingClientRectWrp();

/// HTMLページのクライアント座標系をウィンドウのクライアント座標系に変換する。
export function conv_page_client_to_wnd_client<T extends IPoint>(point: T): IPoint {
    return jsPoint(point.x - window.pageXOffset, point.y - window.pageYOffset);
}

//
//  General
//

/// コンポーネント値からRGB色表現を取得する。
export function get_color_as_RGB(colors: number[]): string {
    assert(colors.length == 3);
    const color = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
    return color;
}

/// コンポーネント値からRGBA色表現を取得する。
export function get_color_as_RGBA(colors: number[]): string {
    assert(colors.length == 4);
    const color = `rgba(${colors[0]},${colors[1]},${colors[2]},${colors[3]})`;
    return color;
}

/// RGBまたはRGBAをコンポーネントに分解する。
export function get_components_from_RGBx(color: string): number[] {
    const colors: number[] = [];
    if (color.match(/^#/)) {
        const hexColors = color.match(/[\da-f][\da-f]/gi);
        for (let i = 0; i < hexColors.length; i++) {
            colors[i] = parseInt(hexColors[i], 16);
        }
    } else {
        const decColors = color.match(/\d+/g);
        for (let i = 0; i < decColors.length; i++) {
            colors[i] = parseInt(decColors[i], 10);
        }
    }
    return colors;
}

/// カーソルの色を取得する。
export function get_cursor_color(color: string): string {
    const colors = get_components_from_RGBx(color);
    colors[0] ^= 0xff;
    colors[1] ^= 0xff;
    colors[2] ^= 0xff;
    if ((colors[0] == 255 && colors[1] == 255 && colors[2] == 255)
        || (colors[0] == 0 && colors[1] == 0 && colors[2] == 0)) {
        // 白色(デフォルト背景色と同じ)や黒色は避ける。
        colors[0] = colors[1] = colors[2] = 128;
    }
    color = get_color_as_RGB(colors);
    return color;
}

/// 要素をリストに追加する。追加順は保たれる。
/// ただし、既存項目と重複する要素の登録は失敗する。
export function add_to_unique_list<T>(list: T[], elem: T): boolean {
    // 登録済みでないか確認
    // Do liner search because
    // ”in" operator can be used for only basic types.
    for (let i = 0; i < list.length; i++) {
        if (list[i] == elem)
            return false;
    }

    // 登録
    list.push(elem);

    return true;
}

/// 要素をリストから削除する。
export function remove_from_unique_list<T>(list: T[], elem: T): boolean {
    // 検索
    // Do liner search because
    // ”in" operator can be used for only basic types.
    for (let i = 0; i < list.length; i++) {
        if (list[i] == elem) {
            list.splice(i, 1);
            return true;
        }
    }

    return false;
}

//
//  ポインタ状態管理
//

// 2016-10-01現在、HTML5は要素外側のonmouseupは検知(=マウスキャプチャ)
// できない制限があるので、これに対策する。
// 参考:
// http://www.dotapon.sakura.ne.jp/blog/?p=496

/// Callback interface for ToolPalette
export interface IDrawTool {
    /// 選択時呼ばれる。(IDrawTool)
    OnSelected(e: IToolUIEvent, val?: number): void;

    /// 選択解除時呼ばれる。(IDrawTool)
    OnDiselected(e: IToolUIEvent): void;

    /// 再ポイントされたとき呼ばれる。(IDrawTool)
    OnPicked(e: IToolUIEvent): (void | number);

    /// クリック終了またはドラッグ終了時に呼ばれる。(IDrawTool)
    OnPointingEnd?(e: IToolUIEvent): void;
}

/// 設定変更リスナ オブジェクト
export interface ISettingChangeListenerObject {
    /// 設定が変更されたとき呼ばれる。
    OnSettingChanged(setting: CommonSetting): void;
}

/// 操作履歴巻き戻しリスナ オブジェクト
export interface IHistoryRewindListenerObject {
    /// 操作履歴が巻き戻されるとき呼ばれる。(Undo/Redo)
    OnHistoryRewind(history: UIOpHistory): void;
}

export interface IDrawCanvas {
    /// 描画ストローク開始時に呼ばれる。(IDrawCanvas)
    OnDrawStart(e: DrawingEvent): void;

    /// 描画ストローク中に随時呼ばれる。(IDrawCanvas)
    OnDrawing(e: DrawingEvent): void;

    /// 描画ストローク終了時に呼ばれる。(IDrawCanvas)
    OnDrawEnd(e: DrawingEvent): void;

    /// レイヤー固定時に呼ばれる。(IDrawCanvas)
    OnLayerToBeFixed?(canvas: PictureCanvas, layer: HTMLCanvasElement): void;   // Optional
}

/// Type guard for IDrawCanvas
export function isIDrawCanvas(x: (IDrawCanvas | IDrawTool)): x is IDrawCanvas {
    return ('OnDrawStart' in x);
};

export class PointManager implements EventListenerObject {
    // 最後にmousedownまたはtouchstartが起きたオブジェクトのリストの辞書
    // リストは押下ボタン別。
    m_objOnLastPointStart: { [key: number]: EventListenerObject[] };

    /// 新しいインスタンスを初期化する。
    constructor() {
        this.m_objOnLastPointStart = {};

        const bSupportTouch = ('ontouchend' in document);
        if (bSupportTouch) {
            document.addEventListener('touchstart', this);
            document.addEventListener('touchend', this);
        } else {
            document.addEventListener('mousedown', this);
            document.addEventListener('mouseup', this);
        }
    }

    /// インスタンスが保持する資源を解放する。
    dispose(): void {
        const bSupportTouch = ('ontouchend' in document);
        if (bSupportTouch) {
            const listener: EventListener = this.handleEvent;
            document.removeEventListener('touchstart', listener);
            document.removeEventListener('touchend', listener);
        } else {
            const listener: EventListener = this.handleEvent;
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('mouseup', listener);
        }
    }

    /// mousedownまたはtouchstartが起きたオブジェクトを記憶する。
    /// this.handleEvent()から呼び出されたIEventDriven.hsndleEvent()が呼ぶ想定。
    /// objはhandleEvent()メソッドを有する前提。
    notifyPointStart(obj: EventListenerObject, e: MouseEvent): void {
        assert(e.type == 'mousedown' || e.type == 'touchstart');
        if (!(e.button in this.m_objOnLastPointStart)) {
            this.m_objOnLastPointStart[e.button] = [];
        }
        add_to_unique_list(this.m_objOnLastPointStart[e.button], obj);
    }

    /// イベントリスナ。
    handleEvent(e: Event): void {
        dump_event('PointManaget.handleEvent', e);
        if (e instanceof MouseEvent) {
            // 分岐
            // TODO: イベントリスナを分ける。
            switch (e.type) {
                case 'mousedown':
                case 'touchstart':
                    /*pass*/
                    break;
                case 'mouseup':
                case 'touchend':
                    if (e.button in this.m_objOnLastPointStart) {
                        const listeners = this.m_objOnLastPointStart[e.button];
                        for (let i = 0; i < listeners.length; i++) {
                            listeners[i].handleEvent(e);
                        }
                        this.m_objOnLastPointStart[e.button] = [];
                    }
                    break;
                default:
                    assert(false);
                    break;
            }
        } else {
            throw new Error("*** ERR ***");
        }
    }
}

//
//  イベントハンドラ登録
//

// ポインタ系イベント
const g_touchi_pointer_events = [
    'touchstart',
    'touchmove',
    'touchend'
];

const g_mouse_pointer_events = [
    'mousedown',
    'mousemove',
    'mouseup'
];

/// マウスやタッチスクリーン等のポインタ系イベントを一括登録する。
/// codeObjはhandleEvent()メソッドを有する前提。
export function register_pointer_event_handler(docObj: HTMLElement, codeObj: EventListenerObject): void {
    const bSupportTouch = ('ontouchend' in document);
    const pointer_events
        = (bSupportTouch)
            ? g_touchi_pointer_events
            : g_mouse_pointer_events;
    for (let i = 0; i < pointer_events.length; i++) {
        docObj.addEventListener(pointer_events[i], codeObj, false);
    }
}

//
//  <select>タグ操作
//

/// Selection boxの選択項目をプログラムから変更する。
export function change_selection(selector: Element, exp_value: string): boolean {
    const selection = selector.getElementsByTagName('option');
    for (let i = 0; i < selection.length; i++) {
        if (selection[i].value == exp_value) {
            selection[i].selected = true;
            return true;
        }
    }
    return false;
}

//
//  線幅セレクタ
//

export class ThicknessSelector {
    m_thick10Selector: HTMLSelectElement;
    m_thick01Selector: HTMLSelectElement;
    m_thick01List: HTMLCollectionOf<HTMLOptionElement>;
    m_thick10List: HTMLCollectionOf<HTMLOptionElement>;

    /// 新しいインスタンスを初期化する。
    constructor() {
        // DOMオブジェクト取得
        this.m_thick10Selector = <HTMLSelectElement>document.getElementById("selThickness10");
        this.m_thick01Selector = <HTMLSelectElement>document.getElementById("selThickness01");

        // セレクタの値一覧取得
        this.m_thick01List = this.m_thick01Selector.getElementsByTagName('option');
        this.m_thick10List = this.m_thick10Selector.getElementsByTagName('option');
    }

    /// 線の太さをセレクタから取得する。(暫定処置)
    getThickness(): number {
        // Get index
        const idx01 = this.m_thick01Selector.selectedIndex;
        const idx10 = this.m_thick10Selector.selectedIndex;

        // Get thickness
        const val01 = this.m_thick01List[idx01].value;
        const val10 = this.m_thick10List[idx10].value;

        console.log("val10=" + val10 + ", val01=" + val01);
        const thickness = 10 * parseInt(val10) + parseInt(val01);
        return thickness;
    }

    /// 線の太さをセレクタに反映する．
    setThickness(value: number): boolean {
        let bRet;

        const val01 = value % 10;
        const val10 = Math.floor(value / 10);

        let suc = true;
        bRet = change_selection(this.m_thick01Selector, val01.toString());
        if (!bRet) {
            suc = false;
        }
        bRet = change_selection(this.m_thick10Selector, val10.toString());
        if (!bRet) {
            suc = false;
        }

        assert(suc);
        return suc;
    }
}

//
//  キー状態管理
//

// Description:
// キー状態を管理する。

export const SpKey = {
    KY_SHIFT: 0x1,
    KY_CTRL: 0x2,
    KY_ALT: 0x4,
    KY_META: 0x8
};

export class KeyStateManager {
    m_bShiftDown: boolean;
    m_bCtrlDown: boolean;
    m_bAltDown: boolean;
    m_bMetaDown: boolean;
    m_bRightButtonDown: boolean;

    /// 新しいインスタンスを初期化する。
    constructor() {
        // 特殊キー押下状態
        this.m_bShiftDown = false;
        this.m_bCtrlDown = false;
        this.m_bAltDown = false;
        this.m_bMetaDown = false;

        // 右ボタン押下中か否か
        this.m_bRightButtonDown = false;

        // イベントハンドラ登録
        const listener1: EventListener = this.handleKeyboardEvent;
        document.addEventListener('keydown', listener1);
        document.addEventListener('keyup', listener1);
        const listener2: EventListener = this.handleMouseEvent;
        document.addEventListener('mousedown', listener2);
        document.addEventListener('touchstart', listener2);
        document.addEventListener('mouseup', listener2);
        document.addEventListener('touchend', listener2);
    }

    /// インスタンスが保持する資源を解放する。
    dispose() {
        const listener1: EventListener = this.handleKeyboardEvent;
        document.removeEventListener('keydown', listener1);
        document.removeEventListener('keyup', listener1);
        const listener2: EventListener = this.handleMouseEvent;
        document.removeEventListener('mousedown', listener2);
        document.removeEventListener('touchstart', listener2);
        document.removeEventListener('mouseup', listener2);
        document.removeEventListener('touchend', listener2);
    }

    /// イベントリスナ1
    handleKeyboardEvent(e: Event): void {
        dump_event(`KeyStateManager(${e.type})`, e);
        if (e instanceof KeyboardEvent) {
            // 最新キー押下状態取得
            // console.log("key_event=(" + key_event.shiftKey + ", " + key_event.ctrlKey + ")");
            this.m_bShiftDown = (e.shiftKey);
            this.m_bCtrlDown = (e.ctrlKey);
            this.m_bAltDown = (e.altKey);
            this.m_bMetaDown = (e.metaKey);
            // console.log("m_bShiftDown=" + this.m_bShiftDown
            //   + ", this.m_bCtrlDown=" + this.m_bCtrlDown
            //   + ", this.m_bAltDown=" + this.m_bAltDown
            //   + ", this.m_bMetaDown=" + this.m_bMetaDown
            // );
        } else {
            assert(false);
        }
    }

    /// イベントリスナ2
    handleMouseEvent(e: Event): void {
        if (e instanceof MouseEvent) {
            switch (e.type) {
                case 'mousedown':
                case 'touchstart':
                    if (e.button != 0) {
                        this.m_bRightButtonDown = true;
                    }
                    break;
                case 'mouseup':
                case 'touchend':
                    // 161030-1「SHIFT+CTRL+右クリックでスポイトツールを働かせた後、単にクリックしただけでもスポイトツールとして働き続ける。」
                    // の暫定対策。左ボタン以外のボタンのupで特殊キーが全て離されたとみなす。
                    if (this.m_bRightButtonDown) {
                        this.m_bShiftDown = false;
                        this.m_bCtrlDown = false;
                        this.m_bAltDown = false;
                        this.m_bMetaDown = false;
                        this.m_bRightButtonDown = false;
                    }
                    break;
                default:
                    /*NOP*/
                    break;
            }
        } else {
            assert(false);
        }
    }

    /// 特殊キーの押下状態を取得する。
    getSpKeyState(): number {
        let state = 0x0;
        if (this.m_bShiftDown) {
            state |= SpKey.KY_SHIFT;
        }
        if (this.m_bCtrlDown) {
            state |= SpKey.KY_CTRL;
        }
        if (this.m_bAltDown) {
            state |= SpKey.KY_ALT;
        }
        if (this.m_bMetaDown) {
            state |= SpKey.KY_META;
        }
        return state;
    }
}

//
//  アイコン描画
//

/// アイコンを描画する。
export function draw_icon_face<T extends IRect>(
    iconBounds: T, colors: string[], context: CanvasRenderingContext2D
) {
    const sx = iconBounds.x;
    const sy = iconBounds.y;
    const w = iconBounds.width;
    const h = iconBounds.height;

    // 枠線
    context.fillStyle = colors[0];
    draw_rect_R(iconBounds, context);

    // ボタン面
    context.fillStyle = colors[1];
    context.fillRect(sx + 2, sy + 2, w - 4, h - 4);

    // 左上効果
    context.fillStyle = colors[2];
    context.fillRect(sx + 1, sy + 1, w - 3, 1);
    context.fillRect(sx + 1, sy + 2, 1, h - 3);

    // 右下効果
    context.fillStyle = colors[3];
    context.fillRect(sx + 2, sy + h - 2, w - 3, 1);
    context.fillRect(sx + w - 2, sy + 1, 1, h - 3);
}

/// アイコンを描画する。
export function draw_icon_face_ex<T extends IRect>(
    iconBounds: T, bActive: boolean, context: CanvasRenderingContext2D
) {
    const colors = (bActive) ? activeIconColors : inactiveIconColors;
    draw_icon_face(iconBounds, colors, context);
}

/// アイコンを描画する。
export function draw_icon_face_wrp<T extends IRect>(
    iconBounds: T, bActive: boolean, e: IToolUIEvent
): void {
    const tool_canvas: HTMLCanvasElement = e.m_sender.getToolPaletteCanvas();
    const context = tool_canvas.getContext('2d');
    draw_icon_face_ex(iconBounds, bActive, context);
}

/// アイコンを描画する。
export function draw_icon_ex<T extends IRect>(
    iconBounds: T,
    text: string,
    iconGraphicFunc: IIconGraphicFunc,
    bActive: boolean,
    context: CanvasRenderingContext2D
): void {
    // ボタン面描画
    draw_icon_face_ex(iconBounds, bActive, context);

    // アイコンのグラフィック描画
    if (iconGraphicFunc) {
        iconGraphicFunc(iconBounds, context);
    }

    // 文字描画
    const sx = iconBounds.x;
    const sy = iconBounds.y;
    const h = iconBounds.height;
    const nchs = text.length;
    const textMaxWidth = textCharWidth * nchs;
    context.fillStyle = textColor;
    context.fillText(text, sx + 2, sy + h - 3, textMaxWidth);
}

/// アイコンを描画する。
export function draw_icon_wrp<T extends IRect>(
    iconBounds: T,
    text: string,
    iconGraphicFunc: IIconGraphicFunc,
    bActive: boolean,
    e: IToolUIEvent
): void {
    const tool_canvas = e.m_sender.getToolPaletteCanvas();
    const context = tool_canvas.getContext('2d');
    draw_icon_ex(iconBounds, text, iconGraphicFunc, bActive, context);
}

//
//  カラーパレット描画
//

/// カラーパレットを描画する。
export function draw_color_palette<T extends IRect>(
    iconBounds: T,
    color: string,
    bActive: boolean,
    context: CanvasRenderingContext2D
) {
    const color_src = (bActive) ? activeIconColors : inactiveIconColors;
    // const mod_colors = Object.assign([], color_src); -- NG. IEは非サポート。
    const mod_colors = [];
    for (let i = 0; i < color_src.length; i++) {
        mod_colors[i] = color_src[i];
    }
    mod_colors[1] = color;

    draw_icon_face(iconBounds, mod_colors, context);
}

//
//  マイクロスライドバー
//

export class MicroSlideBar implements IDrawTool {
    m_iconBounds: IRect;
    m_bVert: boolean;
    m_valMin: number;
    m_valMax: number;
    m_value: number;
    m_pfx: string;
    m_sfx: string;
    m_exValMin: number;
    m_exValMax: number;

    m_borderColor: string;
    m_inRangeColor: string;
    m_outRangeColor: string;
    m_textColor: string;

    /// 新しいインスタンスを初期化する。
    constructor(
        iconBounds: IRect,  // [in]  描画領域
        bVert: boolean,     // [in]  垂直バーか否か(true: 垂直, false: 水平)
        color: string,      // [in]  値を示すバーの色
        valMin: number,     // [in]  値域の下限
        valMax: number,     // [in]  値域の上限
        valIni: number,     // [in]  初期値
        pfx: string,        // [in]  テキストのprefix
        sfx: string,        // [in]  テキストのpostfix
        exValMin: number,   // [in]  表示上の値域の下限(バー先頭位置を決める内分にはこちらを使う)
        exValMax: number    // [in]  表示上の値域の上限(バー先頭位置を決める内分にはこちらを使う)
    ) {
        this.m_iconBounds = iconBounds;
        this.m_bVert = bVert;
        this.m_valMin = (valMin != null) ? valMin : 0;
        this.m_valMax = (valMax != null) ? valMax : 255;
        this.m_value = (valIni != null) ? valIni : 128;
        this.m_pfx = (pfx != null) ? pfx : "";
        this.m_sfx = (sfx != null) ? sfx : "";
        this.m_exValMin = (exValMin != null) ? exValMin : this.m_valMin;
        this.m_exValMax = (exValMax != null) ? exValMax : this.m_valMax;

        this.m_borderColor = inactiveIconColors[0];
        this.m_inRangeColor = color;
        this.m_outRangeColor = inactiveIconColors[1];
        this.m_textColor = textColor;
        // console.dir(this.m_iconBounds);
    }

    /// 座標をスライドバー数値に換算する。
    decodePoint(point: IPoint): number {
        const bIncluds = rect_includes(this.m_iconBounds, point);
        if (!bIncluds)
            return null;

        const sx = this.m_iconBounds.x;
        const sy = this.m_iconBounds.y;
        const w = this.m_iconBounds.width;
        const h = this.m_iconBounds.height;

        // 数値の下限、上限に対応する座標値を特定
        let pt_min, pt_max, pt_inp;
        if (this.m_bVert) {
            pt_min = sy + 1;
            pt_max = sy + h - 2;
            pt_inp = point.y;
        } else {
            pt_min = sx + 1;
            pt_max = sx + w - 2;
            pt_inp = point.x;
        }

        // 内分して数値化
        let val = this.m_exValMin
            + ((this.m_exValMax - this.m_exValMin) * (pt_inp - pt_min)) / (pt_max - pt_min);
        // eval(dbgv([ 'this.m_exValMin', 'this.m_exValMax', 'val' ]));
        // eval(dbgv([ 'pt_min', 'pt_max', 'pt_inp' ]));
        // eval(dbgv([ '(this.m_exValMax - this.exValMin)' ]));

        // クリッピング
        if (val < this.m_valMin) {
            val = this.m_valMin;
        } else if (val > this.m_valMax) {
            val = this.m_valMax;
        }

        return val;
    }

    /// 数値を座標に変換する。
    encodeToPoint(val: number): IRect {
        const sx = this.m_iconBounds.x;
        const sy = this.m_iconBounds.y;
        const w = this.m_iconBounds.width;
        const h = this.m_iconBounds.height;

        // 数値の下限、上限に対応する座標値を特定
        let pt_min, pt_max;
        if (this.m_bVert) {
            pt_min = sy + 1;
            pt_max = sy + h - 2;
        } else {
            pt_min = sx + 1;
            pt_max = sx + w - 2;
        }
        // eval(dbgv([ 'pt_min', 'pt_max' ]));
        // eval(dbgv([ 'sx', 'sy', 'w', 'h' ]));

        // 内分して座標化
        let pt = pt_min
            + ((pt_max - pt_min) * (val - this.m_exValMin)) / (this.m_exValMax - this.m_exValMin);
        // eval(dbgv(['this.m_exValMin' ]));
        // eval(dbgv([ 'val - this.m_exValMin' ]));
        // eval(dbgv([ 'pt' ]));

        // クリッピング
        if (pt < pt_min) {
            pt = pt_min;
        } else if (pt > pt_max) {
            pt = pt_max;
        }

        // 矩形化
        let valBounds;
        if (this.m_bVert) {
            valBounds = jsRect(sx + 1, sy + 1, w - 2, Math.ceil(pt) - pt_min);
        } else {
            valBounds = jsRect(sx + 1, sy + 1, Math.ceil(pt) - pt_min, h - 2);
        }
        // console.dir(valBounds);

        return valBounds;
    }

    /// 境界と内側を描画する。
    drawBase(context: CanvasRenderingContext2D): void {
        const sx = this.m_iconBounds.x;
        const sy = this.m_iconBounds.y;
        const w = this.m_iconBounds.width;
        const h = this.m_iconBounds.height;

        // 枠線
        context.fillStyle = this.m_borderColor;
        draw_rect_R(this.m_iconBounds, context);

        // 内側
        context.fillStyle = this.m_outRangeColor;
        context.fillRect(sx + 1, sy + 1, w - 2, h - 2);
    }

    /// 数値を表示に反映する。
    drawValue(val: number, context: CanvasRenderingContext2D): void {
        const sx = this.m_iconBounds.x;
        const sy = this.m_iconBounds.y;
        // const w = this.m_iconBounds.width;
        const h = this.m_iconBounds.height;

        // 数値記憶
        this.m_value = val;

        // 基礎部分描画
        this.drawBase(context);

        // In-range描画
        const vb = this.encodeToPoint(val);
        context.fillStyle = this.m_inRangeColor;
        context.fillRect(vb.x, vb.y, vb.width, vb.height);

        // テキスト描画
        const textMaxWidth = this.m_iconBounds.width - 3;
        const text = this.m_pfx + val + this.m_sfx;
        context.fillStyle = this.m_textColor;
        context.fillText(text, sx + 1, sy + h - 2, textMaxWidth);
    }

    /// 最初の表示を行う。
    show(val: number, toolCanvas: (HTMLCanvasElement | CanvasRenderingContext2D)): void {
        let context: CanvasRenderingContext2D;
        if (toolCanvas instanceof HTMLCanvasElement) {
            context = toolCanvas.getContext('2d');
        } else if (toolCanvas instanceof CanvasRenderingContext2D) {
            context = toolCanvas;
        }
        this.drawValue(val, context);
    }

    /// 選択直後の初期表示を行う。
    OnSelected(e: IToolUIEvent, val: number): void {
        const tool_canvas = e.m_sender.getToolPaletteCanvas();
        this.show(val, tool_canvas);
    }

    OnDiselected(e: IToolUIEvent): void {
        /*pass*/
    }

    /// 数値を表示に反映する。
    OnPicked(e: IToolUIEvent): number {
        let tool_canvas = e.m_sender.getToolPaletteCanvas();
        let context = tool_canvas.getContext('2d');

        let val = this.decodePoint(e.m_point);
        if (val != null) {
            val = Math.round(val);
            this.drawValue(val, context);
        }

        return this.m_value;
    }

    OnPointingEnd(e: IToolUIEvent) {
        /*pass*/
    }

    OnSettingChanged(setting: CommonSetting): void {
        /*pass*/
    }
}

//
//  ListBox
//

// 当クラスはポインティングイベントの場所解釈と、
// 描画領域の提供までを行う。
// 描画内容(テキストとか、斜線とか)は利用元が描く。

export class ListBox implements IDrawTool {
    m_iconBounds: IRect;
    m_localBounds: IRect[];
    m_selectionIndex: number;

    m_toolCanvas: HTMLCanvasElement;

    /// 新しいインスタンスを初期化する。
    constructor(iconBounds: IRect, depth: number) {
        this.m_iconBounds = iconBounds;

        // ListBoxは内部に1個以上のローカルな区画を持つアイコンである。
        // それらのローカルな区画の座標をthis.m_localBounds[]として記憶する。
        const b = iconBounds;
        const inr = jsRect(b.x + 1, b.y + 1, b.width - 2, b.height - 2);
        const ey = inr.y + inr.height;
        const local_height = Math.floor((inr.height + 1) / depth);
        this.m_localBounds = [];
        for (let i = 0; i < depth; i++) {
            const py = inr.y + (local_height + 1) * i;
            this.m_localBounds[i] = jsRect(
                inr.x,
                py,
                inr.width,
                (i < depth - 1) ? local_height : ey - py
            );
        }
        assert(this.m_localBounds.length == depth);

        // 選択中の区画のindex
        this.m_selectionIndex = 0;
    }

    /// 最初の表示を行う。
    show(selIdx: number, toolCanvas: HTMLCanvasElement): void {
        this.m_toolCanvas = toolCanvas;
        const context = toolCanvas.getContext('2d');

        // 枠線
        context.fillStyle = borderColor;
        const b = this.m_iconBounds;    // Alias
        draw_rect_R(b, context);

        // 内側
        context.fillStyle = inactiveIconColors[1];  // ボタン面の色
        context.fillRect(b.x + 1, b.y + 1, b.width - 2, b.height - 2);

        // 区画の区切り線を描画する。
        context.fillStyle = 'rgb(0,0,0)';
        for (let i = 1; i < this.m_localBounds.length; i++) {
            const lbnd = this.m_localBounds[i - 1];
            // console.dir(lbnd);
            const py = lbnd.y + lbnd.height;
            draw_line_1px(lbnd.x + 2, py, lbnd.x + lbnd.width - 4, py, context);
        }
    }

    /// 座標から区画番号を取得する。
    getLocalBoundsIdx(point: IPoint): number {
        for (let i = 0; i < this.m_localBounds.length; i++) {
            if (rect_includes(this.m_localBounds[i], point)) {
                return i;
            }
        }
        return null;
    }

    /// 選択時呼ばれる。
    OnSelected(e: IToolUIEvent): void {
        // console.log("ListBox::OnSelected() called.");
        return this.OnPicked(e);
    }

    /// 選択解除時呼ばれる。
    OnDiselected(e: IToolUIEvent): void {
        // console.log("ListBox::OnDiselected() called.");
        /*NOP*/
    }

    /// 再ポイントされたとき呼ばれる。
    OnPicked(e: IToolUIEvent): void {
        // console.log("ListBox::OnPicked() called.");
        const idx = this.getLocalBoundsIdx(e.m_point);
        if (idx != null) {
            this.m_selectionIndex = idx;
        }
    }

    OnPointingEnd(e: IToolUIEvent) {
        /*pass*/
    }

    OnSettingChanged(setting: CommonSetting): void {
        /*pass*/
    }

    /// Itemの数を取得する。
    getNumItems(): number {
        return this.m_localBounds.length;
    }

    /// itemを選択する。
    setSelectionIndex(index: number): void {
        assert(0 <= index && index < this.m_localBounds.length);
        this.m_selectionIndex = index;
    }

    /// 選択中itemのindexを取得する。
    getSelectionIndex(): number {
        return this.m_selectionIndex;
    }

    /// 指定itemの描画領域を取得する。
    getBounds(index: number): IRect {
        assert(0 <= index && index < this.m_localBounds.length);
        return this.m_localBounds[index];
    }

    /// 描画用コンテキストを取得する。
    getContext2d(): CanvasRenderingContext2D {
        return this.m_toolCanvas.getContext('2d');
    }
}
