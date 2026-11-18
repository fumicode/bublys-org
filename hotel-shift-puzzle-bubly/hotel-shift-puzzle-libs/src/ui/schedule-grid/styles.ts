import styled from "styled-components";
import { EARLY_COL_WIDTH } from "./constants.js";
import { cellFaceStyles } from "./cellFaceStyles.js";

/**
 * グリッドの重なり順。ルールは「横・縦にスクロールする面（データセル・違反の印・
 * 制約ホバーのオーバーレイなど）より、固定された列・行が必ず手前」。
 *
 * スクロールする面の中では z-index 1〜5 を使っている（選択中のセル=1、違反の印=1、
 * 1セルの違反の角=2、制約ホバーのすりガラス=3 / リボン=4、希望を読むモードのセル=5）。固定の列・行は
 * それらより上に置き、スクロールで下に入ったものが透けて前に出ないようにする。
 */
const Z_FIXED = 6; // 固定の列（スタッフ名・休・早・見出し列）と固定の行（日付ヘッダ）
const Z_FIXED_CROSS = 7; // 固定の列と行が交わる角（左上・休/早の見出し・予約の開閉）
const Z_POPUP = 8; // 固定の列より手前に出すふきだし（制約の解消案）

/**
 * 勤務表グリッドのスタイル。
 * CSS は class 名ベースのため、StyledWrap の子孫であればどの子コンポーネントが
 * 描いた要素にも適用される（ScheduleDataCell / StaffScheduleRow / SummaryRow など）。
 */
