'use client';
/**
 * 行 1 つの札 ── **一覧の中の泡**。
 *
 * 一覧を並びの空間（`ListSpace`）にしたので、札は 1 枚ずつ泡になる。
 * 中身は「どの行か」が読めるだけでよく、開くのは外の海の仕事。
 *
 * ★ **実データも載せて掴ませる。** 変換エディタは落とされたものの中身から形を起こすので、
 *   型つきのドラッグだけでは「名前は判るが中が空」になる（`MappingEditorFeature` の註）。
 */
import { DragEvent, FC } from "react";
import styled from "styled-components";
import DataObjectIcon from "@mui/icons-material/DataObject";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { PlaneObject } from "@bublys-org/csv-importer-model";

/** 名前のほかに何を見せるか ── 頭から 2 つだけ（札は 1 行ぶんしか高さが無い） */
const previewOf = (obj: PlaneObject): string =>
  Object.entries(obj)
    .filter(([k]) => k !== "id" && k !== "name")
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" / ");

export const CsvObjectCard: FC<{
  object: PlaneObject;
  url: string;
}> = ({ object, url }) => (
  <StyledCard>
    {/*
      ★ 実データを載せるのは**外側**で。掴むのは中の `ObjectView` だが、
        `dragstart` は上へ伝わるので、ここで足せば型つきの荷物と一緒に運ばれる
        （1 行ずつ掴めた頃と同じ規約）。
    */}
    <div
      className="e-grab"
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData("application/json", JSON.stringify(object));
      }}
    >
    <ObjectView
      type="CsvObject"
      url={url}
      label={object.name}
      draggable={true}
      openingPosition="bubble-side-right"
    >
      <span className="e-main">
        <DataObjectIcon fontSize="small" />
        <span className="e-body">
          <span className="e-name">{object.name}</span>
          <span className="e-preview">{previewOf(object)}</span>
        </span>
      </span>
    </ObjectView>
    </div>
  </StyledCard>
);

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  box-sizing: border-box;
  color: #1b2029;

  .e-grab {
    min-width: 0;
  }
  .e-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .e-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  /* 名前は 1 行そのまま。切るのは箱の仕事 */
  .e-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .e-preview {
    font-size: 0.78em;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
