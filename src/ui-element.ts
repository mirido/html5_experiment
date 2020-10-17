// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { IPlot2Func, IPlotFunc, IPoint, IRect } from './app-def';
import { g_pictureCanvas } from './app-global';
import { assert } from './dbg-util';
import {
    clip_rect,
    encode_to_rect,
    get_common_rect,
    get_outbounds,
    jsPoint,
    JsPoint,
    jsRect,
    JsRect
} from './geometry';
import {
    draw_line,
    draw_line_1px,
    draw_line_w_plot_func,
    draw_line_w_runtime_renderer,
    draw_rect_R,
    pre_render_pixel,
    pre_render_square,
    put_point,
    put_point_1px
} from './graphics';
import {
    FloodFillState
} from './graphics2';
import {
    get_guide_image,
    get_mirror_image,
    get_vert_flip_image,
    make_opaque,
    putImageDataEx
} from './imaging';
import { MaskTool } from './oebi-tool';
import { DrawingEvent, IDrawingEvent, PictureCanvas } from './picture-canvas';
import {
    CommonSetting, PointingEventClone, ToolPalette, VirtualDrawingStartEvent
} from './tool-palette';
import {
    add_to_unique_list,
    get_components_from_RGBx,
    get_cursor_color,
    IDrawCanvas,
    IHistoryRewindListenerObject, remove_from_unique_list,
    SpKey
} from './ui-util';

'use strict';

export interface IConfigClosure {
    (effectObj: IEffect): void;
}

export interface IReproClosure {
    (effectObj: IEffect, points: IPoint[], layer: (number | HTMLCanvasElement)): void;
}

type Context2D = CanvasRenderingContext2D;

/// 描画演算子のインターフェース
export interface IDrawOp {
    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean;

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, pointSeq: IPoint[], context: Context2D): boolean;

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, m_pointSeq: IPoint[], context: Context2D): boolean;

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, pointSeq: IPoint[], context: Context2D): void;

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, m_pointSeq: IPoint[], context: Context2D): void;

    /// 描画ストローク終了時ガイド表示処理。(Optional)
    guideOnDrawEnd?(e: IDrawingEvent, m_pointSeq: IPoint[], context: Context2D): void;

    /// マージンを取得する。
    getMargin(): number;

    getAltLayer?(e: IDrawingEvent): HTMLCanvasElement;          // Optional
}

/// 描画効果のインターフェース
export interface IEffect {
    /// エフェクトを適用する。
    /// setParam()が返すクロージャ、apply()呼び出し前画像、引き続き与えられる点列points
    /// の3点で描画結果が一意に定まるエフェクトについては戻り値voidまたはnullを返す。
    /// そうでないエフェクトについては、(obj, points, layer)から描画結果を復元する
    /// クロージャ(描画復元クロージャ)を返す約束とする。
    apply(points: IPoint[], context: Context2D): IReproClosure;

    /// マージンを取得する。
    getMargin(): number;

    /// パラメータ設定のためのplace holder。
    setParam(setting: CommonSetting): IConfigClosure;

    /// 画素定着対象レイヤーを取得する。(Optional)
    /// 画素定着先レイヤーがカレントレイヤーなら定義不要。
    getMasterLayer?(e: IDrawingEvent): HTMLCanvasElement;       // Optional

    /// 描画ストロークを完結させる。(Optional)
    /// getMasterLayer()で指定したレイヤーの画素を、
    /// キャンバスの最終描画結果用レイヤー(カレントレイヤー等)に対して対し
    /// 1ストローク分まとめて定着させる。
    closeStroke?(e: IDrawingEvent): void;                       // Optional
}

/// 描画カーソルのインターフェース
export interface ICursor {
    /// カーソルを描画する。
    put(e: IDrawingEvent, cur_pt: IPoint, context: Context2D): void;

    /// カーソルをクリアする。
    clear(context: Context2D): void;

    /// パラメータ設定のためのplace holder。
    setParam(setting: CommonSetting): void;
}

//
//  ImagePatch
//

/// 画像のパッチを表す。
export class ImagePatch {
    m_imageData: ImageData;
    m_bounds: IRect;
    m_abs_dirty: IRect;
    m_center: IPoint;

    constructor(
        src_ctx: Context2D,
        src_width: number,
        src_height: number,
        points: IPoint[],
        margin: number
    ) {
        this.m_imageData = null;
        this.m_bounds = null;
        this.m_abs_dirty = null;
        this.m_center = null;

        if (points.length <= 0) {
            return;
        }

        // 点列pointsを包含する矩形を取得
        this.m_bounds = get_outbounds(points, margin);

        // 中心点を記憶
        this.m_center = new JsPoint(
            Math.floor(this.m_bounds.x + this.m_bounds.width / 2),
            Math.floor(this.m_bounds.y + this.m_bounds.height / 2)
        );

        // 領域のクリッピング
        this.m_abs_dirty = clip_rect(this.m_bounds, src_width, src_height);

        // 画像データを記憶
        const r = this.m_abs_dirty;    // Alias
        if (r.width > 0 && r.height > 0) {    // ChromeではこうしないとNG。
            this.m_imageData = src_ctx.getImageData(r.x, r.y, r.width, r.height);
        } else {
            this.m_imageData = null;
        }
    }

    /// 画像を復元する。
    /// dst_ctxは、構築時にsrc_width、src_heightで与えた大きさ以上の
    /// キャンバスのコンテキストと想定。
    restore(dst_ctx: Context2D): void {
        if (this.m_imageData == null)
            return;

        const r = this.m_abs_dirty;   // Alias
        dst_ctx.putImageData(this.m_imageData, r.x, r.y);
    }

    /// 画像を配置する。
    /// dst_ctxと構築時に与えたsrc_ctxの関係は任意。
    put(
        cx: number,
        cy: number,
        dst_ctx: Context2D,
        dst_width: number,
        dst_height: number
    ) {
        if (this.m_imageData == null)
            return;

        // Image patchをputすべき(sx, sy)
        const sx = Math.ceil(cx - this.m_bounds.width / 2);
        const sy = Math.ceil(cy - this.m_bounds.height / 2);

        // Image patchを移動させるべき量
        const ofs_x = Math.floor(cx - this.m_center.x);
        const ofs_y = Math.floor(cy - this.m_center.y);

        // 画像全体の矩形
        const mod_img_bounds = new JsRect(0, 0, dst_width, dst_height);

        // 移動後image patch基準の座標に変換
        mod_img_bounds.x -= ofs_x;
        mod_img_bounds.y -= ofs_y;

        // Dirty rect確定
        const dirty = get_common_rect(this.m_abs_dirty, mod_img_bounds);
        dirty.x -= this.m_abs_dirty.x;
        dirty.y -= this.m_abs_dirty.y;

        // 描画
        dst_ctx.putImageData(
            this.m_imageData,
            sx, sy,
            dirty.x, dirty.y, dirty.width, dirty.height
        );
    }
}

//
//  DrawerBase
//

/// 新しいインスタンスを初期化する。
export class DrawerBase implements IDrawCanvas {
    // 関連オブジェクト
    m_drawOp: IDrawOp;
    m_effect: IEffect;
    m_cursor: ICursor;
    // 描画管理
    m_pointSeq: IPoint[];
    m_imagePatch: ImagePatch;
    m_altImagePatch: ImagePatch;
    m_bWrtProtect: boolean;
    // OnDrawEnd()呼び出し時点の対象レイヤー
    m_lastLayer: HTMLCanvasElement;
    m_lastAltLayer: HTMLCanvasElement;
    // OnDrawEnd()で確定した画像データ
    m_lastImageData: ImageData;
    m_lastAltImageData: ImageData;
    // レイヤー取得関数
    m_masterLayerGetter: { (e: IDrawingEvent): HTMLCanvasElement };
    // ストローク固定関数
    m_strokeFixer: { (e: IDrawingEvent): void };
    // 描画先取得
    m_altLayerGetter: { (e: IDrawingEvent): HTMLCanvasElement };
    m_altContextGetter: { (layer: HTMLCanvasElement): Context2D };

    constructor(drawOp: IDrawOp, effect: IEffect, cursor: ICursor) {
        // 関連オブジェクト
        this.m_drawOp = drawOp;
        this.m_effect = effect;
        this.m_cursor = cursor;

        // 描画管理
        this.m_pointSeq = [];
        this.m_imagePatch = null;
        this.m_altImagePatch = null;
        this.m_bWrtProtect = false;

        // OnDrawEnd()呼び出し時点の対象レイヤー
        this.m_lastLayer = null;
        this.m_lastAltLayer = null;

        // OnDrawEnd()で確定した画像データ
        this.m_lastImageData = null;
        this.m_lastAltImageData = null;

        // エフェクトオブジェクトに応じた設定
        this.rfshSetting();
    }

    /// エフェクトオブジェクトに応じた内部の設定を行う。
    rfshSetting(): void {
        // レイヤー取得関数
        if (this.m_effect.getMasterLayer != null) {
            const effectObj = this.m_effect;
            this.m_masterLayerGetter = function (e) { return effectObj.getMasterLayer(e); };
        } else {
            this.m_masterLayerGetter = function (e) { return e.m_sender.getCurLayer(); };
        }
        if (this.m_effect.closeStroke != null) {
            const effectObj = this.m_effect;
            this.m_strokeFixer = function (e) { effectObj.closeStroke(e); };
        } else {
            this.m_strokeFixer = function (e) { /*NOP*/ };
        }
        if (this.m_drawOp.getAltLayer != null) {
            this.m_altLayerGetter = this.m_drawOp.getAltLayer;
            this.m_altContextGetter = function (layer) { return layer.getContext('2d'); };
        } else {
            this.m_altLayerGetter = function (e: IDrawingEvent): HTMLCanvasElement { return null; };
            this.m_altContextGetter = function (layer: HTMLCanvasElement): Context2D { return null; };
        }
    }

    /// 描画した領域の画像を復元する。
    restoreImagePatch(context: Context2D, alt_ctx: Context2D): void {
        // 領域復元
        if (this.m_imagePatch != null) {
            this.m_imagePatch.restore(context);
            this.m_imagePatch = null;
        }
        if (this.m_altImagePatch != null) {
            this.m_altImagePatch.restore(alt_ctx);
            this.m_altImagePatch = null;
        }
    }

