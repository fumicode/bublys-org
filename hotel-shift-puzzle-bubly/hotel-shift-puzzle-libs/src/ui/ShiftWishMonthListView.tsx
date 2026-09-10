'use client';

import { FC } from "react";
import styled from "styled-components";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { ShiftWishMonthProgress } from "./shiftWishStatus.js";
import { SHIFT_WISH_MONTH_VIEW_TYPE } from "./viewObjectTypes.js";

type ShiftWishMonthListViewProps = {
  /** 希望を出す月（勤務表がある月）と、その月の回収の進み具合 */
  months: ShiftWishMonthProgress[];
  /**
   * その月のシフト希望一覧バブルの URL。ObjectView に渡すだけで、ダブルクリック展開・
   * ドラッグ・data-url は ObjectView が担う。URL スキームは app 層の関心事なので注入で受ける。
   */
  monthUrl: (year: number, month: number) => string;
};

/**
 * シフト希望の入口（月一覧）。
 *
 * 希望を集める月は「勤務表がある月」＝シフト作成者が組もうとしている月、というルールで決まる
 * （月を別途「募集中」と登録するしくみは作らない）。月をダブルクリックすると、その月の
 * 一覧バブルが**新しく出る**。この画面の中で対象が入れ替わることはない。
 */
export const ShiftWishMonthListView: FC<ShiftWishMonthListViewProps> = ({
  months,
  monthUrl,
}) => (
  <StyledContainer>
    <div className="e-header">
      <h3>シフト希望</h3>
      <p className="e-note">
        勤務表がある月が並びます。月をダブルクリックすると、その月のスタッフ全員の
        回収状況を確認・入力できます。
      </p>
    </div>

    <ul className="e-months">
      {months.length === 0 ? (
        <li className="e-empty">
          希望を集める月がありません（勤務表が作られると、その月がここに並びます）
        </li>
      ) : (
        months.map((m) => {
          const done = m.staffCount > 0 && m.collectedCount === m.staffCount;
          return (
            <li
              key={`${m.year}-${m.month}`}
              className={`e-month${done ? " is-done" : m.startedCount > 0 ? " is-started" : ""}`}
            >
              {/* ObjectView: ダブルクリックでその月の一覧バブル / ドラッグでポケットへ */}
              <ObjectView
                type={SHIFT_WISH_MONTH_VIEW_TYPE}
                url={monthUrl(m.year, m.month)}
                label={`${m.year}年${m.month}月のシフト希望`}
                openingPosition="bubble-side-right"
                fullWidth
              >
                <span
                  className="e-month-card"
                  title={`ダブルクリックで${m.year}年${m.month}月のシフト希望を開く`}
                >
                  <span className="e-month-label">
                    {m.year}年{m.month}月
                  </span>
                  <span className="e-month-progress">
                    回収済み {m.collectedCount}/{m.staffCount}人
                    {m.startedCount > m.collectedCount &&
                      `・入力中 ${m.startedCount - m.collectedCount}人`}
                  </span>
                </span>
              </ObjectView>
            </li>
          );
        })
      )}
    </ul>
  </StyledContainer>
);

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 260px;

  .e-header {
    margin-bottom: 8px;
    h3 {
      margin: 0;
    }
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }

  .e-months {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-month {
    border: 1px solid #eee;
    border-radius: 4px;

    /* 全員ぶん回収できた月 */
    &.is-done {
      background: #f1f8e9;
      border-color: #dcedc8;
    }
    /* 途中まで集まっている月 */
    &.is-started {
      background: #fffdf5;
      border-color: #f2ead6;
    }
  }

  /* ObjectView は <span role="button"> を描くので、カードの体裁は span 側で作る */
  .e-month-card {
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    cursor: pointer;
  }
  .e-month-label {
    font-weight: bold;
  }
  .e-month-progress {
    font-size: 0.78em;
    color: #888;
    .is-done & {
      color: #558b2f;
    }
  }

  .e-empty {
    color: #999;
    font-size: 0.85em;
  }
`;
