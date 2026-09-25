"use client";
/**
 * 説明ひとつぶん ── 一覧から開く詳細の泡。
 *
 * ★ 持っているのは中身だけ。どこに開くか・どう並ぶかは海の決まりに従う。
 */
import { FC } from "react";
import styled from "styled-components";
import { findGuideEntry } from "./guideEntries";

/**
 * `**ここ**` を太字にするだけの、ごく小さな読み替え。
 *
 * ★ 説明の中の「ここが肝」を太くしたいだけなので、書式の仕組みは持ち込まない
 *   ── 持ち込むと、説明を書くたびに書式の話が増える。
 */
const emphasized = (line: string) =>
  line.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));

export const GuideEntryBubble: FC<{ entryId: string }> = ({ entryId }) => {
  const entry = findGuideEntry(entryId);
  if (!entry) return <StyledEntry>この説明は見つかりませんでした。</StyledEntry>;
  return (
    <StyledEntry>
      <h3 className="e-title">{entry.title}</h3>
      {entry.body.map((line, i) => (
        <p key={i} className="e-line">
          {emphasized(line)}
        </p>
      ))}
    </StyledEntry>
  );
};

const StyledEntry = styled.div`
  height: 100%;
  overflow: auto;
  padding: 12px 14px;
  box-sizing: border-box;
  color: #1b2029;

  .e-title {
    margin: 0 0 8px;
    font-size: 15px;
  }
  .e-line {
    margin: 0 0 8px;
    font-size: 12.5px;
    line-height: 1.7;
  }
  .e-line:last-child {
    margin-bottom: 0;
  }
`;

export default GuideEntryBubble;
