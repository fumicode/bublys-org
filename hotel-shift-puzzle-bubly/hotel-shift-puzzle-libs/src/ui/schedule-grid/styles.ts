import styled from "styled-components";

/**
 * 勤務表グリッドのスタイル。
 * CSS は class 名ベースのため、StyledWrap の子孫であればどの子コンポーネントが
 * 描いた要素にも適用される（ScheduleDataCell / StaffScheduleRow / SummaryRow など）。
 */
export const StyledWrap = styled.div`
  .e-grid {
    display: grid;
    max-height: 70vh;
    max-width: 100%;
    overflow: auto;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    font-size: 0.8em;
  }

  /* 共通セル */
  .e-corner,
  .e-day-head,
  .e-staff-cell,
  .e-cell,
  .e-sum-head,
  .e-sum-cell,
  .e-off-head,
  .e-off-total {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  /* 右端「休（合計）」列。横スクロールしても右に固定して見えるようにする */
  .e-off-head {
    position: sticky;
    top: 0;
    right: 0;
    z-index: 3;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #9e9e9e;
    border-left: 1px solid #e0e0e0;
  }
  .e-off-total {
    position: sticky;
    right: 0;
    z-index: 1;
    background: #fbfbfb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #616161;
    font-variant-numeric: tabular-nums;
    border-left: 1px solid #e0e0e0;
  }
  .e-off-total.e-off-filler {
    background: #fafafa;
  }
  .e-off-total.e-off-sum {
    color: #455a64;
  }
  .e-off-total.is-first {
    border-top: 2px solid #b0bec5;
  }

  /* 勤務帯ごと＋休みの人数集計行（背景・文字色は行ごとにインラインで色分け） */
  .e-sum-head {
    position: sticky;
    left: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-weight: bold;
  }

  /* 必要人数を編集できるセル / 見出し */
  .e-sum-head.is-editable,
  .e-sum-cell.is-editable {
    cursor: pointer;
  }
  .e-sum-cell.is-editable:hover {
    box-shadow: inset 0 0 0 2px #90a4ae;
  }
  .e-sum-head.is-editable:hover {
    filter: brightness(0.96);
  }
  .e-sum-cell {
    display: flex;
    align-items: baseline;
    justify-content: center;
    min-height: 28px;
    font-weight: bold;
    font-variant-numeric: tabular-nums;

    &.is-zero {
      background: #fafafa;
      color: #cfd5d8;
      font-weight: normal;
    }

    /* 現在/必要 の分母表示 */
    .e-cur {
      font-size: 1em;
    }
    .e-den {
      font-size: 0.75em;
      opacity: 0.7;
    }
    /* 達成/不足を文字色でも表す（勤務帯色は使わない） */
    &.is-met {
      color: #2e7d32;
    }
    &.is-under {
      color: #c62828;
    }
  }

  /* 集計ブロックの先頭行だけ、スタッフ行との区切り罫線を引く */
  .e-sum-head.is-first,
  .e-sum-cell.is-first {
    border-top: 2px solid #b0bec5;
  }

  /* 左上の角（縦横どちらにも固定） */
  .e-corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 3;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #555;
    padding: 4px;
  }

  /* 日付ヘッダ（上に固定） */
  .e-day-head {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    .e-day-num {
      font-weight: bold;
    }
    .e-day-wd {
      font-size: 0.8em;
      color: #888;
    }

    &.is-sun .e-day-num,
    &.is-sun .e-day-wd {
      color: #d32f2f;
    }
    &.is-sat .e-day-num,
    &.is-sat .e-day-wd {
      color: #1976d2;
    }
  }

  /* スタッフ名（左に固定） */
  .e-staff-cell {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;

    .e-staff {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;

      &:hover {
        background: #f5f7f8;
      }
    }
    .e-caret {
      color: #90a4ae;
      font-size: 0.85em;
      flex-shrink: 0;
      width: 10px;
    }
    .e-staff-icon {
      color: #888;
      flex-shrink: 0;
    }
    .e-staff-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: bold;
    }
  }

  /* 希望行（スタッフ展開時。割当行の真下に並ぶ） */
  .e-wish-row-head {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fcfcf7;
    color: #8d6e63;
    font-size: 0.85em;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 2px 8px;
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
  }
  .e-wish-row-cell {
    background: #fcfcf7;
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    padding: 2px;
    font-size: 0.78em;
    min-height: 24px;

    .is-want {
      color: #2e7d32;
    }
    .is-avoid {
      color: #c62828;
    }
    .e-empty {
      color: #ddd;
    }
  }

  /* データセル */
  .e-cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    min-height: 36px;
    cursor: pointer;
    transition: box-shadow 0.1s;

    &:hover {
      box-shadow: inset 0 0 0 2px #90caf9;
    }
  }

  /* 希望との食い違い（制約違反）: 右上の角に ⊿（オレンジの三角）。クリックで違反バブル */
  .e-wish-flag {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 13px 13px 0;
    border-color: transparent #ef6c00 transparent transparent;
    cursor: pointer;
    z-index: 2;

    &:hover {
      border-width: 0 16px 16px 0;
    }
  }

  /* 未割当セルに薄く表示する希望ヒント */
  .e-undecided.has-wish-hint {
    color: #b4b4b4;
    font-size: 0.82em;
    font-weight: normal;
  }

  /* 制約違反セル: 下端に連続した赤線を引く（連勤の塊が1本の線に見える） */
  .e-violation-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #e53935;
    cursor: pointer;
    z-index: 1;
    transition: height 0.1s;

    &:hover {
      height: 7px;
    }
  }
  .e-work {
    .e-shift-name {
      font-weight: bold;
    }
    .e-shift-time {
      font-size: 0.78em;
      opacity: 0.8;
    }
  }
  .e-off {
    background: #f5f5f5;
    color: #9e9e9e;
    font-weight: bold;
  }
  .e-undecided {
    color: #d0d0d0;
  }
`;
