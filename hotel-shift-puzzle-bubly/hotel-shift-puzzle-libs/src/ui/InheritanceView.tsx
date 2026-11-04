'use client';

import { FC } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import { formatConfirmedAt } from "./formatConfirmedAt.js";

/** 引き継ぎ元・取り込み候補の1件（どの月の確定版で、いつ確定したか） */
export type InheritanceSource = {
  year: number;
  /** 1-12 */
  month: number;
  /** 確定した時刻（epoch ms）。分からなければ undefined */
  confirmedAt?: number;
};

type InheritanceViewProps = {
  /** この勤務表が引き継いでいる前月の確定版。引き継いでいなければ undefined */
  inherited: InheritanceSource | undefined;
  /**
   * まだ取り込んでいない前月の確定版（置き換わった／あとから確定した）。
   * 勝手には差し替えないので、知らせて人が取り込む。
   */
  pending?: InheritanceSource;
  /** 「取り込む」を押したとき */
  onImport?: () => void;
  /** 取り込み中（確定版の読み出しは非同期） */
  busy?: boolean;
};

/** 引き継ぎが勤務表のどこに効くか（ラベルの説明に出す） */
const EFFECT_HINT =
  "勤務表は、前月の確定版から引き継いで始まります。確定版の月末がこの勤務表の月初につながり" +
  "（連勤・遅番明けを月をまたいで数えます）、振り返りの★も一緒に引き継ぎます。" +
  "★を休みの優先度に使うかは、制約欄の「★優先」で切り替えます。";

const sourceLabel = ({ year, month }: InheritanceSource): string => `${year}年${month}月の確定版`;

/**
 * 勤務表が前月の確定版から何を引き継いでいるかを見せる（プレゼンテーショナル）。
 *
 * 前月の確定版は店舗×月で1つなので、選ぶ口は無い。勤務表を作るときに自動で引き継ぎ、
 * その後に前月の確定版が置き換わったり前月があとから確定したりしたら、取り込みを促すだけ。
 */
export const InheritanceView: FC<InheritanceViewProps> = ({
  inherited,
  pending,
  onImport,
  busy = false,
}) => {
  if (!inherited && !pending) return null;

  return (
    <StyledWrap>
      <span className="e-label" title={EFFECT_HINT}>
        🏁 引き継ぎ
      </span>
      {inherited && (
        <span className="e-chip" title={EFFECT_HINT}>
          ← {sourceLabel(inherited)}
          {inherited.confirmedAt !== undefined && (
            <span className="e-at">確定 {formatConfirmedAt(inherited.confirmedAt)}</span>
          )}
        </span>
      )}
      {pending && (
        <span className="e-pending">
          {inherited ? "確定版が新しくなりました" : `${sourceLabel(pending)}があります`}
          {pending.confirmedAt !== undefined && (
            <span className="e-at">確定 {formatConfirmedAt(pending.confirmedAt)}</span>
          )}
          {onImport && (
            <button type="button" className="e-take" disabled={busy} onClick={onImport}>
              取り込む
            </button>
          )}
        </span>
      )}
      {busy && <span className="e-hint">読み込み中…</span>}
    </StyledWrap>
  );
};

/** ヘッダ行（可能勤務帯の右）にインラインで並ぶ想定なので、縦を食わない */
const StyledWrap = styled.div<HTMLAttributes<HTMLDivElement>>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  min-width: 0;

  .e-label {
    font-size: 0.75em;
    color: #999;
    flex-shrink: 0;
  }

  .e-hint {
    font-size: 0.78em;
    color: #bbb;
  }

  .e-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #ffe082;
    background: #fffde7;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 0.78em;
    color: #8d6e00;
    white-space: nowrap;
  }

  .e-at {
    font-size: 0.85em;
    color: #b0a060;
    white-space: nowrap;
  }

  .e-pending {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    color: #e65100;
    white-space: nowrap;
  }

  .e-take {
    font-size: 1em;
    border: 1px solid #ffb74d;
    background: #fff3e0;
    color: #e65100;
    border-radius: 999px;
    padding: 0 8px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #ffe0b2;
    }
  }
`;
