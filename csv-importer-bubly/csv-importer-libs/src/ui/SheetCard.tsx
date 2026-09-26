'use client';
/**
 * シート 1 枚の札 ── **一覧の中の泡**。
 *
 * 一覧を並びの空間（`ListSpace`）にしたので、札は 1 枚ずつ泡になる。
 * 中身は「何のシートか」が読めるだけでよく、開くのは外の海の仕事。
 */
import { FC } from "react";
import styled from "styled-components";
import TableChartIcon from "@mui/icons-material/TableChart";
import { ObjectView, UrledPlace } from "@bublys-org/bubbles-ui";

export const SheetCard: FC<{
  sheetId: string;
  name: string;
  onDelete?: (sheetId: string) => void;
}> = ({ sheetId, name, onDelete }) => (
  <StyledCard>
    <ObjectView
      type="CsvSheet"
      url={`csv-importer/sheets/${sheetId}`}
      label={name}
      draggable={true}
      openingPosition="bubble-side-right"
    >
      <span className="e-main">
        <TableChartIcon fontSize="small" />
        <span className="e-name">{name}</span>
      </span>
    </ObjectView>
    {onDelete && (
      <UrledPlace url={`csv-importer/sheets/${sheetId}`}>
        <button
          className="e-remove"
          title="このシートを消す"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sheetId);
          }}
        >
          ×
        </button>
      </UrledPlace>
    )}
  </StyledCard>
);

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  box-sizing: border-box;
  color: #1b2029;

  .e-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  /* 題は 1 行目そのまま。切るのは箱の仕事 */
  .e-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .e-remove {
    flex: 0 0 auto;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    color: #8b93a3;
  }
  .e-remove:hover { color: #1b2029; }
`;
