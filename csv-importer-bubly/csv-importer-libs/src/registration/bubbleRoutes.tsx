"use client";

import { FC, ReactNode, useCallback, useContext, useMemo } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { LIST_BOX, LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { SheetCard } from "../ui/SheetCard.js";
import { useCsvSheets } from "../feature/CsvSheetProvider.js";
import {
  SheetEditorFeature,
  WorldLineFeature,
  CsvObjectListFeature,
  CsvObjectDetailFeature,
  CsvSheetProvider,
} from "../feature/index.js";

/**
 * Google OAuth クライアントID。
 * スタンドアロン（vite.config.mts）・バブリ（vite.config.bubly.ts）どちらのビルドでも
 * Vite が build 時に .env の値へ置換する。未設定なら undefined のまま
 * （= Google Sheets 連携だけが無効になり、他の機能は動く）。
 *
 * ★ **OS に組み込まれたときは Vite が居ない。** `import.meta.env` そのものが無いので、
 *   直に読むと落ちる ── 無ければ undefined として扱う（連携だけが静かに無効になる）。
 */
const GOOGLE_CLIENT_ID: string | undefined = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env?.VITE_GOOGLE_CLIENT_ID;

/**
 * 各バブルは CsvSheetProvider でラップする必要がある。
 * 直接 CsvSheetProvider を書くと googleClientId の指定を忘れて Google Sheets 連携が
 * 無言で死ぬので、必ずこのラッパー経由にする。
 */
const CsvBubbleProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <CsvSheetProvider googleClientId={GOOGLE_CLIENT_ID}>{children}</CsvSheetProvider>
);

/**
 * **札 1 枚の中身の大きさ**（`chrome.ts`。枠が取るぶんは枠が外へ足す）。
 * 中身は「表の絵 ＋ 名前 ＋ 消す口」の 1 行なので、ほかの一覧の札と同じ丈でよい。
 */
const SHEET_CARD = { w: LIST_CARD_WIDTH, h: 54 } as const;

/** 一覧の右上に出す口の見た目（ほかの一覧の「＋新規」に合わせた寸法） */
const headBtn = (primary: boolean): React.CSSProperties => ({
  font: "600 13px/1.5 -apple-system, sans-serif",
  padding: "4px 11px",
  borderRadius: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: primary ? "none" : "1px solid rgba(27,32,41,.22)",
  background: primary ? "#1976d2" : "rgba(255,255,255,.92)",
  color: primary ? "#fff" : "#1b2029",
  boxShadow: primary ? "0 1px 3px rgba(0,0,0,.25)" : "none",
});

/** CSV を選んで読み込む口 ── ファイルを選ばせて、中身を渡すだけ */
const pickCsv = (onText: (name: string, text: string) => void) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onText(file.name.replace(/\.csv$/i, ""), ev.target?.result as string);
    reader.readAsText(file);
  };
  input.click();
};

/**
 * シート一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。シート 1 枚を泡にして、
 * 「どう並べるか」は親の View に任せる（ほかの一覧と同じ 7 つの並べ方が効く）。
 */
const SheetsSpace: FC<{ bubbleId: string }> = ({ bubbleId }) => {
  const { sheetMetas, addSheet } = useCsvSheets();
  const { openBubble } = useContext(BubblesContext);
  const members = useMemo(
    () => sheetMetas.map((s) => `csv-importer/sheets/${s.id}/card`),
    [sheetMetas],
  );
  /** 作ったらそのまま開く（一覧の外の口 ── 泡にはならない） */
  const open = useCallback(
    (sheet: CsvSheet) => {
      addSheet(sheet);
      openBubble(`csv-importer/sheets/${sheet.id}`, bubbleId);
    },
    [addSheet, openBubble, bubbleId],
  );
  return (
    <ListSpace
      members={members}
      itemWidth={SHEET_CARD.w}
      itemHeight={SHEET_CARD.h}
      /**
       * 口は並びの右上の余白に置く（`ListSpace` の註）。ほかの一覧と同じ姿にする
       * ── MUI は使わない（この lib は持っていない）ので、同じ寸法を素の button で。
       */
      head={
        <>
          <button
            style={headBtn(true)}
            onClick={() => open(CsvSheet.create("新しいシート", ["列1", "列2", "列3"]))}
          >
            ＋新規
          </button>
          <button
            style={headBtn(false)}
            onClick={() => pickCsv((name, text) => open(CsvSheet.fromCsvText(name, text)))}
          >
            CSV を取り込む
          </button>
        </>
      }
    />
  );
};