    /// 描画ストローク開始時に呼ばれる。
    OnDrawStart(e: IDrawingEvent): void {
        const curLayer = this.m_masterLayerGetter(e);
        const w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
        const h = curLayer.height;  // (同上)
        const context = curLayer.getContext('2d');
        const altLayer = this.m_altLayerGetter(e);
        const alt_ctx = this.m_altContextGetter(altLayer);
        const cur_pt = e.m_point;
        const margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

        // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
        if ((e.m_spKey & SpKey.KY_CTRL) != 0) {
            this.m_bWrtProtect = true;
            return;
        }

        // 領域復元(描画ストローク2回目以降)
        this.restoreImageOnDrawEnd();

        // 点列記憶
        this.m_pointSeq.splice(0, this.m_pointSeq.length);   // 全クリア
        this.m_pointSeq.push(cur_pt);

        // 描画内容確定 or ガイド表示
        const bFixed = this.m_drawOp.testOnDrawStart(e, this.m_pointSeq, context);
        if (bFixed) {
            // レイヤー上の画素確定
            const reproClosure: IReproClosure = this.m_effect.apply(this.m_pointSeq, context);
            e.m_sender.appendPoints(this.m_effect, this.m_pointSeq, reproClosure);   // 点列追記(Undo/Redo)
            this.m_pointSeq.splice(0, this.m_pointSeq.length - 1);  // 末尾以外を削除
        } else {
            // ガイド表示
            this.m_imagePatch = new ImagePatch(context, w, h, this.m_pointSeq, margin);
            if (alt_ctx != null) {
                this.m_altImagePatch = new ImagePatch(alt_ctx, w, h, this.m_pointSeq, margin);
            }
            this.m_drawOp.guideOnDrawStart(e, this.m_pointSeq, context);
        }

        // カーソル描画
        const ctx_cursor = e.m_sender.getOverlay().getContext('2d');
        this.m_cursor.put(e, cur_pt, ctx_cursor);
    }

    /// 描画ストローク中に随時呼ばれる。
    OnDrawing(e: IDrawingEvent): void {
        const curLayer = this.m_masterLayerGetter(e);
        const w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
        const h = curLayer.height;  // (同上)
        const context = curLayer.getContext('2d');
        const altLayer = this.m_altLayerGetter(e);
        const alt_ctx = this.m_altContextGetter(altLayer);
        const cur_pt = e.m_point;
        const margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

        // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
        if (this.m_bWrtProtect) {
            return;
        }

        // カーソルクリア
        const ctx_cursor = e.m_sender.getOverlay().getContext('2d');
        this.m_cursor.clear(ctx_cursor);

        // 領域復元
        this.restoreImagePatch(context, alt_ctx);

        // 点列記憶
        this.m_pointSeq.push(cur_pt);

        // 描画内容確定 or ガイド表示
        const bFixed = this.m_drawOp.testOnDrawing(e, this.m_pointSeq, context);
        if (bFixed) {
            // レイヤー上の画素確定
            const reproClosure: IReproClosure = this.m_effect.apply(this.m_pointSeq, context);
            e.m_sender.appendPoints(this.m_effect, this.m_pointSeq, reproClosure);   // 点列追記(Undo/Redo)
            this.m_pointSeq.splice(0, this.m_pointSeq.length - 1);  // 末尾以外を削除
        } else {
            // ガイド表示
            this.m_imagePatch = new ImagePatch(context, w, h, this.m_pointSeq, margin);
            if (alt_ctx != null) {
                this.m_altImagePatch = new ImagePatch(alt_ctx, w, h, this.m_pointSeq, margin);
            }
            this.m_drawOp.guideOnDrawing(e, this.m_pointSeq, context);
        }

        // カーソル描画
        this.m_cursor.put(e, cur_pt, ctx_cursor);
    }

    /// 描画ストローク終了時に呼ばれる。
    OnDrawEnd(e: IDrawingEvent): void {
        const curLayer = this.m_masterLayerGetter(e);
        const w = curLayer.width;   // clientWidthやclientHeightは、非表示化時に0になる@FireFox
        const h = curLayer.height;  // (同上)
        const context = curLayer.getContext('2d');
        const altLayer = this.m_altLayerGetter(e);
        const alt_ctx = this.m_altContextGetter(altLayer);
        const cur_pt = e.m_point;
        const margin = Math.max(this.m_drawOp.getMargin(), this.m_effect.getMargin());

        // CTRLキー押下とともに開始された場合はストローク終了まで一切描画しない。
        if (this.m_bWrtProtect) {
            this.m_bWrtProtect = false;
            return;
        }

        // カーソルクリア
        const ctx_cursor = e.m_sender.getOverlay().getContext('2d');
        this.m_cursor.clear(ctx_cursor);

        // 領域復元
        this.restoreImagePatch(context, alt_ctx);

        // 点列記憶
        this.m_pointSeq.push(cur_pt);

        // 描画内容確定判断
        const bFixed = this.m_drawOp.testOnDrawEnd(e, this.m_pointSeq, context);

        // キャンバスの最終状態保存
        // コピー&ペースト操作やベジエ曲線描画操作等、複数の描画ストロークで
        // 1つの描画結果を成すツールでは、この後にもガイド表示が行われる。
        // それを消すための画像データをここで記憶する。
        // ただし、guideOnDrawEnd()を持たない(古い)描画操作については、
        // ここで記憶した画像が未来の時点でDrawerBaseによって勝手に再描画されることを
        // 想定していないため、記憶をスキップする。
        if (this.m_drawOp.guideOnDrawEnd == null) {   // (描画オペレータにguideOnDrawEnd()メソッド無し)
            // エフェクト適用
            if (bFixed) {
                const reproClosure: IReproClosure = this.m_effect.apply(this.m_pointSeq, context);
                e.m_sender.appendPoints(this.m_effect, this.m_pointSeq, reproClosure);   // 点列追記(Undo/Redo)
            }

            // エフェクトのストローク完結処理
            this.m_strokeFixer(e);
        } else {    // (描画オペレータにguideOnDrawEnd()メソッド有り)
            // 作業中レイヤー固定(1)
            // 現状想定では代替レイヤーはオーバレイしかなく、
            // オーバレイはマスク/逆マスクとは無関係なので実は不要…
            e.m_sender.raiseLayerFixRequest();

            // 代替レイヤー内容記憶
            if (alt_ctx != null) {
                this.m_lastAltLayer = altLayer;
                this.m_lastAltImageData = alt_ctx.getImageData(0, 0, altLayer.width, altLayer.height);
            } else {
                this.m_lastAltLayer = null;
            }

            // エフェクト適用
            if (bFixed) {
                // guideOnDrawEnd()を持つ描画操作については、ここでのaltLayerへのガイド表示を許す。
                // curLayerへは画素の定着のみ許可、ガイド表示は禁止。
                const reproClosure: IReproClosure = this.m_effect.apply(this.m_pointSeq, context);
                e.m_sender.appendPoints(this.m_effect, this.m_pointSeq, reproClosure);   // 点列追記(Undo/Redo)
            }

            // エフェクトのストローク完結処理
            this.m_strokeFixer(e);

            // 作業中レイヤー固定(2)
            // (1)と違い、こちらは必須。行わないと、
            // マスク/逆マスクが正しく反映されていない描画結果を記憶することになる。
            e.m_sender.raiseLayerFixRequest();

            // 最終状態保存
            this.m_lastLayer = curLayer;
            this.m_lastImageData = context.getImageData(0, 0, curLayer.width, curLayer.height);

            // ガイド表示
            // これ以降に描画したガイドはストローク完了後から
            // 次回OnDrawStart()呼び出しまで画面に残ったままになる。
            // OnDrawStart()を呼び出すことなくガイドを消すには、
            // 明示的にrestoreImageOnDrawEnd()を呼ぶ必要がある。
            // guideOnDrawEnd()以外にもこの後ガイド描画する要素が有り得るので、
            // 上で行っている最終状態保存はbFixedとは無関係に実施が必要。
            if (!bFixed) {
                // ここでのaltLayerまたはcurLayerへのガイド表示を許す。
                this.m_drawOp.guideOnDrawEnd(e, this.m_pointSeq, context);
            }
        }
    }

    /// OnDrawEnd()以降に描画したガイドを消す。
    restoreImageOnDrawEnd(): void {
        if (this.m_lastLayer != null) {
            const context = this.m_lastLayer.getContext('2d');
            context.putImageData(this.m_lastImageData, 0, 0);
            this.m_lastLayer = null;
        }
        if (this.m_lastAltLayer != null) {
            const alt_ctx = this.m_lastAltLayer.getContext('2d');
            alt_ctx.putImageData(this.m_lastAltImageData, 0, 0);
            this.m_lastAltLayer = null;
        }
    }
}

//
//  描画オペレーター0: NullDrawOp
//

/// 新しいインスタンスを初期化する。
export class NullDrawOp implements IDrawOp {
    constructor() { }

    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return false;
    }

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return false;
    }

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return false;
    }

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): void { }

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): void { }

    /// マージンを取得する。
    getMargin(): number { return 0; }
}

//
//  エフェクト0: NullEffect
//

/// 新しいインスタンスを取得する。
export class NullEffect implements IEffect {
    constructor() { }

    /// エフェクトを適用する。
    /// setParam()が返すクロージャ、apply()呼び出し前画像、引き続き与えられる点列points
    /// の3点で描画結果が一意に定まるエフェクトについては戻り値voidまたはnullを返す。
    /// そうでないエフェクトについては、(obj, points, layer)から描画結果を復元する
    /// クロージャ(描画復元クロージャ)を返す約束とする。
    apply(points: IPoint[], context: Context2D): IReproClosure { return null }

    /// マージンを取得する。
    getMargin() { return 0; }

    /// パラメータ設定のためのplace holder。
    setParam(setting: CommonSetting): IConfigClosure {
        return function (setting) { /*NOP*/ };
    }

    /// 画素定着対象レイヤーを取得する。(Optional)
    /// 画素定着先レイヤーがカレントレイヤーなら定義不要。
    getMasterLayer(e: IDrawingEvent): HTMLCanvasElement {
        return e.m_sender.getCurLayer();
    }
}

//
//  カーソル0: NullCursor
//

/// 新しいインスタンスを取得する。
export class NullCursor implements ICursor {
    constructor() { }

    /// カーソルを描画する。
    put(e: IDrawingEvent, cur_pt: IPoint, context: Context2D) { }

    /// カーソルをクリアする。
    clear(context: Context2D) { }

    /// パラメータ設定のためのplace holder。
    setParam(setting: CommonSetting) { }
}

//
//  描画オペレーター1: 手書き
//

/// 新しいインスタンスを初期化する。
export class DrawOp_FreeHand implements IDrawOp {
    m_bLineMode: boolean;

