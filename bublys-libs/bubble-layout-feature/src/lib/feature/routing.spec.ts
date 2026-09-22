/**
 * url → 画面。旧 `bubbles-ui` の `BubbleRouting` と**同じ答え**を返すか。
 * ★ 同じでないと、バブリの `bubbleRoutes.tsx` をそのまま載せられない。
 */
import { extractParamNames, extractParams, matchBubbleRoute, matchesPattern, patternToRegex, titleOf } from './routing.js';
import type { BubbleRoute } from './routing.js';

const noop = () => null;
const ROUTES: BubbleRoute[] = [
  { pattern: 'csv-importer/sheets/:sheetId/objects/:rowId', type: 'object-detail', Component: noop },
  { pattern: 'csv-importer/sheets/:sheetId/objects', type: 'object-list', Component: noop },
  { pattern: 'csv-importer/sheets/:sheetId', type: 'sheet-editor', Component: noop },
  { pattern: 'csv-importer/sheets', type: 'sheet-list', Component: noop },
];

describe('url → 画面', () => {
  it(':param を取り出す', () => {
    expect(extractParamNames('csv-importer/sheets/:sheetId/objects/:rowId')).toEqual(['sheetId', 'rowId']);
    expect(extractParams('csv-importer/sheets/s1/objects/r3', ROUTES[0].pattern)).toEqual({ sheetId: 's1', rowId: 'r3' });
  });

  it('★ 長いほうが先に当たる（並べた順に見る）', () => {
    expect(matchBubbleRoute(ROUTES, 'csv-importer/sheets/s1/objects/r3')?.type).toBe('object-detail');
    expect(matchBubbleRoute(ROUTES, 'csv-importer/sheets/s1/objects')?.type).toBe('object-list');
    expect(matchBubbleRoute(ROUTES, 'csv-importer/sheets/s1')?.type).toBe('sheet-editor');
    expect(matchBubbleRoute(ROUTES, 'csv-importer/sheets')?.type).toBe('sheet-list');
  });

  it('当たらない url は undefined（＝開けない。ObjectView は膜も出さない）', () => {
    expect(matchBubbleRoute(ROUTES, 'ほかのバブリ/なにか')).toBeUndefined();
    expect(matchBubbleRoute(ROUTES, 'csv-importer/sheets/s1/objects/r3/さらに下')).toBeUndefined();
  });

  it('クエリ文字列は見ない（パスだけで当てる）', () => {
    expect(matchesPattern('csv-importer/sheets/s1?tab=2', 'csv-importer/sheets/:sheetId')).toBe(true);
    expect(extractParams('csv-importer/sheets/s1?tab=2', 'csv-importer/sheets/:sheetId')).toEqual({ sheetId: 's1' });
  });

  it('RegExp のパターンも通る（旧 bubbles-ui との後方互換）', () => {
    const re: BubbleRoute[] = [{ pattern: /^old\/.+$/, type: 'old', Component: noop }];
    expect(matchBubbleRoute(re, 'old/thing')?.type).toBe('old');
    expect(extractParams('old/thing', re[0].pattern)).toEqual({});
  });

  it('正規表現に直すとき、url の特殊文字を食わない', () => {
    expect(patternToRegex('a.b/:id').test('axb/1')).toBe(false);
    expect(patternToRegex('a.b/:id').test('a.b/1')).toBe(true);
  });

  it('名前は route が決める。無ければ url の末尾', () => {
    const named: BubbleRoute[] = [
      { pattern: 'x/:id', type: 'x', Component: noop, title: (p) => '表 ' + p['id'] },
    ];
    expect(titleOf(named, 'x/7')).toBe('表 7');
    expect(titleOf(ROUTES, 'csv-importer/sheets/s1/objects')).toBe('objects');
    expect(titleOf(ROUTES, 'ほかのバブリ/なにか', '渡された名前')).toBe('渡された名前');
  });
});