// シート一覧バブル
const SheetListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <SheetsSpace bubbleId={bubble.id} />
    </CsvBubbleProvider>
  );
};

/** シート 1 枚の札 ── 一覧の中の泡 */
const SheetCardBubble: BubbleRoute["Component"] = ({ bubble }) => (
  <CsvBubbleProvider>
    <SheetCardInner sheetId={bubble.params.sheetId} />
  </CsvBubbleProvider>
);

const SheetCardInner: FC<{ sheetId: string }> = ({ sheetId }) => {
  const { sheetMetas, deleteSheet } = useCsvSheets();
  const meta = sheetMetas.find((s) => s.id === sheetId);
  if (!meta) return null;
  return <SheetCard sheetId={sheetId} name={meta.name} onDelete={deleteSheet} />;
};

// シート編集バブル
const SheetEditorBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      {/* ★ 詳細の中身は枠から 12px 内側に置く（題も口も枠のすぐ内側から始まっていた） */}
      <div style={{ padding: 12 }}>
        <SheetEditorFeature sheetId={bubble.params.sheetId} />
      </div>
    </CsvBubbleProvider>
  );
};

// オブジェクト一覧バブル
const ObjectListBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <CsvObjectListFeature sheetId={bubble.params.sheetId} />
    </CsvBubbleProvider>
  );
};

// オブジェクト詳細バブル
const ObjectDetailBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <CsvObjectDetailFeature sheetId={bubble.params.sheetId} rowId={bubble.params.rowId} />
    </CsvBubbleProvider>
  );
};

// 世界線ビューバブル
const WorldLineBubble: BubbleRoute["Component"] = ({ bubble }) => {
  return (
    <CsvBubbleProvider>
      <WorldLineFeature sheetId={bubble.params.sheetId} bubbleId={bubble.id} />
    </CsvBubbleProvider>
  );
};

/** CSV Importer のバブルルート定義 */
export const csvImporterBubbleRoutes: BubbleRoute[] = [
  { pattern: "csv-importer/sheets/:sheetId/objects/:rowId", type: "object-detail", Component: ObjectDetailBubble },
  { pattern: "csv-importer/sheets/:sheetId/objects", type: "object-list", Component: ObjectListBubble },
  {
    pattern: "csv-importer/sheets/:sheetId/world-line",
    type: "sheet-world-line",
    // canvas は固有サイズを持たず容器いっぱいに広がるので窓型（fillsContainer）で開く。
    // 世界線はセル編集のたびに右へ伸びるので、高さより幅を取る。
    bubbleOptions: {
      contentBackground: "rgba(15,18,28,0.3)",
      fillsContainer: true,
      defaultSize: { width: 520, height: 340 },
    },
    Component: WorldLineBubble,
  },
  /**
   * ★ 既定の大きさ（中身の数）。口が横に 4 つ（オブジェクト一覧・エクスポート・Sheets・世界線）
   *   並ぶうえ、その右に Row/Object の切り替えが要る ── 横に 720 無いと口が折り返して切れる。
   */
  // ★ 札は詳細より**先に**置く（`:sheetId` が `.../card` も飲み込むので）
  { pattern: "csv-importer/sheets/:sheetId/card", type: "sheet-card", Component: SheetCardBubble,
    bubbleOptions: { defaultSize: { width: SHEET_CARD.w, height: SHEET_CARD.h } } },
  { pattern: "csv-importer/sheets/:sheetId", type: "sheet-editor", Component: SheetEditorBubble,
    bubbleOptions: { defaultSize: { width: 720, height: 460 } } },
  // 一覧は地を敷かない ── 並びの空間は海がそのまま透ける
  { pattern: "csv-importer/sheets", type: "sheet-list", Component: SheetListBubble,
    bubbleOptions: { defaultSize: LIST_BOX, contentBackground: "transparent" } },
];
