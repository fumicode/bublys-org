"use client";
/**
 * 説明ひとつぶんの札 ── **一覧の中のバブル**。
 *
 * 一覧を並びの空間（`ListSpace`）にしたので、札は 1 枚ずつバブルになる。
 * 中身は「何の説明か」が読めるだけでよく、開くのは外の空間の仕事。
 */
import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubble-layout-feature";
import { findGuideEntry } from "./guideEntries";

export const GuideCard: FC<{ entryId: string }> = ({ entryId }) => {
  const entry = findGuideEntry(entryId);
  if (!entry) return null;
  return (
    <StyledCard>
      <ObjectView url={`guide/${entry.id}`} label={entry.title}>
        <span className="e-main">
          <span className="e-title">{entry.title}</span>
          <span className="e-lead">{entry.lead}</span>
        </span>
      </ObjectView>
    </StyledCard>
  );
};

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 12px;
  box-sizing: border-box;
  color: #1b2029;

  .e-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  /* 見出しも 1 行そのまま。切るのは箱の仕事 */
  .e-title {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .e-lead {
    font-size: 11px;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
