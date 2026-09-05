import styled from "styled-components";

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

    /* キーボード操作のためグリッド自体を focusable にしている。
       選択はセルの枠線で示すので、コンテナ自身のフォーカス枠は消す。 */
    &:focus {
      outline: none;
    }
  }

  /* 選択モード（責任者バッジ/チェックで対象を選択中）の行の見た目。
     行は grid の直接の子（名前セル＋各日セル＋休合計）なので、各セルへ同じクラスを付けて表現する。
     - is-dimmed: 対象外の行。blur でぼかし薄くして背景に退かせる（クリックは可能なまま）。
     - is-focused: 対象の行。うっすら黄色く強調して少し浮かせる（sticky セルを崩さないよう transform は使わない）。 */
  .e-staff-cell.is-dimmed,
  .e-cell.is-dimmed,
  .e-off-total.is-dimmed,
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
  .e-off-total.is-focused {
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
  .e-res-head,
  .e-res-cell,
  .e-res-filler,
  .e-res-toggle,
  .e-res-toggle-bar {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
  }

  /* 予約情報ブロックの折りたたみトグル行（予約行の上）。左見出しは横スクロールで固定、
     右側は帯として全日列を覆う。クリックで開閉。 */
  .e-res-toggle {
    position: sticky;
    left: 0;
    z-index: 3;
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
    z-index: 1;
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
    right: 0;
    z-index: 1;
    background: #fff8f0;
    border-left: 1px solid #e0e0e0;
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
  /* 月の最低休日数に満たないスタッフの休み合計（制約違反の可視化） */
  .e-off-total.is-under-min {
    color: #c62828;
    background: #ffebee;
    font-weight: bold;
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

    /* 日単位の制約違反（責任者不在など）がある日は列ヘッダを警告色にし、⚠ を重ねる */
    &.is-warn {
      background: #fff3e0;
    }
    .e-day-warn {
      position: absolute;
      top: 0;
      right: 1px;
      font-size: 0.7em;
      line-height: 1;
      color: #e65100;
      pointer-events: none;
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
    z-index: 1;
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


  /* データセル */
  .e-cell {
    position: relative;
    /* 左上へ退避した希望の円をセルの内側でクリップする（角から1/4だけ覗かせる） */
    overflow: hidden;
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

    /* キーボードでフォーカス中のセル。hover より強い枠で示す */
    &.is-selected {
      box-shadow: inset 0 0 0 2px #1976d2;
      z-index: 1;
    }
  }

  /* 入力中バッファ（Enter 確定前に打った文字を選択セルに重ねて見せる） */
  .e-cell .e-input {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(25, 118, 210, 0.08);
    color: #0d47a1;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    z-index: 2;

    &::after {
      content: "";
      width: 1px;
      height: 1em;
      margin-left: 1px;
      background: #0d47a1;
      animation: e-caret-blink 1s step-end infinite;
    }
  }

  @keyframes e-caret-blink {
    50% {
      opacity: 0;
    }
  }


  /* 未割当セルに薄く表示する希望ヒント */
  /* シフト希望の円。実際の割当と同じ1文字（休 / 7 …）を、文字色と同じ色の線で囲む。
     色は --wish-color（勤務帯色 / 休みはグレー）で inline から入る。見た目（背景・線幅・
     不透明度）は状態ごとにここで決める。

     円と中の文字は別要素にして「独立して」動かす:
       - 何も入っていないセル … 円は中央・通常サイズ、文字も中央（しっかり見せる）
       - 実際の値が入ったセル … 円は大きくなり、中心がセルの左上角へ移動する
         （overflow:hidden でクリップされ、円の 1/4 だけが角から覗く）。文字は円と別に
         「見えている右下の1/4」の中へ移動して読めるまま残る。すでに決まった情報なので
         背景は透明・線は細く・薄く（叶っていれば opacity 0.7）して控えめにする。
       - 希望が叶わなかった円だけは背景赤・文字白のまま強く出す（アラート）。
     left/top を % で持つので、状態が変わると transition でなめらかに動く。 */
  .e-wish-marks {
    position: absolute;
    inset: 0;
    pointer-events: none; /* セルの選択を邪魔しない（叶わなかった円だけ下で戻す） */
  }

  .e-wish-badge {
    position: absolute;
    left: 50%;
    top: 50%;
    /* 複数希望は横に並べる（--i=何番目 / --n=総数） */
    margin-left: calc((var(--i, 0) - (var(--n, 1) - 1) / 2) * 22px);
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border: 1.5px solid var(--wish-color, #607d8b);
    border-radius: 50%;
    background: #fff;
    color: var(--wish-color, #607d8b);
    transform: translate(-50%, -50%);
    transition: left 0.24s ease, top 0.24s ease, width 0.24s ease, height 0.24s ease,
      margin-left 0.24s ease, background 0.18s ease, border-color 0.18s ease,
      border-width 0.18s ease, color 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
  }

  /* 中の文字。円とは独立に動く（円が角へ逃げても、文字は見える側へ寄る）。細字で。 */
  .e-wish-char {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.78em;
    font-weight: 400;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    transition: left 0.24s ease, top 0.24s ease, font-size 0.24s ease, opacity 0.18s ease;
  }

  /* 実際の値が入ったセル: 円は中心が左上角へ（＝1/4だけ覗く）。控えめに。 */
  .e-wish-marks.is-corner .e-wish-badge {
    left: 0%;
    top: 0%;
    width: 30px;
    height: 30px;
    margin-left: calc(var(--i, 0) * 15px);
    background: transparent; /* すでに決まった情報なので背景は敷かない */
    border-width: 1px; /* 線も細く */
    opacity: 0.7;
  }
  /* 文字は円の「見えている右下1/4」の中へ寄せる */
  .e-wish-marks.is-corner .e-wish-char {
    left: 68%;
    top: 68%;
    font-size: 0.6em;
  }

  /* 希望どおりに入ったセル: もう決まった情報なので、中の文字は消して小さな弧だけ角に残す。
     （叶わなかった円だけは下のルールで文字ごと強く出す） */
  .e-wish-marks.is-corner .e-wish-badge:not(.is-mismatch) {
    width: 22px;
    height: 22px;
  }
  .e-wish-marks.is-corner .e-wish-badge:not(.is-mismatch) .e-wish-char {
    opacity: 0;
  }

  /* いま見ているセル（hover / キーボード選択中）は「希望を読むモード」にする。
     平常時は情報量を抑えて省略しているものを、見ているセルだけ読めるまで開く。

     - 未割当で希望が複数あるセル … 円が横に並ぶとセル幅に収まらず端が切れて読めないので、
       クリップを外して（overflow: visible）隣の列の上へはみ出させる。円の背景は白なので
       下のセルに重なっても読める。手前に出すため z-index はグリッド内で最も高くする
       （制約ホバーの すりガラス=3 / リボン=4 より上。同じセルをホバーすると両方出るので、
       これらの下だと右へはみ出した円が隠れてしまう）。
     - 値が入ったセル … 角に残した円の文字（＝叶った希望）を戻す。円のクリップは
       そのまま（角の弧という見た目を崩さない）。 */
  .e-cell.has-wish-hint:hover,
  .e-cell.has-wish-hint.is-selected {
    overflow: visible;
    z-index: 5;
  }
  .e-cell:hover .e-wish-marks.is-corner .e-wish-badge .e-wish-char,
  .e-cell.is-selected .e-wish-marks.is-corner .e-wish-badge .e-wish-char {
    opacity: 1;
  }

  /* ×（避けたい）希望は破線の円＋取り消し線で区別する */
  .e-wish-badge.is-avoid {
    border-style: dashed;
  }
  .e-wish-badge.is-avoid .e-wish-char {
    text-decoration: line-through;
  }

  /* 希望が叶わなかった円（旧・右上の ⊿ の代わり）。角へ寄っても背景赤・文字白のまま強く出す。
     ダブルクリックで違反バブルを開ける導線もここが担う。 */
  .e-wish-badge.is-mismatch,
  .e-wish-marks.is-corner .e-wish-badge.is-mismatch {
    background: #e53935;
    border: 1.5px solid #c62828;
    color: #fff;
    opacity: 1;
    pointer-events: auto;
    cursor: pointer;
    box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.22);
  }
  .e-wish-badge.is-mismatch .e-wish-char {
    font-weight: 700; /* 警告なので文字はしっかり */
  }
  .e-wish-badge.is-mismatch:hover {
    box-shadow: 0 0 0 4px rgba(229, 57, 53, 0.35);
  }

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

  /* 制約エラーが出ているセルをホバーしたときだけ出す、解消案のふわっとしたヒント。
     クリックしやすいよう data-cell-key を自身にも持たせ、hover 判定が途切れないようにしている
     （ScheduleGridView 側のホバー検出を参照）。 */
  .e-constraint-fix-hint {
    position: absolute;
    transform: translate(-50%, 6px);
    z-index: 5;
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
  .e-dept-label {
    position: sticky;
    left: 0;
    z-index: 1;
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

  .e-work {
    .e-shift-hour {
      font-weight: bold;
      font-size: 1.15em;
      font-variant-numeric: tabular-nums;
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

  /* 確定提案セル: 制約から一意に決まった値を「まだ入っていない」形で見せる。
     確定済みセルと同じ勤務帯色・同じ数字を使いつつ、薄く・破線で囲うことで
     「承認すればこうなる」と読ませる（Tab で承認）。 */
  .e-forced {
    .e-forced-value {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.6em;
      padding: 0 3px;
      border: 1px dashed rgba(0, 0, 0, 0.35);
      border-radius: 4px;
      opacity: 0.5;
      font-weight: bold;
      font-size: 1.05em;
      font-variant-numeric: tabular-nums;
    }
  }
  /* 選択中は提案を少しはっきりさせる（今まさに Tab で承認できる場所） */
  .e-forced.is-selected .e-forced-value {
    opacity: 0.75;
  }

  /* 詰みセル: 候補が1つも無い＝この先どうやっても埋められない。
     違反マーカー（右上の ⊿・下端の赤帯）は「今の割当が違反している」印なので、
     こちらは地を斜線ハッチにして「入れる値が無い」ことを別の見た目で言い分ける。 */
  .e-dead {
    background: repeating-linear-gradient(
      45deg,
      rgba(211, 47, 47, 0.06),
      rgba(211, 47, 47, 0.06) 3px,
      rgba(211, 47, 47, 0.16) 3px,
      rgba(211, 47, 47, 0.16) 6px
    );
    .e-dead-mark {
      color: #d32f2f;
      opacity: 0.65;
      font-weight: bold;
      font-size: 1.05em;
    }
  }
  .e-dead.is-selected .e-dead-mark {
    opacity: 0.9;
  }
`;