    constructor() {
        this.m_bLineMode = false;
    }

    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return this.testOnDrawing(e, points, context);
    }

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        // console.log("testOnDrawing: e.m_spKey=" + e.m_spKey);

        if (this.m_bLineMode) {   // (直線ガイドモード)
            if (points.length > 2) {
                points.splice(1, points.length - 2);  // 先頭と末尾以外を削除
            }
            if ((e.m_spKey & SpKey.KY_SHIFT) != 0) {  // (SHIFTキー押下)
                // 引き続き直線ガイドモード
                return false;
            } else {
                // 手書きモードに遷移
                this.m_bLineMode = false;
                return true;    // 直線ガイド内容でエフェクトをかける。
            }
        } else {    // (手書きモード)
            if ((e.m_spKey & SpKey.KY_SHIFT) != 0) {  // (SHIFTキー押下)
                // 直線ガイドモードに遷移
                this.m_bLineMode = true;
                return false;
            } else {
                // 手書きの標準動作: 即effect。
                return true;
            }
        }
        assert(false);
    }

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return true;
    }

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        this.guideOnDrawing(e, points, context);
    }

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        // console.log("guideOnDrawing() called.");
        if (points.length >= 2) {
            const pt1 = points[0];
            const pt2 = points[points.length - 1];
            context.globalCompositeOperation = 'xor';
            context.fillStyle = 'rgb(0,0,0)';
            draw_line_1px(pt1.x, pt1.y, pt2.x, pt2.y, context);
            context.globalCompositeOperation = 'source-over';
            // console.log(
            //   "draw_line_1px called. (" + pt1.x + ", " + pt1.y + ")-(" + pt2.x + ", " + pt2.y + ")"
            // );
        }
    }

    /// マージンを取得する。
    getMargin(): number { return 0; }
}

//
//  描画オペレータ2: 矩形領域指定(直線, 線四角, 四角 etc.)
//

/// 新しいインスタンスを初期化する。
export class DrawOp_Rectangle implements IDrawOp {
    m_bFilled: boolean;
    m_setting: CommonSetting;

    constructor(setting: CommonSetting, bFilled: boolean) {
        this.m_bFilled = bFilled;
        this.m_setting = setting;
    }

    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return false;
    }

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        if (points.length > 2) {
            points.splice(1, points.length - 2);  // 先頭と末尾以外を削除
            return false;
        }
    }

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        if (points.length > 2) {
            points.splice(1, points.length - 2);  // 先頭と末尾以外を削除
        }
        return true;
    }

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        this.guideOnDrawing(e, points, context);
    }

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        if (points.length >= 2) {
            const alt_ctx = e.m_sender.getOverlay().getContext('2d');

            // 最新描画色取得
            const setting = this.m_setting;
            const color = setting.getColor();

            // ガイド矩形決定
            const pt1 = points[0];
            const pt2 = points[points.length - 1];
            const r = encode_to_rect(pt1.x, pt1.y, pt2.x, pt2.y);

            // ガイド矩形描画
            // context.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
            context.globalAlpha = 0.5;
            context.fillStyle = color;
            if (this.m_bFilled) {
                context.fillRect(r.x, r.y, r.width, r.height);
            } else {
                draw_rect_R(r, context);
            }
            context.globalAlpha = 1.0;
            // context.globalCompositeOperation = 'source-over';

            // オーバレイにもガイドを描画
            alt_ctx.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
            alt_ctx.fillStyle = get_cursor_color(color);
            // alt_ctx.globalAlpha = 0.5;
            draw_rect_R(r, alt_ctx);
            // alt_ctx.globalAlpha = 1.0;
            alt_ctx.globalCompositeOperation = 'source-over';
        }
    }

    /// マージンを取得する。
    getMargin() { return 0; }

    /// 代替描画先レイヤーを指定する。(Optional)
    getAltLayer(e: IDrawingEvent): HTMLCanvasElement {
        return e.m_sender.getOverlay();
    }
}

//
//  描画オペレータ3: 画像コピー & ペースト(or 変形)操作
//  (単純コピーの他、ペースト前の画像加工にも対応可能)
//

export class PartialImage {
    readonly m_imgd: ImageData;
    readonly m_rect: IRect

    constructor(imgd: ImageData, rect: IRect) {
        this.m_imgd = imgd;
        this.m_rect = rect;
    }
}

export interface IYankFunc {
    (layer: HTMLCanvasElement, rect: IRect): PartialImage;
}

/// 新しいインスタンスを初期化する。
export class DrawOp_RectCapture implements IDrawOp {
    m_setting: CommonSetting;
    m_drawOpForGuide: IDrawOp;
    // コピー内容
    m_yankFunc: IYankFunc;
    m_yankData: PartialImage;
    // ペースト制御
    m_pasteHandlePoint: IPoint      // ペーストハンドル
    m_pasteGuideImgd: ImageData;    // ペースト時ガイド表示用の画像データ
    m_lastSpKeyState: number;

    constructor(setting: CommonSetting, /*[opt]*/ yankFunc: IYankFunc) {
        this.m_setting = setting;
        this.m_drawOpForGuide = new DrawOp_Rectangle(setting, false);

        // コピー内容
        if (yankFunc == null) {
            // デフォルトのyank関数
            // 指定レイヤーlayerの矩形領域rect内の画像をそのまま返す。
            yankFunc = function (layer, rect) {
                const context = layer.getContext('2d');
                const imgd = context.getImageData(rect.x, rect.y, rect.width, rect.height);
                return {
                    m_imgd: imgd,
                    m_rect: rect
                };
            };
        }
        this.m_yankFunc = yankFunc;       // yank関数
        this.m_yankData = null;           // yank関数の出力(画像データ)

        // ペースト制御
        // ペーストハンドルからのドラッグ量に合わせてペースト先をシフトさせる。
        // ペーストハンドルは、ペーストモードにおける描画ストローク開始位置が充てられる。
        this.m_pasteHandlePoint = null;   // ペーストハンドル
        this.m_pasteGuideImgd = null;     // ペースト時ガイド表示用の画像データ
        this.m_lastSpKeyState = 0x0;
    }

    /// ペーストモードの点列変換。
    convPointsToPasteArea(points: IPoint[]): void {
        // 最新クリック座標のみ取得
        const pt0 = points[points.length - 1];  // 末尾要素記憶

        // ペースト先矩形に変換
        let rect = this.m_yankData.m_rect;
        if (this.m_pasteHandlePoint == null) {
            // コピーモード終了時のguideOnDrawEnd()から呼ばれたときここに来る。
            // (SHIFTキー押下でペーストモード継続時も同じ。)
            /*NOP*/
        } else {
            // ペーストモード以降に呼ばれたときここに来る。
            const ofs_x = pt0.x - this.m_pasteHandlePoint.x;
            const ofs_y = pt0.y - this.m_pasteHandlePoint.y;
            const sx = rect.x + ofs_x;
            const sy = rect.y + ofs_y;
            rect = jsRect(sx, sy, rect.width, rect.height);
        }
        points.splice(0, points.length);      // 一旦空にする
        points[0] = jsPoint(rect.x, rect.y);
        points[1] = jsPoint(rect.x + rect.width - 1, rect.y + rect.height - 1);
    }

    /// ペーストモードのガイド表示を行う。
    drawPasteModeGuide(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        assert(points.length == 2);   // convPointsToPasteArea()による処理済pointsが前提。
        const alt_ctx = e.m_sender.getOverlay().getContext('2d');

        // オーバレイに画像データを描画
        // const imgd = this.m_yankData.m_imgd;
        const imgd = this.m_pasteGuideImgd;
        const rect = this.m_yankData.m_rect;
        const sx = points[0].x;
        const sy = points[0].y;
        alt_ctx.putImageData(imgd, sx, sy);
        const r = jsRect(sx, sy, rect.width, rect.height);

        // 最新描画色取得
        const setting = this.m_setting;
        const color = setting.getColor();

        // オーバレイにガイドを描画
        alt_ctx.globalCompositeOperation = 'xor';   // ガイドなのでxor描画
        alt_ctx.fillStyle = get_cursor_color(color);
        // alt_ctx.globalAlpha = 0.5;
        draw_rect_R(r, alt_ctx);
        // alt_ctx.globalAlpha = 1.0;
        alt_ctx.globalCompositeOperation = 'source-over';
    }

    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        if (this.m_yankData == null) {   // (コピーモード)
            return this.m_drawOpForGuide.testOnDrawStart(e, points, context);
        } else {    // (ペーストモード)
            // ペーストハンドル取得
            if (this.m_pasteHandlePoint == null) {
                this.m_pasteHandlePoint = points[0];
            }

            // ペーストエリアに変換
            this.convPointsToPasteArea(points);

            return false;
        }
    }

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        if (this.m_yankData == null) {    // (コピーモード)
            return this.m_drawOpForGuide.testOnDrawing(e, points, context);
        } else {    // (ペーストモード)
            // ペーストエリアに変換
            this.convPointsToPasteArea(points);

            return false;
        }
    }

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        if (this.m_yankData == null) {   // (コピーモード)
            // 矩形ガイド表示委譲先に後始末の機会を与える。
            this.m_drawOpForGuide.testOnDrawEnd(e, points, context);

            // この直後にguideOnDrawEnd()メソッドで
            // 矩形範囲内の画像を取得する。
            return false;
        } else {    // (ペーストモード)
            // ペーストエリアに変換
            this.convPointsToPasteArea(points);

            // 次モード決定準備
            // ここではモード遷移の判断材料の記憶のみ行う。
            // 実際のモード遷移はgotoNext()メソッドで行う。
            // この後エフェクトオブジェクトがm_yankDataを参照するので、
            // この場でリセットを伴うモード遷移はできない。
            this.m_lastSpKeyState = e.m_spKey;

            // この直後にエフェクトオブジェクトに取得画像を定着させる。
            // pointsは、convPointsToPasteArea()メソッドでペースト先を指す2点に変換済み。
            assert(points.length == 2);
            return ((this.m_lastSpKeyState & SpKey.KY_ALT) == 0);   // ALTキー押下状態ならpasteキャンセル
        }
    }

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        if (this.m_yankData == null) {    // (コピーモード)
            this.m_drawOpForGuide.guideOnDrawStart(e, points, context);
        } else {    // (ペーストモード)
            this.drawPasteModeGuide(e, points, context);
        }
    }

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        if (this.m_yankData == null) {    // (コピーモード)
            this.m_drawOpForGuide.guideOnDrawing(e, points, context);
        } else {    // (ペーストモード)
            this.drawPasteModeGuide(e, points, context);
        }
    }

    /// 描画ストローク終了時ガイド表示処理。
    guideOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        if (this.m_yankData == null) {    // (コピーモード)
            // 矩形ガイド表示委譲先に後始末の機会を与える。
            if (this.m_drawOpForGuide.guideOnDrawEnd != null) {
                this.m_drawOpForGuide.guideOnDrawEnd(e, points, context);
            }

            // 画像取得
            // console.log("DrawOp_RectCapture::guideOnDrawEnd(): Copying image...");
            // console.log(points);
            if (points.length >= 2) {
                // 画像データ取得
                assert(points.length == 2);
                const r = get_outbounds(points, 0);
                const curLayer = e.m_sender.getCurLayer();
                this.m_yankData = this.m_yankFunc(curLayer, r);   // ここでm_yankFuncに従い画像変換が行われる。

                // ガイド表示用画像生成
                const context = curLayer.getContext('2d');
                const src_imgd = this.m_yankData.m_imgd;
                this.m_pasteGuideImgd = context.createImageData(src_imgd.width, src_imgd.height);
                get_guide_image(src_imgd, this.m_pasteGuideImgd);

                // ペースト基準位置初期化
                this.m_pasteHandlePoint = null;

                // 最初のガイド表示
                this.convPointsToPasteArea(points);
                this.drawPasteModeGuide(e, points, context);
            }
        } else {
            // ALTキー押下でペーストがキャンセルされたときここに来る。
            // このときはSHIFTキー押下相当のrestartをかける。
            assert((this.m_lastSpKeyState & SpKey.KY_ALT) != 0);
            this.m_lastSpKeyState = SpKey.KY_SHIFT;
            this.gotoNext();
        }
    }

    /// マージンを取得する。
    getMargin(): number {
        return 0;
    }

    /// 代替描画先レイヤーを指定する。(Optional)
    getAltLayer(e: IDrawingEvent): HTMLCanvasElement {
        return e.m_sender.getOverlay();
    }

    /// コピーモードに戻る。(クラス固有)
    resetCapture(): void {
        this.m_yankData = null;
        this.m_pasteHandlePoint = null;
        this.m_pasteGuideImgd = null;
    }

    /// 画像データを取得する。(クラス固有)
    getYankData(): PartialImage {
        return this.m_yankData;
    }

    /// 次のモードに遷移する。(クラス固有)
    gotoNext(): void {
        if ((this.m_lastSpKeyState & SpKey.KY_SHIFT) != 0) {    // (SHIFTキー押下)
            // コピーデータを保持したまま現在のモードを維持する。
            // ただし、ペーストハンドルは取り直す。
            this.m_pasteHandlePoint = null;

            // コピー元位置にガイド表示
            // 一応動くが超Ad-hocなコードなので注意。
            // 現状のconvPointsToPasteArea()とdrawPasteModeGuide()の内部の詳細に
            // 大きく依存している。
            const points = [jsPoint(0, 0)];
            this.convPointsToPasteArea(points);
            // const dymmy_e = { m_sender: g_pictureCanvas };
            const dymmy_e: IDrawingEvent = new VirtualDrawingStartEvent(g_pictureCanvas, jsPoint(0, 0));
            this.drawPasteModeGuide(dymmy_e, points, null);
        } else {
            // コピーモードに戻る。
            this.resetCapture();
        }
    }
}

