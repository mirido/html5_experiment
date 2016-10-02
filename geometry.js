'use strict';

/// 座標のコンストラクタ。
function jsPoint(x, y)
{
	return { m_x: x, m_y: y };
}

/// 矩形のコンストラクタ。
function jsRect(x, y, width, height)
{
	return { m_x: x, m_y: y, m_width: width, m_height: height };
}

/// 点が矩形に含まれるか判定する。
function rect_includes(rect, point)
{
	return (
		   (rect.m_x <= point.m_x && point.m_x < rect.m_x + rect.m_width)
		&& (rect.m_y <= point.m_y && point.m_y < rect.m_y + rect.m_height)
		);
}

/// 矩形が共通部分を持つか否か判定する。
function rects_have_common(rect1, rect2)
{
	if (rect1.m_x + rect1.m_width <= rect2.m_x)
		return false;
	if (rect2.m_x + rect2.m_width <= rect1.m_x)
		return false;
	if (rect1.m_y + rect1.m_height <= rect2.m_y)
		return false;
	if (rect2.m_y + rect2.m_height <= rect1.m_y)
		return false;
	return true;
}

/// 2点間を結ぶ線分をROI端を結ぶ線分に拡張(or クリップ)する。
// TBD

/// 単体テスト。
