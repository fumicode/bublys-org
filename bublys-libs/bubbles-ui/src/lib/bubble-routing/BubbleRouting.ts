import { FC, createContext } from "react";
import { Bubble, BubbleOptions, BubbleParams } from "../Bubble.domain.js";
import { Size2, CoordinateSystem } from "@bublys-org/bubbles-ui-util";
import { OpeningPosition } from "../state/bubbles-slice.js";

// BubbleContentRenderer型
export type BubbleContentRendererProps = {
  bubble: Bubble;
};

export type BubbleContentRenderer = FC<BubbleContentRendererProps>;

// BubbleRoute型
export type BubbleRoute = {
  /** URLパターン（文字列またはRegExp）
   * 文字列の場合: "shift-puzzle/staffs/:staffId" のように :param でパラメータを指定
   * RegExpの場合: 従来通りの正規表現（後方互換性のため）
   */
  pattern: string | RegExp;
  type: string;
  Component: BubbleContentRenderer;
  bubbleOptions?: BubbleOptions;
};

/**
 * URLからパス部分を取得（クエリ文字列を除去）
 */
const getPathPart = (url: string): string => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

/**
 * パスパターン文字列を正規表現に変換
 * 例: "shift-puzzle/staffs/:staffId" → /^shift-puzzle\/staffs\/([^/]+)$/
 */
export const patternToRegex = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 特殊文字をエスケープ
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');  // :param を ([^/]+) に置換
  return new RegExp(`^${escaped}$`);
};

/**
 * パスパターンからパラメータ名を抽出
 * 例: "shift-puzzle/staffs/:staffId" → ["staffId"]
 */
export const extractParamNames = (pattern: string): string[] => {
  const matches = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map(m => m.slice(1)) : [];
};

/**
 * URLとパターンからパラメータを抽出
 * 文字列パターンの場合、クエリ文字列は無視してパス部分のみマッチ
 */
export const extractParams = (url: string, pattern: string | RegExp): BubbleParams => {
  if (pattern instanceof RegExp) {
    // RegExpの場合はパラメータ抽出不可（後方互換性）
    return {};
  }

  const pathPart = getPathPart(url);
  const regex = patternToRegex(pattern);
  const paramNames = extractParamNames(pattern);
  const match = pathPart.match(regex);

  if (!match) return {};

  const params: BubbleParams = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return params;
};

/**
 * パターンがURLにマッチするかチェック
 * 文字列パターンの場合、クエリ文字列は無視してパス部分のみマッチ
 */
export const matchesPattern = (url: string, pattern: string | RegExp): boolean => {
  if (pattern instanceof RegExp) {
    return pattern.test(url);
  }
  // 文字列パターンはパス部分のみマッチ
  return patternToRegex(pattern).test(getPathPart(url));
};

// BubblesContext型
export type BubblesContextType = {
  pageSize?: Size2;
  surfaceLeftTop: { x: number; y: number };
  coordinateSystem: CoordinateSystem;
  openBubble: (name: string, openerBubbleId: string, openingPosition?: OpeningPosition) => string;
};

export const BubblesContext = createContext<BubblesContextType>({
  pageSize: { width: 1000, height: 1000 },
  surfaceLeftTop: { x: 0, y: 0 },
  coordinateSystem: CoordinateSystem.GLOBAL,
  openBubble(name, openerBubbleId) {
    console.warn("openBubble not implemented");
    return "void_id";
  },
});

// ルートマッチングユーティリティ
export const matchBubbleRoute = (routes: BubbleRoute[], url: string): BubbleRoute | undefined =>
  routes.find((route) => matchesPattern(url, route.pattern));
