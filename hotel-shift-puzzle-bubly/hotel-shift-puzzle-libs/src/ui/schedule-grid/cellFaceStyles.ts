import { css } from "styled-components";
import {
  OFF_RUN_COLOR,
  PROPOSAL_BORDER,
  RUN_TONE_COLOR,
  VIOLATION,
  VIOLATION_STRONG,
} from "./cellSymbols.js";

/**
 * セルの見た目（CellFace）のスタイル。勤務表のセルと、勤務割当のドロップダウンの選択肢が共有する。
 *
 * 色・形の意味は cellSymbols.ts（シンボル辞書）が決める。ここは辞書の記号をセルに当てはめるだけ。
 * ルール: **セルの見た目は1つの部品で描く。** 値（勤務帯色＋「時」/休）・提案（破線）・希望（円）・
 * 違反の印（帯・角・境目）・詰み（赤い斜線）の語彙はここにしかない。ドロップダウンは Popper で
 * body 直下に出てグリッドの CSS が届かないので、styled の中にこれを差し込んで同じ語彙を使う。
 */
export const cellFaceStyles = css`
  /* データセル */
  .e-cell {
    position: relative;
    /* セル自体はクリップしない。違反の印（ViolationMarks）が末尾のセルから左の列へ伸びるため。
       角へ退避した希望の円のクリップは .e-wish-marks が受け持つ。 */
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

  /* 範囲選択に入っているセル（#157）。勤務帯の背景色は inline なので、上に薄い青を重ねる */
  /* カット中の元のセル（#166）。Excel の点線と同じく、貼るまでは囲むだけ */
  .e-cell.is-cut-source::after {
    content: "";
    position: absolute;
    inset: 1px;
    border: 2px dashed #1976d2;
    pointer-events: none;
    z-index: 3;
  }
  .e-cell.is-in-range::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(25, 118, 210, 0.18);
    pointer-events: none;
    z-index: 1;
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
    /* 左上へ退避した希望の円をセルの内側でクリップする（角から1/4だけ覗かせる） */
    overflow: hidden;
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
       下のセルに重なっても読める。手前に出すため z-index はスクロールする面の中で最も高くする
       （制約ホバーの すりガラス=3 / リボン=4 より上。同じセルをホバーすると両方出るので、
       これらの下だと右へはみ出した円が隠れてしまう）。固定の列・行（Z_FIXED）よりは下に置く。
       上にすると、選択したまま横スクロールしたときにこのセルの違反の印が名前の列に透けて出る。
     - 値が入ったセル … 角に残した円の文字（＝叶った希望）を戻す。円のクリップは
       そのまま（角の弧という見た目を崩さない）。 */
  .e-cell.has-wish-hint:hover,
  .e-cell.has-wish-hint.is-selected {
    z-index: 5;
  }
  .e-cell.has-wish-hint:hover .e-wish-marks,
  .e-cell.has-wish-hint.is-selected .e-wish-marks {
    overflow: visible;
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
    background: ${VIOLATION};
    border: 1.5px solid ${VIOLATION_STRONG};
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

  /* 違反の印（ViolationMarks）。違反1件に印1つで、違反が覆う範囲の末尾のセルに置き、
     そこから左へ伸ばす。セルの中の絶対配置なので、行・列の番号を数えずにセルへ追従する。

     基準はセルの padding box（右と下の罫線 1px を除いた矩形）。重なり順は z-index:1 で
     「帯がかかる左のセル（選択中の z-index:1 も DOM で前なので下）より上、制約ホバーの
     オーバーレイ（3〜4）より下」。固定の列・行（Z_FIXED）はいつも印より手前なので、
     横スクロールで印が名前の列の下へ入っても透けて出ない。 */

  /* 連勤など複数日の違反: 覆う日の下端に1本の赤帯。
     --span 列ぶん左へ伸ばす。1列は「padding box の幅＋右の罫線 1px」なので、
     末尾のセルの右端から span 列ぶん戻ると先頭のセルの左端（＝以前の1セルずつの帯と同じ位置）。 */
  .e-violation-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    width: calc(var(--span, 1) * (100% + 1px) - 1px);
    height: 4px;
    background: ${VIOLATION};
    cursor: pointer;
    z-index: 1;
    transition: height 0.1s;

    &:hover {
      height: 7px;
    }
  }

  /* 連勤・連休の線（選択中のスタッフの行だけ。runMarkPlacement.ts）。赤帯と同じく末尾のセルから
     --span 列ぶん左へ伸ばす。隣の塊と見分けられるよう右端を 1px 空ける。
     連勤（2px 実線）: 何日目かで 緑＝上限-2日目まで → 黄緑＝上限-1日目 → 黄＝上限日目 と
     じわっと変わる。変わり目は前の日へ寄せてあり、上限日目は大半が黄になる
     （グラデーションは RunMarks.tsx が --run-* で組む）。上限+1日目からは濃い橙（違反なら赤帯が重なって赤になる）。
     連休（2px 点線）: 水色＝2連休 / 青＝3連休以上 */
  .e-run-bar {
    --run-ok: ${RUN_TONE_COLOR.ok};
    --run-near: ${RUN_TONE_COLOR.near};
    --run-limit: ${RUN_TONE_COLOR.limit};
    --run-over: ${RUN_TONE_COLOR.over};

    position: absolute;
    right: 1px;
    bottom: 0;
    width: calc(var(--span, 1) * (100% + 1px) - 2px);
    height: 2px;
    pointer-events: none;
    z-index: 1;

    /* 連休は点線にして、連勤の実線と形でも見分けられるようにする */
    &.is-off-2,
    &.is-off-long {
      height: 0;
      border-bottom: 2px dotted;
    }
    &.is-off-2 {
      border-color: ${OFF_RUN_COLOR["off-2"]};
    }
    &.is-off-long {
      border-color: ${OFF_RUN_COLOR["off-long"]};
    }
  }

  /* 1セルで完結する違反（可能勤務帯の外に入れた、など）: 右上の角の赤い三角。
     日をまたぐ違反（下端の赤帯）とは場所を分けて、同じセルに両方かかっても見分けられるようにする。

     枠（当たり判定）は三角より一回り大きい透明な正方形にし、三角は ::before で描く。
     三角そのものを当たり判定にすると、斜辺の下側が押せず小さすぎるため。
     右の境目には翌日の勤務間インターバルの印（z-index:1）が乗るので、角はその上（z-index:2）に置く。
     どちらもはみ出し幅は小さく、インターバルの印は残りの縦の帯と丸で押せる。 */
  .e-violation-corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    z-index: 2;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: ${VIOLATION};
      clip-path: polygon(0 0, 100% 0, 100% 100%);
      pointer-events: none;
      transition: width 0.1s, height 0.1s;
    }
    &:hover::before {
      width: 14px;
      height: 14px;
    }
  }

  /* 勤務間インターバル違反（遅番の翌日に早番など）: 隣り合う2日の「境目」に印を1つ出す。
     違反しているのはどちらか一方のセルの中身ではなく2日の間隔なので、下端の赤帯（範囲違反）や
     希望の円（単日違反）とは別の形にしている。
     後の日のセルに置き、中心を前の日の右の罫線（セルの左端から -0.5px）に合わせる。
     帯は細くする。前の日のセルへのはみ出しが太いと、前の日の右上の角（1セルの違反の印）を隠すため。
     見つけやすさは真ん中の丸が受け持つ。 */
  .e-interval-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -0.5px;
    width: 3px;
    transform: translateX(-50%);
    background: ${VIOLATION};
    cursor: pointer;
    z-index: 1;
    transition: width 0.1s;

    &:hover {
      width: 7px;
    }

    /* 境界線の上に乗る丸。帯の当たり判定（ObjectView）の子なので、丸の上でもバブルを開ける */
    .e-interval-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 11px;
      height: 11px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: ${VIOLATION};
      border: 1.5px solid #fff;
      box-sizing: border-box;
    }
  }

  /* 1セルだけを描くとき（ドロップダウンの選択肢）で、そのセルが前の日なら右の境目に置く */
  .e-interval-bar.is-right {
    left: auto;
    right: -0.5px;
    transform: translateX(50%);
  }

  /* 違反の印の当たり判定（ObjectView のラッパ span）。fullWidth で幅は枠いっぱいになるので、
     高さも枠いっぱいに広げる。膜は細い帯に沿うよう角丸を小さくする */
  .e-violation-hit {
    height: 100%;
    --object-view-film-radius: 2px;
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
     「承認すればこうなる」と読ませる（Enter / Tab で承認）。 */
  .e-forced {
    .e-forced-value {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.6em;
      padding: 0 3px;
      border: ${PROPOSAL_BORDER};
      border-radius: 4px;
      opacity: 0.5;
      font-weight: bold;
      font-size: 1.05em;
      font-variant-numeric: tabular-nums;
    }
  }
  /* 選択中は提案を少しはっきりさせる（今まさに Enter / Tab で承認できる場所） */
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