export const StyledWrap = styled.div`
  .e-grid {
    display: grid;
    position: relative; /* 制約オーバーレイ（絶対配置 SVG）と各セルの offset 座標の基準 */
    max-height: 70vh;
    max-width: 100%;
    overflow: auto;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    font-size: 0.8em;

    /* セルはドラッグで範囲選択するので、ブラウザの文字選択は起こさない（#157 / #166）。
       選択した文字ではなく、選択中のセルをコピーする。 */
    user-select: none;
    /* チェックボックスなどの入力は素の振る舞いに戻す */
    input {
      user-select: auto;
    }

    /* キーボード操作のためグリッド自体を focusable にしている。
       選択はセルの枠線で示すので、コンテナ自身のフォーカス枠は消す。 */
    &:focus {
      outline: none;
    }
  }

  /* 選択モード（責任者バッジ/チェックで対象を選択中）の行の見た目。
     行は grid の直接の子（名前セル＋各日セル＋休合計＋早番日数）なので、各セルへ同じクラスを付けて表現する。
     - is-dimmed: 対象外の行。blur でぼかし薄くして背景に退かせる（クリックは可能なまま）。
     - is-focused: 対象の行。うっすら黄色く強調して少し浮かせる（sticky セルを崩さないよう transform は使わない）。 */
  .e-staff-cell.is-dimmed,
  .e-cell.is-dimmed,
  .e-off-total.is-dimmed,
  .e-early-total.is-dimmed,
  .e-sum-head.is-dimmed,
  .e-sum-cell.is-dimmed {
    filter: blur(1.4px);
    opacity: 0.4;
  }
  .e-staff-cell.is-focused {
    background: #fffde7;
    box-shadow: inset 3px 0 0 #fbc02d;
  }
  .e-cell.is-focused,
  .e-off-total.is-focused,
  .e-early-total.is-focused {
    background: #fffdf3;
  }

  /* 共通セル */
  .e-corner,
  .e-day-head,
  .e-staff-cell,
  .e-cell,
  .e-sum-head,
  .e-sum-cell,
  .e-off-head,
  .e-off-total,
  .e-early-head,
  .e-early-total,
  .e-res-head,
  .e-res-cell,
  .e-res-filler,
  .e-res-early-filler,
  .e-res-toggle,
  .e-res-toggle-bar {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  /* 前月の末尾の列（月跨ぎのつなぎ）。確定済みの前月を写した読み取り専用の参考なので、
     灰色で細く出し、今月1日との境に太めの区切りを引く。 */
  .e-prev-head,
  .e-prev-cell,
  .e-prev-filler {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
    background: #f5f5f5;
  }
  .e-prev-head.is-last,
  .e-prev-cell.is-last,
  .e-prev-filler {
    border-right: 2px solid #bdbdbd;
  }
  .e-prev-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
    font-size: 0.8em;
    color: #9e9e9e;

    .e-prev-month {
      font-size: 0.75em;
      line-height: 1;
    }
    .e-day-wd {
      font-size: 0.85em;
    }
    &.is-sun {
      color: #e57373;
    }
    &.is-sat {
      color: #64b5f6;
    }
  }
  .e-prev-cell {
    /* 連勤・連休の線（.e-run-bar）をセルの下端に置くため */
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    font-size: 0.8em;
    color: #9e9e9e;
    /* 今月の色を借りるが、確定済みの参考なので薄く */
    opacity: 0.6;
    cursor: default;

    &.e-off {
      color: #9e9e9e;
    }
  }

  /* 予約情報ブロックの折りたたみトグル行（予約行の上）。左見出しは横スクロールで固定、
     右側は帯として全日列を覆う。クリックで開閉。 */
  .e-res-toggle {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED_CROSS};
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 0.72em;
    font-weight: bold;
    color: #8d6e63;
    background: #fbeee0;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;

    .e-res-caret {
      font-size: 0.9em;
      color: #a1887f;
    }
    &:hover {
      background: #f6e2cd;
    }
  }
  .e-res-toggle-bar {
    background: #fbeee0;
    cursor: pointer;

    &:hover {
      background: #f6e2cd;
    }
  }

  /* 稼働日ごとの予約状況（宿泊人数・部屋数）。日付ヘッダの上に読み取り専用で並ぶ。
     左見出しは横スクロールで固定（e-sum-head と同じ流儀）、右端はフィラー。編集は専用バブルで。 */
  .e-res-head {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED};
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 0.72em;
    font-weight: bold;
    color: #5d4037;
    background: #fff8f0;
    white-space: nowrap;

    &.is-clickable {
      cursor: pointer;
    }
    &.is-clickable:hover {
      background: #ffefdd;
    }
  }
  .e-res-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 20px;
    font-size: 0.78em;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    color: #5d4037;
    background: #fffdf9;
    cursor: pointer;

    &.is-empty {
      color: #d7ccc8;
      font-weight: normal;
      background: #fafafa;
    }
    &.is-sun {
      background: #fff5f5;
    }
    &.is-sat {
      background: #f5f9ff;
    }
    &:hover {
      box-shadow: inset 0 0 0 2px #ffcc80;
    }

    /* 備考は複数行テキストをそのまま折り返して表示する（狭い日列なので縦に伸びる） */
    &.is-note {
      align-items: flex-start;
      justify-content: flex-start;
      font-weight: normal;
      font-size: 0.62em;
      line-height: 1.25;
      padding: 2px 3px;

      .e-res-note {
        display: block;
        width: 100%;
        white-space: pre-wrap;
        word-break: break-all;
        text-align: left;
        color: #6d4c41;
      }
    }
  }
  .e-res-filler {
    position: sticky;
    right: ${EARLY_COL_WIDTH}px;
    z-index: ${Z_FIXED};
    background: #fff8f0;
    border-left: 1px solid #e0e0e0;
  }
  .e-res-early-filler {
    position: sticky;
    right: 0;
    z-index: ${Z_FIXED};
    background: #fff8f0;
    border-left: 1px solid #e0e0e0;
  }

  /* 右端付近の「休」「早」合計列。横スクロールしても右に固定して見えるようにする。
     一番右が早番、その左が休み（right をずらして並べる）。 */
  .e-off-head {
    position: sticky;
    top: 0;
    right: ${EARLY_COL_WIDTH}px;
    z-index: ${Z_FIXED_CROSS};
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
    right: ${EARLY_COL_WIDTH}px;
    z-index: ${Z_FIXED};
    background: #fbfbfb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #616161;
    font-variant-numeric: tabular-nums;
    border-left: 1px solid #e0e0e0;
  }
  /* 月の最低休日数に満たないスタッフの休み合計（制約違反の可視化） */
  .e-off-total.is-under-min {
    color: #c62828;
    background: #ffebee;
    font-weight: bold;
  }
  /* 休みの目標日数に届いた。残りの未定は出勤とみなす（連勤の線もそう数える） */
  .e-off-total.is-secured {
    color: #2e7d32;
    background: #e8f5e9;
  }
  /* 最低休日数未満は違反。ダブルクリックで違反バブルを開ける */
  .e-off-total.is-clickable {
    cursor: pointer;
  }
  .e-off-total.is-clickable:hover {
    box-shadow: inset 0 0 0 2px #ef9a9a;
  }
  .e-off-total .e-off-mark {
    display: block;
    width: 100%;
    text-align: center;
  }
  .e-off-total.is-first {
    border-top: 2px solid #b0bec5;
  }

  .e-early-head {
    position: sticky;
    top: 0;
    right: 0;
    z-index: ${Z_FIXED_CROSS};
    background: #e3f2fd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #1565c0;
    border-left: 1px solid #e0e0e0;
  }
  .e-early-total {
    position: sticky;
    right: 0;
    z-index: ${Z_FIXED};
    background: #f5faff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #1565c0;
    font-variant-numeric: tabular-nums;
    border-left: 1px solid #e0e0e0;
  }
  .e-early-total.is-first {
    border-top: 2px solid #b0bec5;
  }

  /* 集計行の右端（休・早列の下）。セルではなく「列が無い」余白として見せる */
  .e-sum-rail-end {
    background: transparent;
    border: none;
    pointer-events: none;
  }
  .e-sum-rail-end.is-first {
    border-top: 2px solid transparent;
  }
  .e-sum-rail-end.is-dimmed {
    filter: none;
    opacity: 1;
  }

  /* 勤務帯ごと＋休みの人数集計行（背景・文字色は行ごとにインラインで色分け） */
  .e-sum-head {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED};
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
  /* キーボードのカーソルがいる必要人数のセル / 見出し（スタッフ行のセルの選択枠と同じ見た目） */
  .e-sum-head.is-selected,
  .e-sum-cell.is-selected {
    box-shadow: inset 0 0 0 2px #1976d2;
  }
  /* 打ち込み表示の基準。見出しは sticky で既に基準になっているので、日のセルにだけ付ける
     （見出しに relative を付けると横スクロールの固定が外れる） */
  .e-sum-cell.is-selected {
    position: relative;
    z-index: 1;
  }
  /* 範囲選択に入っている必要人数のセル（スタッフ行のセルの is-in-range と同じ見た目） */
  .e-sum-cell.is-in-range {
    position: relative;
  }
  .e-sum-cell.is-in-range::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(25, 118, 210, 0.18);
    pointer-events: none;
  }
  /* 打ち込み中の数字（スタッフ行のセルの .e-input と同じ見た目） */
  .e-sum-head .e-input,
  .e-sum-cell .e-input {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(227, 242, 253, 0.95);
    color: #0d47a1;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    z-index: 2;
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
    /* 1日の休み上限を超えた日（休み行）の警告 */
    &.is-over {
      background: #ffebee;
      color: #c62828;
      font-weight: bold;
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

    /* 責任者行（早責/夜責）: 担当勤務帯に責任者が入っていれば ◯（緑）、いなければ ✕（赤） */
    &.is-leader {
      font-weight: bold;
      &.is-present {
        color: #2e7d32;
        background: #e8f5e9;
      }
      &.is-absent {
        color: #c62828;
        background: #ffebee;
      }
      /* ✕（未充足）はダブルクリックで違反バブルを開ける。中身は ObjectView */
      &.is-clickable {
        cursor: pointer;
      }
      &.is-clickable:hover {
        box-shadow: inset 0 0 0 2px #ef9a9a;
      }
      .e-leader-mark {
        width: 100%;
        text-align: center;
      }
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
    z-index: ${Z_FIXED_CROSS};
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-weight: bold;
    color: #555;
    padding: 4px;

    /* スタッフ列に効く操作（部署別・部署フィルタ・可能勤務帯）。年月の下に置く。
       列幅（STAFF_COL_WIDTH）に収まらない分は折り返す。 */
    .e-corner-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-weight: normal;
    }
  }

  /* 日付ヘッダ（上に固定） */
  .e-day-head {
    position: sticky;
    top: 0;
    z-index: ${Z_FIXED};
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    /* 日単位の制約違反（責任者不在など）がある日は列ヘッダを警告色にする */
    &.is-warn {
      background: #fff3e0;
    }

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

    /* ダブルクリックでその日の詳細バブルを開ける（中身は ObjectView） */
    &.is-clickable:hover {
      background: #eceff1;
      box-shadow: inset 0 0 0 2px #90caf9;
    }
    /* ObjectView の中身。日番号＋曜日を縦に積んでセル全体をクリック対象にする */
    .e-day-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  }

  /* スタッフ名（左に固定）。抽出チェックボックスがあるときは横並び */
  .e-staff-cell {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED};
    background: #fff;
    display: flex;
    align-items: center;

    /* 抽出用チェックボックス（任意）。クリックは選択トグルのみ（行展開はしない） */
    .e-staff-check {
      flex: 0 0 auto;
      margin: 0 0 0 6px;
      cursor: pointer;
    }

    .e-staff {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      padding: 4px 8px;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;

      &:hover {
        background: #f5f7f8;
      }
    }
    .e-staff-icon {
      color: #888;
      flex-shrink: 0;
    }
    .e-staff-name {
      /* 名前を優先して表示（バッジに押し出されて隠れないように）。
         入れば1行、入らなければ空白で折り返す（文字の途中では切らない・切り捨てない）。 */
      flex: 1 1 auto;
      min-width: 0;
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: normal;
      line-height: 1.15;
      font-weight: bold;
    }
    /* 責任者バッジは名前を隠さないよう、右端に極小サイズで縦に積む */
    .e-staff-badges {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
    }
    /* 休みの形（分散／連休）のアイコン（DayOffStyleIcon）。休みが隣り合うか離れているかで見分ける */
    .e-day-off-style-icon {
      flex-shrink: 0;
      display: flex;
      cursor: help;
    }

    /* 参照レポートの貢献度スコア（＝自動シフトで休みを優先する順）。参照レポートと同じ琥珀色 */
    .e-priority-badge {
      flex-shrink: 0;
      font-size: 0.55em;
      font-weight: bold;
      line-height: 1.1;
      padding: 1px 3px;
      border-radius: 3px;
      white-space: nowrap;
      color: #8d6e00;
      background: #fffde7;
      border: 1px solid #ffe082;
      cursor: help;
    }
    /* 責任者バッジ。配色は leaderRoleStyle（ロールキー→色）を inline で当てる */
    .e-leader-badge {
      flex-shrink: 0;
      font-size: 0.55em;
      font-weight: bold;
      line-height: 1.1;
      padding: 1px 3px;
      border-radius: 3px;
      white-space: nowrap;

      /* クリックで関係者を抽出できるバッジ */
      &.is-clickable {
        cursor: pointer;
      }
      &.is-clickable:hover {
        filter: brightness(0.95);
        box-shadow: 0 0 0 1px currentColor inset;
      }
    }
  }


  ${cellFaceStyles}


  /* 制約エラーが出ているセルをホバーしたときだけ出す、解消案のふわっとしたヒント。
     クリックしやすいよう data-cell-key を自身にも持たせ、hover 判定が途切れないようにしている
     （ScheduleGridView 側のホバー検出を参照）。 */
  .e-constraint-fix-hint {
    position: absolute;
    transform: translate(-50%, 6px);
    z-index: ${Z_POPUP};
    max-width: 220px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 253, 245, 0.98);
    border: 1px solid rgba(239, 108, 0, 0.4);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
    font-size: 0.95em;
    color: #5d4037;
    line-height: 1.4;

    p {
      margin: 0 0 6px;
    }

    button {
      border: 1px solid #ef6c00;
      border-radius: 5px;
      background: #fff3e0;
      color: #e65100;
      font-size: 0.95em;
      font-weight: 600;
      padding: 3px 8px;
      cursor: pointer;

      &:hover {
        background: #ffe0b2;
      }
    }
  }

  /* 部署グループヘッダー行（全カラムスパン） */
  /* メンバー行の一番下（勤務スタッフバブルへの導線）。左固定でスタッフ名の列に乗る */
  .e-staff-foot {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED};
    background: #fafafa;
    padding: 2px 6px;
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    box-sizing: border-box;
    display: flex;
    align-items: center;
  }
  .e-staff-foot-link {
    /* <button> から ObjectView の中の <span> に変わったので、行揃えを自分で作る */
    display: inline-flex;
    align-items: center;
    border: 1px dashed #bbb;
    border-radius: 4px;
    background: transparent;
    color: #666;
    font-size: 0.8em;
    padding: 1px 6px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      border-color: #789;
      color: #345;
      background: #fff;
    }
  }
  .e-staff-foot-bar {
    background: #fafafa;
    border-bottom: 1px solid #ddd;
    box-sizing: border-box;
  }

  .e-dept-label {
    position: sticky;
    left: 0;
    z-index: ${Z_FIXED};
    background: #e8eaf6;
    color: #3949ab;
    font-weight: bold;
    font-size: 0.85em;
    padding: 3px 8px;
    border-right: 1px solid #c5cae9;
    border-bottom: 1px solid #c5cae9;
    box-sizing: border-box;
  }
  .e-dept-sep {
    background: #e8eaf6;
    border-bottom: 1px solid #c5cae9;
    box-sizing: border-box;
  }

`;