//
//  描画オペレータ4: 矩形領域の画像取得
//

/// 新しいインスタンスを初期化する。
export class DrawOp_BoundingRect implements IDrawOp {
    m_setting: CommonSetting;
    m_drawOpForGuide: IDrawOp;

    constructor(setting: CommonSetting) {
        this.m_setting = setting;
        this.m_drawOpForGuide = new DrawOp_Rectangle(setting, false);
    }

    /// 描画ストローク開始時の画素固定判断を行う。
    testOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return this.m_drawOpForGuide.testOnDrawStart(e, points, context);
    }

    /// 描画ストローク中の画素固定判断を行う。
    testOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        return this.m_drawOpForGuide.testOnDrawing(e, points, context);
    }

    /// 描画ストローク終了時の画素固定判断を行う。
    testOnDrawEnd(e: IDrawingEvent, points: IPoint[], context: Context2D): boolean {
        // 矩形ガイド表示委譲先に後始末の機会を与える。
        this.m_drawOpForGuide.testOnDrawEnd(e, points, context);

        // この直後にエフェクトオブジェクトに
        // 矩形範囲内の画像を処理させる。
        return true;
    }

    /// 描画ストローク開始時ガイド表示処理。
    guideOnDrawStart(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        this.m_drawOpForGuide.guideOnDrawStart(e, points, context);
    }

    /// 描画ストローク中ガイド表示処理。
    guideOnDrawing(e: IDrawingEvent, points: IPoint[], context: Context2D): void {
        this.m_drawOpForGuide.guideOnDrawing(e, points, context);
    }

    /// マージンを取得する。
    getMargin(): number {
        return 0;
    }

    /// 代替描画先レイヤーを指定する。(Optional)
    getAltLayer(e: DrawingEvent): HTMLCanvasElement {
        return e.m_sender.getOverlay();
    }
}

//
//  EffectBase01: 描画効果全般の基底クラス
//

// キャンバスに画素を直接置くタイプの効果(鉛筆や消しペン)の他、
// 将来水彩等にも使えるようにしている(つもり)。

interface IRenderGenForPixel {
    (x: number, y: number, context: Context2D): IReproClosure;
}

interface IRenderGenForLine {
    (x1: number, y1: number, x2: number, y2: number, context: Context2D): IReproClosure;
}

/// 新しいインスタンスを取得する。
export class EffectBase01 implements IEffect {
    m_ha: number
    m_pre_rendered: HTMLCanvasElement;
    m_runtime_renderer1: IRenderGenForPixel;
    m_runtime_renderer2: IRenderGenForLine;
    m_fGlobalAlpha: number;
    m_plotFunc: IPlotFunc;

    constructor() {
        this.setParamEx(null, null, null, null, null, false);
    }

    /// パラメータを設定する。(クラス固有)
    setParamEx(
        ha: number,                             // [in] Pre-rendering配置オフセット
        pre_rendered: HTMLCanvasElement,        // [in] Pre-rendering結果
        runtime_renderer1: IRenderGenForPixel,  // [in] 実行時render関数(1点用)
        runtime_renderer2: IRenderGenForLine,   // [in] 実行時render関数(2点用)
        fGlobalAlpha: number,                   // [in] α値([0, 1]で与えるので注意!)
        bCompositeWithCopy: boolean             // [in] Pre-rendering結果をcopyする。(描画先との合成無し)
    ) {
        this.m_ha = ha;
        this.m_pre_rendered = pre_rendered;
        this.m_runtime_renderer1 = runtime_renderer1;
        this.m_runtime_renderer2 = runtime_renderer2;
        this.m_fGlobalAlpha = fGlobalAlpha;
        if (pre_rendered != null && bCompositeWithCopy) {
            const ctx = pre_rendered.getContext('2d');
            const w = pre_rendered.width;
            const h = pre_rendered.height;
            const src_imgd = ctx.getImageData(0, 0, w, h);
            this.m_plotFunc = function (x, y, context) {
                putImageDataEx(src_imgd, context, x - ha, y - ha);
            };
        } else {
            this.m_plotFunc = null;
        }
    }

    /// エフェクトを適用する。
    apply(points: IPoint[], context: Context2D): IReproClosure {
        let reproClosure: IReproClosure;
        if (points.length == 1) {
            const pt = points[0];
            if (this.m_pre_rendered) {    // (Pre-rendering結果存在)
                if (this.m_plotFunc != null) {
                    this.m_plotFunc(pt.x, pt.y, context);
                } else {
                    let imgd: ImageData = this.m_pre_rendered.getContext('2d').getImageData();
                    createImageBitmap(imgd).then(
                        let imgd2:ImageData=
                    )
                    put_point(pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
                }
            } else {
                // 実行時render関数(1点用)呼び出し
                // runtime_render1の引数仕様がここに適用される。
                context.globalAlpha = this.m_fGlobalAlpha;
                reproClosure = this.m_runtime_renderer1(pt.x, pt.y, context);
                context.globalAlpha = 1.0;
            }
        } else {
            assert(points.length > 0);
            let prev = points[0];
            for (let i = 1; i < points.length; i++) {
                const pt = points[i];
                if (this.m_pre_rendered) {  // (Pre-rendering結果存在)
                    if (this.m_plotFunc != null) {
                        draw_line_w_plot_func(prev.x, prev.y, pt.x, pt.y, this.m_plotFunc, context);
                    } else {
                        draw_line(prev.x, prev.y, pt.x, pt.y, this.m_ha, this.m_pre_rendered, context);
                    }
                } else {
                    // 実行時render関数(2点用)呼び出し
                    // runtime_render2の引数仕様がここに適用される。
                    context.globalAlpha = this.m_fGlobalAlpha;
                    reproClosure = this.m_runtime_renderer2(prev.x, prev.y, pt.x, pt.y, context);
                    context.globalAlpha = 1.0;
                }
                prev = pt;
            }
        }

        return reproClosure;
    }

    /// マージンを取得する。
    /// これは派生クラスで定義する。
    getMargin(): number {
        throw new Error('Method not implemented.');
    }

    /// パラメータ設定
    /// これは派生クラスで定義する。
    setParam(setting: CommonSetting): IConfigClosure {
        throw new Error('Method not implemented.');
    }
}

//
//  エフェクト1: 鉛筆
//

/// 新しいインスタンスを取得する。
export class Effect_Pencil extends EffectBase01 {
    m_margin: number;
    m_bMakeFloatingLayer: boolean;
    m_prevPRParams: (number | string)[];

    constructor() {
        super();
        this.m_margin = null;
    }

    /// Pre-render関数。
    static pre_renderer(ha: number, diameter: number, color: string, alpha: number): HTMLCanvasElement {
        console.log("color=" + color);
        if (diameter > 1) {
            const mini_canvas = pre_render_pixel(ha, diameter, color, true);
            if (alpha < 255) {
                make_opaque(mini_canvas, alpha);
            }
            return mini_canvas;
        } else {
            return null;    // 1 px描画時はpre-renderingしない。(好みの問題)
        }
    }

    /// 実行時render関数(1点用)。
    static runtime_renderer1_ex(px: number, py: number, diameter: number, color: string, context: Context2D): void {
        // console.log("Effect_Pencil.runtime_renderer1() called.");
        assert(diameter == 1);    // 1 px描画時のみ呼ばれるはず。
        context.fillStyle = color;
        put_point_1px(px, py, context);
    }

    /// 実行時render関数(2点用)。
    static runtime_renderer2_ex(px1: number, py1: number, px2: number, py2: number, diameter: number, color: string, context: Context2D): void {
        // console.log("Effect_Pencil.runtime_renderer2() called.");
        assert(diameter == 1);    // 1 px描画時のみ呼ばれるはず。
        context.fillStyle = color;
        draw_line_1px(px1, py1, px2, py2, context);
    }

