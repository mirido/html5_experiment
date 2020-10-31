// Copyright (c) 2016-2020, mirido
// All rights reserved.

'use strict';

//
//  Constant
//

// Dump all property of event
export const bShowAllProperty: boolean = false;

export const borderColor = 'rgb(116,116,171)';   // 枠線

export const activeIconColors = [
  borderColor,          // 枠線
  'rgb(147,151,178)',   // ボタン面
  'rgb(147,151,178)',   // 左上
  'rgb(255,255,255)'    // 右下
];

export const inactiveIconColors = [
  borderColor,          // 枠線
  'rgb(210,216,255)',   // ボタン面
  'rgb(255,255,255)',   // 左上
  'rgb(147,151,178)'    // 右下
];

export const textColor = 'rgb(90,87,129)';
export const textCharWidth = 12;

export const half_tone_std_ha = 3;

//
//  Interface
//

// # geometory

/// Interface of point
export interface IPoint {
  x: number;
  y: number;
}

/// Interface of rectangle
export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// # graphics2

export interface IPlotFunc {
  (x: number, y: number, context: CanvasRenderingContext2D): void;
}

export interface ILineFunc {
  (x1: number, y1: number, x2: number, y2: number, context: CanvasRenderingContext2D): void;
}


// # ui-utils

/// getBoundingClientRect()のシグネチャ
export interface IGetBoundingClientRect {
  (target: HTMLElement): IRect;
}

export interface IIconGraphicFunc {
  (iconBounds: IRect, context: CanvasRenderingContext2D): void;
}

// # oebi-tool

export interface generateTool { }
export interface PaintTool { }

// # tool-palette

export interface ICommonSetting { }

//
//  Type guard
//

// Typeguard of Number
export function isNumber(arg: any): arg is number {
  return typeof arg === "number";
}

// Following type guards only judge necessity minimum for this application.
// Therefore those can be used in this application only.
// Please do not forget that those can't be used for general use.

/// Type guard of PointerEvent
// export function isMouseEvent(e: Event): e is MouseEvent {
//   if (!('type' in e)) { return false; }
//   if (!('button' in e)) { return false; }
//   if (!('offsetX' in e)) { return false; }
//   return true;
// }

/// Type guard of KeyboardEvent
// export function isKeyboardEvent(e: Event): e is KeyboardEvent {
//   if (!('type' in e)) { return false; }
//   if (!('shiftkey' in e)) { return false; }
//   return true;
// }

/// Type guard of HTMLSelectElement
// export function isHTMLSelectElement(elem: HTMLElement): elem is HTMLSelectElement {
//   return ('selectionIndex' in elem);
// }

// Type guard of HTMLOptionElement
// export function isHTMLOptionElement(elem: HTMLElement): elem is HTMLOptionElement {
//   return ('value' in elem);
// }
