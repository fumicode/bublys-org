/**
 * csv-importer の「オブジェクト一覧 → 詳細」だけを、新しいライブラリの上に載せる。
 *
 * ★ 画面（`CsvObjectListView` / `CsvObjectDetailView`）は**バブリの本物をそのまま import** している。
 *   写しでも作り直しでもない。中身は1文字も変えていない。
 * ★ 代わりに省いたのは **feature 層**（Redux・世界線・CsvSheetProvider・Google Sheets）。
 *   ここは作り物のデータを渡している ── 検証したいのは「泡のならべかた」の側なので。
 */
import { useMemo } from 'react';
import type { BubbleRoute } from '@bublys-org/bubble-layout-feature';
import { CsvObjectListView } from '../../../../csv-importer-bubly/csv-importer-libs/src/ui/CsvObjectListView.js';
import { CsvObjectDetailView } from '../../../../csv-importer-bubly/csv-importer-libs/src/ui/CsvObjectDetailView.js';

/** 作り物のシート（本物は CsvSheet.toPlaneObjects() が作る） */
const COLUMNS = [
  { id: 'c1', name: '名前' },
  { id: 'c2', name: '担当' },
  { id: 'c3', name: '期限' },
  { id: 'c4', name: '状態' },
];
const ROWS: readonly (readonly string[])[] = [
  ['受付の動線を決める', '田中', '10/02', '進行中'],
  ['朝番の人数を見直す', '佐藤', '10/05', '未着手'],
  ['夜勤の引き継ぎ表', '鈴木', '10/09', '進行中'],
  ['清掃の割り当て', '高橋', '10/11', '完了'],
  ['備品の発注', '伊藤', '10/14', '未着手'],
  ['研修の日程', '渡辺', '10/18', '未着手'],
  ['シフト希望の締切', '山本', '10/21', '進行中'],
];
const OBJECTS = ROWS.map((cells, i) => {
  const o: Record<string, string> = { id: `r${i + 1}`, name: cells[0] };
  COLUMNS.forEach((c, j) => { o[c.name] = cells[j] ?? ''; });
  return o;
});

const SHEET_ID = 'demo';
const objectUrl = (rowId: string) => `csv-importer/sheets/${SHEET_ID}/objects/${rowId}`;

function ObjectListBubble() {
  return (
    <CsvObjectListView
      sheetName="やることリスト"
      columns={COLUMNS}
      objects={OBJECTS as never}
      titleColumnId="c1"
      onChangeTitleColumn={() => undefined}
      buildObjectUrl={objectUrl}
    />
  );
}

function ObjectDetailBubble({ bubble }: { bubble: { params: Record<string, string> } }) {
  const obj = useMemo(
    () => OBJECTS.find((o) => o.id === bubble.params['rowId']) ?? OBJECTS[0],
    [bubble.params],
  );
  return <CsvObjectDetailView object={obj as never} objectUrl={objectUrl(obj.id)} />;
}

export const routes: BubbleRoute[] = [
  {
    pattern: 'csv-importer/sheets/:sheetId/objects/:rowId',
    type: 'object-detail',
    Component: ObjectDetailBubble as never,
    size: { w: 300, h: 260 },
    title: (p) => OBJECTS.find((o) => o.id === p['rowId'])?.name ?? '詳細',
  },
  {
    pattern: 'csv-importer/sheets/:sheetId/objects',
    type: 'object-list',
    Component: ObjectListBubble as never,
    size: { w: 340, h: 380 },
    title: () => 'やることリスト',
  },
];