    /// パラメータを設定する。(クラス固有)
    setParamCustom(diameter: number, color: string, alpha: number) {
        // マージン決定
        this.m_margin = (diameter > 1) ? Math.ceil(diameter / 2) + 10 : 0;

        // 引数仕様合わせのためのクロージャ生成
        const runtime_renderer1: IPlotFunc = function (px, py, context) {
            Effect_Pencil.runtime_renderer1_ex(px, py, diameter, color, context);
        };
        const runtime_renderer2: IPlot2Func = function (px1, py1, px2, py2, context) {
            draw_line_1px(px1, py1, px2, py2, context);
            Effect_Pencil.runtime_renderer2_ex(px1, py1, px2, py2, diameter, color, context);
        };

        // α合成対応
        this.m_bMakeFloatingLayer = (alpha < 255);

        // Pre-rendering
        // 「やり直し」高速化のため、必要なとき以外前回のpre-rendering結果を使う。
        const ha = this.m_margin;
        const PRParams = [ha, diameter, color, alpha];
        let bPRChanged = false;
        if (this.m_prevPRParams == null) {
            this.m_prevPRParams = PRParams;
            bPRChanged = true;
        } else {
            for (let i = 0; i < PRParams.length; i++) {
                if (PRParams[i] != this.m_prevPRParams[i]) {
                    this.m_prevPRParams = PRParams;
                    bPRChanged = true;
                    break;
                }
            }
        }
        if (bPRChanged) {
            this.m_pre_rendered = Effect_Pencil.pre_renderer(ha, diameter, color, alpha);
        }

        // 描画条件決定
        super.setParamEx(
            ha,
            this.m_pre_rendered,
            runtime_renderer1,
            runtime_renderer2,
            alpha / 255.0,
            true
        );
    }

    /// パラメータを設定する。
    setParam(setting: CommonSetting): IConfigClosure {
        const diameter = setting.getThickness();
        const color = setting.getColor();
        const alpha = setting.getAlpha();
        this.setParamCustom(diameter, color, alpha);

        // 再設定のためのクロージャを返す(Undo/Redo)
        return function (obj: IEffect) {
            if (obj instanceof Effect_Pencil) {
                obj.setParamCustom(diameter, color, alpha);
            } else {
                throw new Error("*** ERR ***");
            }
        };
    }

    /// エフェクトを適用する。
    apply(points: IPoint[], context: Context2D): IReproClosure {
        return super.apply(points, context);
    }

    /// マージンを取得する。
    getMargin() { return this.m_margin; }

    /// 画素定着対象レイヤーを取得する。(Optional)
    getMasterLayer(e: IDrawingEvent): HTMLCanvasElement {
        if (this.m_bMakeFloatingLayer) {
            e.m_sender.makeFloatingLayer();
        }
        return e.m_sender.getCurDstLayer();
    }

    /// 描画ストロークを完結させる。(Optional)
    closeStroke(e: IDrawingEvent): void {
        e.m_sender.releaseFloatingLayer();
    }
}

//
//  エフェクト2: 消しペン
//

/// 新しいインスタンスを取得する。
export class Effect_Eraser extends EffectBase01 {
    constructor(diameter, color) {
        this.m_effectBase = new EffectBase01();
        this.m_margin = null;
    }

    // Pre-render関数は無し。

    /// 実行時render関数(1点用)。
    Effect_Eraser.runtime_renderer1_ex(px, py, diameter, context) {
        const radius = diameter / 2;
        const sx = Math.ceil(px - radius);
        const sy = Math.ceil(py - radius);
        const lx = Math.floor(px + radius);
        const d = lx - sx + 1;
        context.clearRect(sx, sy, d, d);
    }

    /// 実行時render関数(2点用)。
    Effect_Eraser.runtime_renderer2_ex(px1, py1, px2, py2, runtime_renderer1, context) {
        // console.log("runtime_renderer2() called.");
        // console.dir(runtime_renderer1);
        draw_line_w_runtime_renderer(px1, py1, px2, py2, runtime_renderer1, context);
    }

    /// パラメータを設定する。(クラス固有)
    setParamCustom(diameter, alpha) {
        // マージン決定
        this.m_margin = (diameter > 1) ? Math.ceil((1.5 * diameter) / 2) : 0;

        // 引数仕様合わせのためのクロージャ生成
        const runtime_renderer1 (px, py, context) {
            Effect_Eraser.runtime_renderer1_ex(px, py, diameter, context);
        };
        const runtime_renderer2 (px1, py1, px2, py2, context) {
            Effect_Eraser.runtime_renderer2_ex(px1, py1, px2, py2, runtime_renderer1, context);
        };
        // console.dir(runtime_renderer1);
        // console.dir(runtime_renderer2);

        // 描画条件決定
        const ha = this.m_margin;
        this.m_effectBase.setParamEx(
            ha,
            null,
            runtime_renderer1,
            runtime_renderer2,
            alpha / 255.0,
            false
        );
    }

    /// パラメータを設定する。
    setParam(setting) {
        const diameter = setting.getThickness();
        const alpha = setting.getAlpha();
        this.setParamCustom(diameter, alpha);

        // 再設定のためのクロージャを返す(Undo/Redo)
        return function (obj) { obj.setParamCustom(diameter, alpha); };
    }

    /// エフェクトを適用する。
    apply(points, context) {
        this.m_effectBase.apply(points, context);
    }

