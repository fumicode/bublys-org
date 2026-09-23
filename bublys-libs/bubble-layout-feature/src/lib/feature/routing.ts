/**
 * どの url にどの画面を出すか ── 既存 `bubbles-ui` の `BubbleRouting` と**同じ形**。
 *
 * ★ 同じ形にしたのは、バブリ側の `bubbleRoutes.tsx` を書き換えずに載せ替えられるかを
 *   確かめたいから（検証の目的のひとつ）。
 * ★ ここは domain に入らない。url は「泡のならべかた」の語彙ではない。
 */
import type { FC, ReactNode } from 'react';

export type BubbleParams = Readonly<Record<string, string>>;

/** 画面に渡るもの。`bubbles-ui` の `Bubble` のうち、ここで要る分だけ */
export interface RoutedBubble {
  readonly id: string;
  readonly url: string;
  readonly type: string;
  readonly params: BubbleParams;
}

export type BubbleContentRenderer = FC<{ readonly bubble: RoutedBubble }>;

export interface BubbleRoute {
  /** `"csv-importer/sheets/:sheetId/objects/:rowId"` か RegExp */
  readonly pattern: string | RegExp;
  readonly type: string;
  readonly Component: BubbleContentRenderer;
  /** 開いたときの既定の大きさなど。★ 位置は入れない（どこに置くかは親の View が決める） */
  readonly size?: { readonly w: number; readonly h: number };
  readonly hue?: number;
  /** 一覧に出す名前。無ければ url の末尾 */
  readonly title?: (params: BubbleParams) => string;
  /**
   * 中身の地。
   *  - `'light'`（既定）… 明るい地を敷く。バブリの画面は明るい地を前提に書かれている
   *  - `'clear'`        … 地を敷かない。中身が自分で背景を持つ窓（入れ子の宇宙・canvas）
   */
  readonly ground?: 'light' | 'clear';
}

const pathOf = (url: string): string => {
  const q = url.indexOf('?');
  return q >= 0 ? url.slice(0, q) : url;
};

/** `"a/:b/c"` → `/^a\/([^/]+)\/c$/` */
export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');
  return new RegExp(`^${escaped}$`);
}

export function extractParamNames(pattern: string): string[] {
  const m = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return m ? m.map((s) => s.slice(1)) : [];
}

export function extractParams(url: string, pattern: string | RegExp): BubbleParams {
  if (pattern instanceof RegExp) return {};
  const m = pathOf(url).match(patternToRegex(pattern));
  if (!m) return {};
  const out: Record<string, string> = {};
  extractParamNames(pattern).forEach((name, i) => { out[name] = m[i + 1]; });
  return out;
}

export function matchesPattern(url: string, pattern: string | RegExp): boolean {
  return pattern instanceof RegExp ? pattern.test(url) : patternToRegex(pattern).test(pathOf(url));
}

export function matchBubbleRoute(routes: readonly BubbleRoute[], url: string): BubbleRoute | undefined {
  return routes.find((r) => matchesPattern(url, r.pattern));
}

/** url を画面にする。当たらなければ null */
export function renderRoute(
  routes: readonly BubbleRoute[],
  id: string,
  url: string,
): { readonly route: BubbleRoute; readonly bubble: RoutedBubble } | null {
  const route = matchBubbleRoute(routes, url);
  if (!route) return null;
  return {
    route,
    bubble: { id, url, type: route.type, params: extractParams(url, route.pattern) },
  };
}

/** 一覧やドラッグの札に出す名前 */
export function titleOf(routes: readonly BubbleRoute[], url: string, fallback?: string): string {
  const route = matchBubbleRoute(routes, url);
  if (route?.title) return route.title(extractParams(url, route.pattern));
  if (fallback) return fallback;
  const p = pathOf(url).split('/').filter(Boolean);
  return p[p.length - 1] ?? url;
}

export type { ReactNode };
