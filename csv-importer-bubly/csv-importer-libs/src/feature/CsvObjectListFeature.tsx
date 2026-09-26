"use client";

import { FC, useCallback, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { LIST_CARD_WIDTH, ListSpace } from "@bublys-org/bubble-layout-feature";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { sheetScopeId, useCsvSheets } from "./CsvSheetProvider.js";

type CsvObjectListFeatureProps = {
  sheetId: string;
};

/** 札 1 枚の中身の大きさ（`registration/bubbleRoutes` の `OBJECT_CARD` と同じ） */
const OBJECT_CARD = { w: LIST_CARD_WIDTH, h: 54 } as const;

/** 一覧の右上に出す口の見た目（ほかの一覧の口に合わせた寸法） */
const headBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  font: "600 12px/1.5 -apple-system, sans-serif",
  padding: "4px 11px",
  borderRadius: 6,
  whiteSpace: "nowrap",
  border: "1px solid rgba(27,32,41,.22)",
  background: "rgba(255,255,255,.92)",
  color: "#1b2029",
};

/**
 * 行の一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。行 1 つを泡にして、
 * 「どう並べるか」は親の View に任せる（ほかの一覧と同じ 7 つの並べ方が効く）。
 */
export const CsvObjectListFeature: FC<CsvObjectListFeatureProps> = ({
  sheetId,
}) => {
  const { getSheetMeta, setTitleColumn } = useCsvSheets();
  const scope = useCasScope(sheetScopeId(sheetId));
  const sheetShell = scope.getShell<CsvSheet>("csv-sheet", sheetId);
  const sheet = sheetShell?.object ?? null;
  const meta = getSheetMeta(sheetId);

  const objects = useMemo(
    () => sheet?.toPlaneObjects(meta?.titleColumnId) ?? [],
    [sheet, meta]
  );

  const members = useMemo(
    () => objects.map((o) => `csv-importer/sheets/${sheetId}/objects/${o.id}/card`),
    [objects, sheetId]
  );

  const handleChangeTitleColumn = useCallback(
    (columnId: string) => {
      setTitleColumn(sheetId, columnId);
    },
    [setTitleColumn, sheetId]
  );

  if (!sheet) {
    return <div>シートが見つかりません</div>;
  }

  return (
    <ListSpace
      members={members}
      itemWidth={OBJECT_CARD.w}
      itemHeight={OBJECT_CARD.h}
      /**
       * 口は並びの右上の余白に置く（`ListSpace` の註）。ここには 2 つ:
       * **どの列を名前にするか**と、**一覧まるごとの掴み口**。
       *
       * ★ 一覧まるごとを掴めないと「この表ぜんぶを変換する」が渡せない
       *   （1 行ずつ拾うしかない）。渡し方は 1 行のときと同じ規約 ──
       *   型つきのドラッグに `application/json` で実データを載せる。
       *   載るのが**行の並び**になるだけ。
       */
      head={
        <div style={headBox}>
          <span
            onDragStart={(e) => {
              e.dataTransfer.setData("application/json", JSON.stringify(objects));
            }}
          >
            <ObjectView
              type="CsvObjectList"
              url={`csv-importer/sheets/${sheetId}/objects`}
              label={sheet.name}
              draggable={true}
              openingPosition="bubble-side-right"
            >
              <span title="掴んで渡すと、この表ぜんぶが相手になる">{sheet.name}</span>
            </ObjectView>
          </span>
          <label style={{ color: "#6b7280" }}>
            名前の列:
            <select
              value={meta?.titleColumnId ?? ""}
              onChange={(e) => handleChangeTitleColumn(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              <option value="">（行番号）</option>
              {sheet.columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    />
  );
};