    /// マージンを取得する。
    getMargin() { return this.m_margin; }
}

//
//  エフェクト3: 鉛筆による線四角 or 四角
//

/// 新しいインスタンスを取得する。
export function Effect_PencilRect(bFilled) {
    this.m_effectBase = new EffectBase01();
    this.m_bFilled = bFilled;
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_PencilRect.runtime_renderer1_ex(px, py, color, context) {
    assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_PencilRect.runtime_renderer2_ex(px1, py1, px2, py2, color, bFilled, context) {
    const r = encode_to_rect(px1, py1, px2, py2);

    context.fillStyle = color;
    if (bFilled) {
        context.fillRect(r.x, r.y, r.width, r.height);
    } else {
        draw_rect_R(r, context);
    }
}

/// パラメータを設定する。(クラス固有)
Effect_PencilRect.prototype.setParamCustom(color, alpha) {
    // 引数仕様合わせのためのクロージャ生成
    const runtime_renderer1 = function (px, py, context) {
        Effect_PencilRect.runtime_renderer1_ex(px, py, color, context);
    };
    const bFilled = this.m_bFilled;
    const runtime_renderer2 = function (px1, py1, px2, py2, context) {
        Effect_PencilRect.runtime_renderer2_ex(px1, py1, px2, py2, color, bFilled, context);
    };

    // 描画条件決定
    this.m_effectBase.setParamEx(
        0,
        null,
        runtime_renderer1,
        runtime_renderer2,
        alpha / 255.0,
        false
    );
}

/// パラメータを設定する。
Effect_PencilRect.prototype.setParam(setting) {
    const color = setting.getColor();
    const alpha = setting.getAlpha();
    this.setParamCustom(color, alpha);

    // 再設定のためのクロージャを返す(Undo/Redo)
    return function (obj) { obj.setParamCustom(color, alpha); };
}

/// エフェクトを適用する。
Effect_PencilRect.prototype.apply(points, context) {
    this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_PencilRect.prototype.getMargin() { return 0; }

//
//  エフェクト4: 矩形領域ペースト
//

/// 新しいインスタンスを取得する。
export function Effect_RectPaste(copyAndPasteOp) {
    this.m_effectBase = new EffectBase01();
    this.m_copyAndPasteOp = copyAndPasteOp;   // 実行時rendering時に裏で手を握る相手
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_RectPaste.runtime_renderer1_ex(px, py, color, context) {
    assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_RectPaste.runtime_renderer2_ex(px1, py1, px2, py2, obj, context) {
    const r = encode_to_rect(px1, py1, px2, py2);

    // コピーデータのpaste
    const reproClosure;
    const yankData = obj.m_copyAndPasteOp.getYankData();
    if (yankData != null) {
        const imgd = yankData.m_imgd;
        assert(imgd.width == px2 - px1 + 1 && imgd.height == py2 - py1 + 1);
        // context.putImageData(imgd, px1, py1);
        putImageDataEx(imgd, context, px1, py1);

        // 描画再現クロージャ生成
        reproClosure = function (obj, points, layer) {
            const repro_ctx = layer.getContext('2d');
            putImageDataEx(imgd, repro_ctx, px1, py1);
        };
    } else {
        assert(false);    // ここに来たらバグ。
    }

    // 次のモードに遷移
    obj.m_copyAndPasteOp.gotoNext();

    return reproClosure;
}

/// パラメータを設定する。(クラス固有)
Effect_RectPaste.prototype.setParamCustom(color, alpha) {
    // 引数仕様合わせのためのクロージャ生成
    const runtime_renderer1 = function (px, py, context) {
        Effect_RectPaste.runtime_renderer1_ex(px, py, color, context);
    };
    const thisObj = this;     // 束縛変数
    const runtime_renderer2 = function (px1, py1, px2, py2, context) {
        return Effect_RectPaste.runtime_renderer2_ex(px1, py1, px2, py2, thisObj, context);
    };

    // 描画条件決定
    this.m_effectBase.setParamEx(
        0,
        null,
        runtime_renderer1,
        runtime_renderer2,
        alpha / 255.0,
        false
    );
}

/// パラメータを設定する。
Effect_RectPaste.prototype.setParam(setting) {
    const color = setting.getColor();
    const alpha = setting.getAlpha();
    this.setParamCustom(color, alpha);

    // 再設定のためのクロージャを返す(Undo/Redo)
    return function (obj) { obj.setParamCustom(color, alpha); };
}

/// エフェクトを適用する。
Effect_RectPaste.prototype.apply(points, context) {
    return this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_RectPaste.prototype.getMargin() { return 0; }

//
//  エフェクト5: 消し四角
//

/// 新しいインスタンスを取得する。
export function Effect_RectEraser() {
    this.m_effectBase = new EffectBase01();
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_RectEraser.runtime_renderer1_ex(px, py, context) {
    assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_RectEraser.runtime_renderer2_ex(px1, py1, px2, py2, context) {
    const r = encode_to_rect(px1, py1, px2, py2);
    context.clearRect(r.x, r.y, r.width, r.height);
}

/// パラメータを設定する。(クラス固有)
Effect_RectEraser.prototype.setParamCustom(alpha) {
    // 引数仕様合わせのためのクロージャ生成
    const runtime_renderer1 = function (px, py, context) {
        Effect_RectEraser.runtime_renderer1_ex(px, py, context);
    };
    const runtime_renderer2 = function (px1, py1, px2, py2, context) {
        Effect_RectEraser.runtime_renderer2_ex(px1, py1, px2, py2, context);
    };

    // 描画条件決定
    this.m_effectBase.setParamEx(
        0,
        null,
        runtime_renderer1,
        runtime_renderer2,
        alpha / 255.0,
        false
    );
}

/// パラメータを設定する。
Effect_RectEraser.prototype.setParam(setting) {
    const alpha = setting.getAlpha();
    this.setParamCustom(alpha);

    // 再設定のためのクロージャを返す(Undo/Redo)
    return function (obj) { obj.setParamCustom(alpha); };
}

/// エフェクトを適用する。
Effect_RectEraser.prototype.apply(points, context) {
    this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_RectEraser.prototype.getMargin() { return 0; }

//
//  エフェクト6: 上下 or 左右反転
//

/// 新しいインスタンスを取得する。
export function Effect_FlipRect(bVert) {
    this.m_bVert = bVert;
    this.m_effectBase = new EffectBase01();
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_FlipRect.runtime_renderer1_ex(px, py, context) {
    assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_FlipRect.runtime_renderer2_ex(px1, py1, px2, py2, bVert, context) {
    const r = encode_to_rect(px1, py1, px2, py2);
    const imgd_src = context.getImageData(r.x, r.y, r.width, r.height);
    const imgd_dst = context.createImageData(r.width, r.height);
    if (bVert) {
        get_vert_flip_image(imgd_src, imgd_dst);
    } else {
        get_mirror_image(imgd_src, imgd_dst);
    }
    context.putImageData(imgd_dst, r.x, r.y);
}

/// パラメータを設定する。(クラス固有)
Effect_FlipRect.prototype.setParamCustom(alpha) {
    // 引数仕様合わせのためのクロージャ生成
    const runtime_renderer1 = function (px, py, context) {
        Effect_FlipRect.runtime_renderer1_ex(px, py, context);
    };
    const bVert = this.m_bVert;   // 束縛変数
    const runtime_renderer2 = function (px1, py1, px2, py2, context) {
        Effect_FlipRect.runtime_renderer2_ex(px1, py1, px2, py2, bVert, context);
    };

    // 描画条件決定
    this.m_effectBase.setParamEx(
        0,
        null,
        runtime_renderer1,
        runtime_renderer2,
        alpha / 255.0,
        false
    );
}

/// パラメータを設定する。(クラス固有)
Effect_FlipRect.prototype.setParam(setting) {
    const alpha = setting.getAlpha();
    this.setParamCustom(alpha);

    // 再設定のためのクロージャを返す(Undo/Redo)
    return function (obj) { obj.setParamCustom(alpha); };
}

/// エフェクトを適用する。
Effect_FlipRect.prototype.apply(points, context) {
    this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_FlipRect.prototype.getMargin() { return 0; }

//
//  エフェクト7: ハーフトーン
//

/// ハーフトーンの最大周期
/// これを超える周期のハーフトーンは透明とみなす。
const max_halftone_cyc = 256;

/// 新しいインスタンスを取得する。
export function Effect_Halftone() {
    this.m_effectBase = new EffectBase01();
    this.m_pre_rendered = null;
    this.m_color = null;
    this.m_alpha = null;
    this.m_lastContext = null;
    this.m_halftone_imgd = null;
}

/// ハーフトーンパターンを更新する。
Effect_Halftone.prototype.updateHalftone(alpha, context) {
    if (!(context === this.m_lastContext)) {
        const RGB_cc = get_components_from_RGBx(this.m_color);
        const ptnGenerator = select_lattice_automatically(this.m_alpha, RGB_cc);
        this.m_halftone_imgd = ptnGenerator(context);
        this.m_lastContext = context;
    }
}

/// ハーフトーンをplotする関数。
Effect_Halftone.prototype.plotHalftone(px, py, context) {
    assert(this.m_halftone_imgd != null);
    assert(this.m_lastContext == context);
    const cyc_h = this.m_halftone_imgd.width;
    const cyc_v = this.m_halftone_imgd.height;
}

// Pre-render関数は無し。

/// 実行時render関数(1点用)。
Effect_Halftone.runtime_renderer1_ex(px, py, obj, context) {
    obj.updateHalftone();
    assert(false);    // ここに来たらバグ(DrawOpとの連携上有り得ない。)
}

/// 実行時render関数(2点用)。
Effect_Halftone.runtime_renderer2_ex(px1, py1, px2, py2, color, alpha, context) {
    obj.updateHalftone();
    const r = encode_to_rect(px1, py1, px2, py2);
    const imgd_src = context.getImageData(r.x, r.y, r.width, r.height);
    const imgd_dst = context.createImageData(r.width, r.height);
    if (bVert) {
        get_vert_flip_image(imgd_src, imgd_dst);
    } else {
        get_mirror_image(imgd_src, imgd_dst);
    }
    context.putImageData(imgd_dst, r.x, r.y);
}

/// パラメータを設定する。(クラス固有)
Effect_Halftone.prototype.setParamCustom(color, alpha, diameter) {
    this.m_margin = (diameter > 1) ? Math.ceil(diameter / 2) + 10 : 0;
    this.m_pre_rendered = pre_render_pixel(this.m_margin, diameter, 'rgb(0,0,0)', true);
    this.m_color = color;
    this.m_alpha = alpha;

    // 引数仕様合わせのためのクロージャ生成
    const obj = this;
    const runtime_renderer1 = function (px, py, context) {
        Effect_Halftone.runtime_renderer1_ex(px, py, obj, context);
    };
    const runtime_renderer2 = function (px1, py1, px2, py2, context) {
        Effect_Halftone.runtime_renderer2_ex(px1, py1, px2, py2, obj, context);
    };

    // 描画条件決定
    this.m_effectBase.setParamEx(
        0,
        null,
        runtime_renderer1,
        runtime_renderer2,
        1.0,  // ハーフトーンツールはα値を不透明な点の密度と解釈し、半透明描画しない。
        false
    );
}

/// パラメータを設定する。(クラス固有)
Effect_Halftone.prototype.setParam(setting) {
    const color = setting.getColor();
    const alpha = setting.getAlpha();
    const diameter = setting.getThickness();
    this.setParamCustom(color, alpha, diameter);

    // 再設定のためのクロージャを返す(Undo/Redo)
    return function (obj) { obj.setParamCustom(color, alpha, diameter); };
}

/// エフェクトを適用する。
Effect_Halftone.prototype.apply(points, context) {
    this.m_effectBase.apply(points, context);
}

/// マージンを取得する。
Effect_Halftone.prototype.getMargin() { return this.m_margin; }

//
//  CursorBase01: 円形や方形等のカーソルの基底クラス
//

/// 新しいインスタンスを取得する。
export function CursorBase01(diameter, pixel_pre_renderer) {
    this.m_pre_renderer = pixel_pre_renderer;

    if (diameter == null) { diameter = 1; }
    this.setParamCustom(diameter, 'rgb(0,0,0)', pixel_pre_renderer);
}

/// パラメータを設定する。(クラス固有)
CursorBase01.prototype.setParamCustom(diameter, color, pixel_pre_renderer) {
    const margin = Math.ceil(diameter / 2);
    color = get_cursor_color(color);

    this.m_pre_rendered = null;
    this.m_ha = 0;
    this.m_prev_pt = null;

    if (diameter > 1) {
        this.m_ha = Math.ceil(diameter / 2 + margin);
        this.m_pre_rendered = pixel_pre_renderer(this.m_ha, diameter, color, false);
    }

    this.m_imagePatch = null;
}

/// パラメータを設定する。
CursorBase01.prototype.setParam(setting) {
    const diameter = setting.getThickness();
    const color = setting.getColor();
    this.setParamCustom(diameter, color, this.m_pre_renderer);
}

/// カーソルを描画する。
CursorBase01.prototype.put(e, cur_pt, context) {
    const layer = e.m_sender.getOverlay();
    const w = layer.width;    // clientWidthやclientHeightは、非表示化時に0になる@FireFox
    const h = layer.height;   // (同上)
    // console.log("layer: w=" + layer.width + ", h=" + layer.height);

    context.globalCompositeOperation = 'xor';
    this.m_imagePatch = new ImagePatch(context, w, h, [cur_pt], this.m_ha);
    if (this.m_pre_rendered) {
        put_point(cur_pt.x, cur_pt.y, this.m_ha, this.m_pre_rendered, context);
    } else {
        put_point_1px(cur_pt.x, cur_pt.y, context);
    }
    context.globalCompositeOperation = 'source-over';
    this.m_prev_pt = cur_pt;
}

/// カーソルをクリアする。
CursorBase01.prototype.clear(context) {
    if (this.m_imagePatch) {
        this.m_imagePatch.restore(context);
    }
    this.m_imagePatch = null;
}

//
//  カーソル1: 円形カーソル
//

/// 新しいインスタンスを取得する。
export function Cursor_Circle(diameter) {
    this.m_cursorBase = new CursorBase01(diameter, pre_render_pixel);
}

/// パラメータを設定する。
Cursor_Circle.prototype.setParam(setting) {
    this.m_cursorBase.setParam(setting);
}

/// カーソルを描画する。
Cursor_Circle.prototype.put(e, cur_pt, context) {
    this.m_cursorBase.put(e, cur_pt, context);
}

/// カーソルをクリアする。
Cursor_Circle.prototype.clear(context) {
    this.m_cursorBase.clear(context);
}

//
//  カーソル2: 方形カーソル
//

/// 新しいインスタンスを取得する。
export function Cursor_Square(diameter) {
    this.m_cursorBase = new CursorBase01(diameter, pre_render_square);
}

/// パラメータを設定する。(クラス固有)
Cursor_Square.prototype.setParam(setting) {
    this.m_cursorBase.setParam(setting);
}

/// カーソルを描画する。
Cursor_Square.prototype.put(e, cur_pt, context) {
    this.m_cursorBase.put(e, cur_pt, context);
}

/// カーソルをクリアする。
Cursor_Square.prototype.clear(context) {
    this.m_cursorBase.clear(context);
}

//
//	DwgHistory
//

enum OebiEventType {
    Normal,
    Paint,
    VisibilityChange
}

class ImageSnapshot {
    m_imageDataList: ImageData[];
    m_visibilityList: boolean[];

    constructor(imgdList: ImageData[], visibilityList: boolean[]) {
        this.m_imageDataList = imgdList;
        this.m_visibilityList = visibilityList;
    }
};

class DwgHistEnt {
    // [0] 描画イベント
    m_oebiEvent: OebiEventType;
    // [1] エフェクト
    m_effect: IEffect;
    // [2] エフェクト設定クロージャ
    m_configClosure: IConfigClosure;
    // [3] 対象レイヤー番号
    m_layerNo: number;
    // [4] 点列
    m_pointSeq: IPoint[];
    // [5] マスクツール
    m_maskTool: MaskTool;
    // [6] マスク色
    m_maskColor: string;
    // [7] 描画再現クロージャ
    m_reproClosure: IReproClosure;

    constructor() {
        this.m_oebiEvent = OebiEventType.Normal;
    }
}

class PaintHistEnt {
    // [0] 描画イベント
    m_oebiEvent: OebiEventType;
    // [1] 開始点
    m_startPoint: IPoint;
    // [2] 配置色
    m_color: string;
    // [3] 対象レイヤー番号
    m_layerNo: number;
    // [4] マスクツール
    m_maskTool: MaskTool;
    // [5] マスク色
    m_maskColor: string;

    constructor() {
        this.m_oebiEvent = OebiEventType.Paint;
    }
}

class VisibilityChangeHistEnt {
    // [0] 描画イベント
    m_oebiEvent: OebiEventType;
    // [1] 可視性リスト
    m_visibilityList: boolean[];
}

type HistEnt = (DwgHistEnt | PaintHistEnt | VisibilityChangeHistEnt);

// Type guard
function isDwgHistEnt(ent: HistEnt): ent is DwgHistEnt {
    return (ent.m_oebiEvent == OebiEventType.Normal);
}
function isPaintHistEnt(ent: HistEnt): ent is PaintHistEnt {
    return (ent.m_oebiEvent == OebiEventType.Normal);
}
function isVisibilityChangeHistEnt(ent: HistEnt): ent is VisibilityChangeHistEnt {
    return (ent.m_oebiEvent == OebiEventType.VisibilityChange);
}

export class UIOpHistory {
    // 関連オブジェクト
    m_toolPalette: ToolPalette;
    m_pictCanvas: PictureCanvas;
    // 履歴メモリ
    m_eventHistory: HistEnt[];
    // 画像添付エントリの辞書
    m_imageLog: ImageSnapshot[];
    // 履歴カーソル
    // 次にイベントを追記すべき場所を示す。
    m_historyCursor: number;
    // イベント追記制御
    m_bDealing: boolean;
    // 操作履歴変更リスナ
    m_historyRewindListeners: IHistoryRewindListenerObject[];

    /// 新しいインスタンスを初期化する。
    constructor(toolPalette: ToolPalette, pictCanvas: PictureCanvas) {
        // 関連オブジェクト
        this.m_toolPalette = toolPalette;
        this.m_pictCanvas = pictCanvas;
        // 履歴メモリ
        this.m_eventHistory = [];
        // 画像添付エントリの辞書
        this.m_imageLog = [];
        // 履歴カーソル
        // 次にイベントを追記すべき場所を示す。
        this.m_historyCursor = 0;
        // イベント追記制御
        this.m_bDealing = false;
        // 操作履歴変更リスナ
        this.m_historyRewindListeners = [];
    }

    /// 空か否かを返す。
    empty(): boolean {
        return !(this.m_eventHistory.length > 0);
    }

    /// 操作履歴の長さ(イベント数)を返す。
    getLength(): number {
        return this.m_eventHistory.length;
    }

    /// 操作履歴のカーソル位置を返す。
    getCursorIdx(): number {
        // appendEffect()他、履歴カーソルを進めるメソッドを呼んだ直後は、
        // 当メソッドの戻り値と、getLength()メソッドの戻り値は一致する。
        // wayBackTo()メソッドを呼ぶと、引数に与えたidxに対し、
        // (idxが正しく履歴の範囲内ならば)当メソッドの戻り値もidxになる。
        return this.m_historyCursor;
    }

    /// 履歴カーソル位置に対する直近過去の添付画像と
    /// 現キャンバスとの間に可視属性に違いがあるか否か判定する。
    isVisibilityChanged(): boolean {
        // 履歴先頭は常に違い無しとみなす。
        if (this.m_historyCursor <= 0)
            return false;

        // 履歴カーソルに対して直近過去の画像付きエントリ取得
        assert(this.m_historyCursor > 0);
        const restorePointIdx = this.getImageHavingIdxBefore(this.m_historyCursor - 1);
        assert(restorePointIdx != null);    // [0]が必ず画像付きのため、nullにはならないはず。

        // 可視属性を現キャンバスと比較
        const pictureInfo = this.m_imageLog[restorePointIdx];
        const nlayers = this.m_pictCanvas.getNumLayers();
        for (let i = 0; i < nlayers; i++) {
            const v1 = pictureInfo.m_visibilityList[i];
            const v2 = this.m_pictCanvas.getLayerVisibility(i);
            if (v1 != v2)
                return true;
        }

        return false;
    }

    /// エフェクト内容を追記する。
    /// 当メソッド呼び出しで、履歴カーソルが1エントリ進む。
    appendEffect(effectObj: IEffect, configClosure: IConfigClosure, layerNo: number): void {
        if (this.m_bDealing)
            return;

        // 履歴カーソル以降を削除
        if (this.m_historyCursor > 0) {
            const prevHistEnt = this.m_eventHistory[this.m_historyCursor - 1];
            if (isDwgHistEnt(prevHistEnt)) {
                if (prevHistEnt.m_pointSeq.length <= 0
                    && prevHistEnt.m_reproClosure == null
                ) {
                    // 空のイベントなので削除
                    this.m_historyCursor--;
                }
            }
        }
        this.resetEvent(this.m_historyCursor);
        console.log("DwgHistory::appendEffect() called. Cursor=" + this.m_historyCursor);

        // キャンバス状態のスナップショット取得判断
        if (this.isVisibilityChanged()) {
            this.appendVisibilityChange();
        }

        // イベント追記
        let histEnt: DwgHistEnt;                    // 通常の描画イベント
        histEnt.m_effect = effectObj;               // エフェクト
        histEnt.m_configClosure = configClosure;    // エフェクトを設定するクロージャ
        histEnt.m_layerNo = layerNo;                // 対象レイヤー番号
        histEnt.m_pointSeq = [];                    // 点列
        const maskTool = this.m_toolPalette.getActiveMaskTool();
        histEnt.m_maskTool = maskTool;              // マスクツール
        const maskColor = this.m_toolPalette.getCommonSetting().getMaskColor();
        histEnt.m_maskColor = maskColor;            // マスク色
        histEnt.m_reproClosure = null;              // 描画再現クロージャ
        this.m_eventHistory.push(histEnt);
        console.log(this.m_imageLog);

        // 履歴カーソル修正
        // (インクリメントと同じ)
        this.m_historyCursor = this.m_eventHistory.length;
    }

    /// 履歴カーソルの一つ前のエントリに点列を追記する。
    /// reproClosure == nullなら、当メソッド呼び出しでは履歴カーソルは動かない。
    /// reproClosure != nullのとき、履歴カーソルが1エントリ進む。
    appendPoints(effectObj: IEffect, points: IPoint[], reproClosure: IReproClosure): void {
        if (this.m_bDealing)
            return;
        console.log("DwgHistory::appendPoints() called. Cursor=" + (this.m_historyCursor - 1));

        // 点列追記
        // 追記先は、エフェクト内容を最後に追記したエントリ。
        // ただし当該エントリが描画再現エントリ(描画再現クロージャ != null)であれば、
        // 次のエントリを作成してそこに追記する。
        assert(this.m_historyCursor > 0);
        let histEnt = this.m_eventHistory[this.m_historyCursor - 1];
        if (isDwgHistEnt(histEnt)) {
            assert(histEnt.m_oebiEvent == OebiEventType.Normal && histEnt.m_effect == effectObj);
            if (histEnt.m_reproClosure != null) {   // (描画再現エントリ)
                // 同じエフェクトオブジェクトとconfigクロージャで新たなエントリを追記
                // 引き続くappendPoint()呼び出しは追記したエントリを対象とする。
                this.appendEffect(effectObj, histEnt.m_configClosure, histEnt.m_layerNo);
                histEnt = this.m_eventHistory[this.m_historyCursor - 1];
            }
        }
        if (isDwgHistEnt(histEnt)) {
            if (reproClosure == null) {
                for (let i = 0; i < points.length; i++) {
                    histEnt.m_pointSeq.push(points[i]);
                }
                histEnt.m_reproClosure = null;
            } else {
                histEnt.m_pointSeq = points;    // 描画再現のためには最新のpointsのみが必要。
                histEnt.m_reproClosure = reproClosure;
            }
        }
    }

    /// 塗り潰し操作を追記する。
    /// 当メソッド呼び出しで、履歴カーソルが1エントリ進む。
    appendPaintOperation(point: IPoint, color: string, layerNo: number): void {
        if (this.m_bDealing)
            return;

        // 履歴カーソルより後を削除
        this.resetEvent(this.m_historyCursor);
        console.log("DwgHistory::appendPaintOperation() called. Cursor=" + this.m_historyCursor);

        // キャンバス状態のスナップショット取得判断
        if (this.isVisibilityChanged()) {
            this.appendVisibilityChange();
        }

        // イベント追記
        let histEnt: PaintHistEnt;          // 塗り潰しイベント
        histEnt.m_startPoint = point;       // 開始点
        histEnt.m_color = color;            // 配置色
        histEnt.m_layerNo = layerNo;        // 対象レイヤー番号
        const maskTool = this.m_toolPalette.getActiveMaskTool();
        histEnt.m_maskTool = maskTool;      // マスクツール
        const maskColor = this.m_toolPalette.getCommonSetting().getMaskColor();
        histEnt.m_maskColor = maskColor;    // マスク色
        this.m_eventHistory.push(histEnt);
        console.log(this.m_imageLog);

        // 履歴カーソル修正
        // (インクリメントと同じ)
        this.m_historyCursor = this.m_eventHistory.length;
    }

    /// 操作履歴の先端にレイヤー可視属性変更を追記する。
    /// 当メソッドの呼び出しで、履歴カーソルが1エントリ進む。
    appendVisibilityChange(): void {
        // 操作履歴の先端のみで呼ばれるはず。
        // 仮に操作履歴の途中でレイヤー可視属性を追記すると、
        // 追記箇所にもともといた履歴エントリが上書きされ、redo不能になるのでNG。
        assert(this.m_historyCursor == this.m_eventHistory.length);

        // 履歴カーソルに対して直近過去の画像付きエントリ取得
        assert(this.m_historyCursor > 0);
        const restorePointIdx = this.getImageHavingIdxBefore(this.m_historyCursor - 1);
        assert(restorePointIdx != null);    // [0]が必ず画像付きのため、nullにはならないはず。
        const prevSnapshot = this.m_imageLog[restorePointIdx];

        // 最新スナップショット取得
        this.attatchImage();
        const sv_cursor = this.m_historyCursor;
        const lastSnapshot = this.m_imageLog[sv_cursor];

        // レイヤー可視属性記録
        let histEnt: VisibilityChangeHistEnt;     // 可視性変更イベント
        histEnt.m_visibilityList = lastSnapshot.m_visibilityList;
        this.m_eventHistory.push(histEnt);

        // 履歴カーソル修正
        // (インクリメントと同じ)
        this.m_historyCursor = this.m_eventHistory.length;

        // 最新スナップショットを最新カーソル位置に添付
        this.m_imageLog[this.m_historyCursor] = lastSnapshot;

        // 可視属性変更直前のスナップショットを一つ前のエントリに添付
        // 当履歴エントリ前後では可視属性しか変更していないので、
        // 画像データはlastSnapshotと同じ。
        // 可視属性はprevSnapshotの可視属性と同じ。
        this.m_imageLog[sv_cursor] = new ImageSnapshot(
            lastSnapshot.m_imageDataList,
            prevSnapshot.m_visibilityList
        );
    }

    /// 履歴カーソルが指すエントリに対し、画像添付を予約する。
    /// 当メソッド呼び出しでは履歴カーソルは変化しない。
    attatchImage(): void {
        if (this.m_bDealing)
            return;
        console.log("DwgHistory::attatchImage() called. Cursor=" + this.m_historyCursor);

        // 作業中レイヤーを固定
        this.m_pictCanvas.raiseLayerFixRequest();

        // レイヤーの画像データと可視属性取得
        const imgdList = [];
        const visibilityList = [];
        const nlayers = this.m_pictCanvas.getNumLayers();
        for (let i = 0; i < nlayers; i++) {
            const layer = this.m_pictCanvas.getLayer(i);
            const w = layer.width;
            const h = layer.height;
            const ctx = layer.getContext('2d');
            imgdList[i] = ctx.getImageData(0, 0, w, h);
            visibilityList[i] = this.m_pictCanvas.getLayerVisibility(i);
        }
        const pictureInfo = new ImageSnapshot(imgdList, visibilityList);

        // 画像添付予約
        this.m_imageLog[this.m_historyCursor] = pictureInfo;
        console.log("DwgHistory::attatchImage(): Reserved to cursor " + this.m_historyCursor + ".");
        console.log(visibilityList);
    }

    /// 指定エントリの画像を復元する。
    restoreImage(idx: number, pictureCanvas: PictureCanvas) {
        if (!(idx in this.m_imageLog))
            return false;     // 画像無しエントリならfalseを返す。
        console.log("DwgHistory::restoreImage(): Restoreing cursor " + idx + "...");

        // レイヤーの画像と可視属性を復元
        const pictureInfo = this.m_imageLog[idx];
        const nlayers = pictureCanvas.getNumLayers();
        for (let i = 0; i < nlayers; i++) {
            const imgd = pictureInfo.m_imageDataList[i];
            const layer = pictureCanvas.getLayer(i);
            assert(imgd.width == layer.width && imgd.height == layer.height);
            const ctx = layer.getContext('2d');
            ctx.putImageData(imgd, 0, 0);
            const v = pictureInfo.m_visibilityList[i];
            pictureCanvas.setLayerVisibility(i, v);
        }

        // レイヤー可視属性をレイヤーツールに反映
        this.m_toolPalette.setLayerVisibilityEx(pictureInfo.m_visibilityList);

        // マスク/逆マスクツールのinvalidate
        // サーフェス上の画像と内部状態を破棄し、復元画像で作り直す。
        this.m_toolPalette.invalidateMaskTools();

        return true;
    }

    /// 添付画像付き(またや予約中)履歴エントリのindexを昇順で返す。
    getImageHavingIndices(): number[] {
        const keys = Object.keys(this.m_imageLog);
        const indices: number[] = [];
        for (let i = 0; i < keys.length; i++) {
            indices.push(parseInt(keys[i]));
        }
        indices.sort(function (a, b) { return a - b; });
        return indices;
    }

    /// イベントをリセットする。
    resetEvent(resetPointIdx: number) {
        if (resetPointIdx >= this.m_eventHistory.length)
            return false;

        // [resetPointIdx]以降のイベントエントリを削除
        const deleteCount = this.m_eventHistory.length - resetPointIdx;
        this.m_eventHistory.splice(resetPointIdx, deleteCount);
        this.m_historyCursor = resetPointIdx;

        // [resetPointIdx]より後の添付画像を削除
        // [resetPointIdx]への画像添付予約はそのままとする。
        const indices = this.getImageHavingIndices();
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] > resetPointIdx) {
                delete this.m_imageLog[indices[i]];
            }
        }

        return true;
    }

    /// 指定indexに対し、現在または直近過去の(未来ではない)画像付きエントリのindexを返す。
    getImageHavingIdxBefore(idx: number): number {
        // [0..idx]の範囲で逆順でループを回すのではなく
        // DwgHistory::getImageHavingEventIndices()を呼ぶのは、
        // (idx == this.m_eventHistory.length)のときがあるため。
        let foundIdx: number = null;
        const indices = this.getImageHavingIndices();
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] <= idx) {
                foundIdx = indices[i];
            } else {
                break;
            }
        }
        return foundIdx;
    }

    /// 履歴を指定位置に戻す。
    /// 履歴エントリの先頭から[idx-1]までの内容を復元する。
    /// ただし、[idx]が画像付きエントリの場合は当該画像を直接描画する。
    wayBackTo_Core(idx: number): void {
        // 未来でない直近の画像付きエントリ取得
        const restorePointIdx = this.getImageHavingIdxBefore(idx);
        assert(restorePointIdx != null);    // [0]が必ず画像付きのため、nullにはならないはず。

        // 画像付きエントリの画像を描画
        this.restoreImage(restorePointIdx, this.m_pictCanvas);

        // [idx-1]までを差分再生
        for (let i = restorePointIdx; i < idx; i++) {
            this.wayBackTo_Sub(i);
        }

        // 履歴カーソル修正
        this.m_historyCursor = idx;
    }

    /// 差分計算して画像を更新する。
    wayBackTo_Sub(idx: number): void {
        // 描画準備
        const histEnt = this.m_eventHistory[idx];
        const k = 0;
        if (isDwgHistEnt(histEnt)) {
            const effectObj = histEnt.m_effect;
            const configClosure = histEnt.m_configClosure;
            const layerNo = histEnt.m_layerNo;
            const points = histEnt.m_pointSeq;
            const maskTool = histEnt.m_maskTool;
            const maskColor = histEnt.m_maskColor
            const reproClosure = histEnt.m_reproClosure;
            configClosure(effectObj);     // 適切なEffect::setParam()を描画時の引数で呼ぶ。
            this.m_toolPalette.activateMaskTool(maskTool, maskColor);   // マスクツール設定

            // getMasterLayer()追加に伴うAd-hocな対応
            let layer: (number | HTMLCanvasElement);
            if (effectObj.getMasterLayer != null) {
                layer = layerNo;    // Ad-hoc; このときlayerNoの中身はlayerへの参照。
            } else {
                layer = this.m_pictCanvas.getLayer(layerNo);
            }

            // 描画
            if (reproClosure == null) {
                // 描画ツールをクリックだけして別のツールをクリックした場合は
                // 点列が空の履歴エントリとなるので、(points.length > 0)のガード条件が必要。
                if (points.length > 0) {
                    if (layer instanceof HTMLCanvasElement) {
                        const context = layer.getContext('2d');
                        effectObj.apply(points, context);
                    } else {
                        throw new Error("*** ERR ***");
                    }
                }
            } else {
                reproClosure(effectObj, points, layer);
            }
            if (effectObj.closeStroke != null) {
                const dummy_e = new PointingEventClone()
                const dummy_e = { m_sender: this.m_pictCanvas };    // Ad-hoc
                effectObj.closeStroke(dummy_e);
            }
        } else if (isPaintHistEnt(histEnt)) {
            const point = histEnt.m_startPoint;
            const color = histEnt.m_color;
            const layerNo = histEnt.m_layerNo;
            const maskTool = histEnt.m_maskTool;
            const maskColor = histEnt.m_maskColor;
            this.m_toolPalette.activateMaskTool(maskTool, maskColor);   // マスクツール設定

            // 描画
            const layer = this.m_pictCanvas.getLayer(layerNo);
            const ffst = new FloodFillState(layer, point.x, point.y, color);
            ffst.fill();
        } else if (isVisibilityChangeHistEnt(histEnt)) {
            const visibilityList = histEnt.m_visibilityList;
            this.m_toolPalette.setLayerVisibilityEx(visibilityList);
        } else {
            assert(false);
        }
    }

    /// 履歴を指定位置に戻す。
    wayBackTo(idx: number): void {
        // 履歴の先端からの巻き戻しの処理
        if (this.m_historyCursor == this.m_eventHistory.length
            && idx < this.m_historyCursor) {
            // Redoで可視属性が復元されるように追記
            if (this.isVisibilityChanged()) {   // (可視属性変化有り)
                this.appendVisibilityChange();
                idx = this.m_eventHistory.length - 1;
            }

            // 必要なツールにundo発生を通知
            this.raiseHistoryRewindNotification();
        }

        // 過去画像復元
        this.m_bDealing = true;
        this.wayBackTo_Core(idx);
        this.m_bDealing = false;
    }

    /// 操作履歴巻き戻しリスナを追加する。
    addHistoryRewindListener(listener: IHistoryRewindListenerObject): void {
        add_to_unique_list(this.m_historyRewindListeners, listener);
    }

    /// 操作履歴変更リスナを削除する。
    removeHistoryRewindListener(listener: IHistoryRewindListenerObject): void {
        remove_from_unique_list(this.m_historyRewindListeners, listener);
    }

    /// 操作履歴変更をリスナに通知する。
    raiseHistoryRewindNotification(): void {
        for (let i = 0; i < this.m_historyRewindListeners.length; i++) {
            this.m_historyRewindListeners[i].OnHistoryRewind(this);
        }
    }
}

//
//  「元に戻す」ボタン
//

/// 新しいインスタンスを初期化する。
export class UndoButton {
    m_history: UIOpHistory;
    m_undoButton: HTMLButtonElement;

    constructor(history: UIOpHistory) {
        this.m_history = history;
        this.m_undoButton = <HTMLButtonElement>document.getElementById('undo');
        const undoButton = this;    // 束縛変数
        this.m_undoButton.onclick = function () {
            undoButton.OnClicked();
        }
    }

    /// 「元に戻す」ボタンがクリックされたとき呼ばれる。
    OnClicked(): void {
        let curIdx = this.m_history.getCursorIdx();
        if (curIdx > 0) {
            curIdx--;
            console.log("UndoButton::OnClicked(): waiBackTo(" + curIdx + ")");
            this.m_history.wayBackTo(curIdx);
        }
    }
}

//
//  「やり直し」ボタン
//

/// 新しいインスタンスを初期化する。
export class RedoButton {
    m_history: UIOpHistory;
    m_redoButton: HTMLButtonElement;

    constructor(history: UIOpHistory) {
        this.m_history = history;
        this.m_redoButton = <HTMLButtonElement>document.getElementById('redo');
        const redoButton = this;    // 束縛変数
        this.m_redoButton.onclick = function () {
            redoButton.OnClicked();
        }
    }

    /// 「やり直し」ボタンがクリックされたとき呼ばれる。
    OnClicked(): void {
        let curIdx = this.m_history.getCursorIdx();
        if (curIdx < this.m_history.getLength()) {
            curIdx++;
            console.log("RedoButton::OnClicked(): waiBackTo(" + curIdx + ")");
            this.m_history.wayBackTo(curIdx);
        }
    }
}
