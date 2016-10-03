'use strict';

/// 座標のコンストラクタ。
function jsPoint(x, y)
{
	return { x: x, y: y };
}

/// 矩形のコンストラクタ。
function jsRect(x, y, width, height)
{
	return { x: x, y: y, width: width, height: height };
}

/// 2点間のチェビシェフ距離を求める。
function get_dist_chv(pt1, pt2)
{
	return Math.max(Math.abs(pt1.x - pt2.x), Math.abs(pt1.y - pt2.y));
}

/// 2点間のマンハッタン距離を求める。
function get_dist_chv(pt1, pt2)
{
	return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}

/// 点が矩形に含まれるか判定する。
function rect_includes(rect, point)
{
	return (
		   (rect.x <= point.x && point.x < rect.x + rect.width)
		&& (rect.y <= point.y && point.y < rect.y + rect.height)
		);
}

/// 矩形が共通部分を持つか否か判定する。
function rects_have_common(rect1, rect2)
{
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
