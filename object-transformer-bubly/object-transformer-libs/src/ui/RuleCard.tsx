'use client';
/**
 * ルール 1 つの札 ── **一覧の中の泡**。
 *
 * 一覧を並びの空間（`ListSpace`）にしたので、札は 1 枚ずつ泡になる。
 * 中身は「何のルールか」が読めるだけでよく、開くのは外の海の仕事
 * （ダブルクリックで一括変換へ）。
 */
import { FC } from "react";
import styled from "styled-components";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { ObjectView, UrledPlace } from "@bublys-org/bubbles-ui";

export const RuleCard: FC<{
  ruleId: string;
  name: string;
  targetSchemaId: string;
  fieldCount: number;
  onDelete?: (ruleId: string) => void;
}> = ({ ruleId, name, targetSchemaId, fieldCount, onDelete }) => {
  /** 開く先は一括変換 ── ルールは「流すためのもの」なので、開いたら流す所に出る */
  const url = `object-transformer/rules/${ruleId}/convert`;
  return (
    <StyledCard>
      <ObjectView
        type="MappingRule"
        url={url}
        label={name}
        draggable={true}
        openingPosition="bubble-side-right"
      >
        <span className="e-main">
          <SwapHorizIcon fontSize="small" />
          <span className="e-body">
            <span className="e-name">{name}</span>
            <span className="e-meta">
              → {targetSchemaId} / {fieldCount} フィールド
            </span>
          </span>
        </span>
      </ObjectView>
      {onDelete && (
        <UrledPlace url={url}>
          <button
            className="e-remove"
            title="このルールを消す"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ruleId);
            }}
          >
            ×
          </button>
        </UrledPlace>
      )}
    </StyledCard>
  );
};

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
  .e-meta {
    font-size: 0.78em;
    color: #6b7280;
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
