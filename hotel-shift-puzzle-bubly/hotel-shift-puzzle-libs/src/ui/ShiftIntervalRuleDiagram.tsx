'use client';

/**
 * ShiftIntervalRuleDiagram — 勤務間インターバルのルールをビジュアル化する図。
 *
 * 「遅番の翌日は早番・中番に入れない」を、左に前日のセル・右に翌日に選べるものを縦に並べ、
 * その間を「帰宅から8時間あける」インターバルで結んで見せる。腕（分岐）は、間隔が足りる先へは
 * 勤務帯の色でつながり、足りない先へは赤く途切れる（＝そこへは行けない）。
 *
 * 責任者ルールの図（LeaderRuleDiagram）が「多 → 1（このうち誰か一人が勤務帯へ）」なのに対し、
 * こちらは「1 → 多（この勤務帯の翌日、どれに行けるか）」。向きは逆だが、
 * 左右を腕でつないで宣言的ルールを1枚で読ませる、という作りは揃えてある。
 *
 * 純粋な表示：ShiftIntervalRule と勤務帯セットだけから導出する（特定の稼働日には依存しない）。
 * どれが禁止かの判定はここで書き直さず、必ず rule.allowsNextDay() に訊く。
 */
import { FC } from "react";
import type { HTMLAttributes } from "react";
import styled from "styled-components";
import { ShiftIntervalRule, WorkShift } from "../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./schedule-grid/constants.js";

type ShiftIntervalRuleDiagramProps = {
  /** 描画する宣言的ルール */
  rule: ShiftIntervalRule;
  /** この勤務表で使える勤務帯（開始時刻昇順）。翌日の選択肢として全部並べる */
  workShifts: WorkShift[];
};

// 行のレイアウト寸法（候補リストと SVG で座標を共有するため JS 側で持つ）
const ROW_H = 34; // 候補カードの高さ
const ROW_GAP = 8; // 行間
const SVG_W = 96; // 分岐部分の幅
const SPLIT_X = 26; // 幹から腕が分かれる点の x

const ALERT = "#e53935";
const NEUTRAL = { bg: "#eceff1", fg: "#607d8b" };

/** 翌日に選べるもの1つぶん。休みは勤務帯ではないので shiftId を持たない。 */
type NextOption = {
  key: string;
  label: string;
  /** 開始時刻など、ラベルの下に小さく出す補足 */
  sub?: string;
  shiftId?: string;
  allowed: boolean;
};

const colorOf = (shiftId?: string) => ({
  bg: (shiftId && SHIFT_BG[shiftId]) || NEUTRAL.bg,
  fg: (shiftId && SHIFT_FG[shiftId]) || NEUTRAL.fg,
});

export const ShiftIntervalRuleDiagram: FC<ShiftIntervalRuleDiagramProps> = ({
  rule,
  workShifts,
}) => {
  // 前日のセル＝このルールが対象にする勤務帯。色は勤務帯セットから引く（無ければグレー）。
  const fromShift = workShifts.find((w) => w.name === rule.fromShiftName);
  const from = colorOf(fromShift?.id);

  // 翌日に選べるもの＝この勤務表の全勤務帯 ＋ 休み。
  // 「入れる／入れない」は必ずルールに訊く（表示側で判定を書き直さない）。
  const options: NextOption[] = [
    ...workShifts.map((shift) => ({
      key: shift.id,
      label: shift.name,
      sub: shift.startTimeLabel,
      shiftId: shift.id,
      allowed: rule.allowsNextDay(rule.fromShiftName, shift.name),
    })),
    // 休みは勤務ではないので、このルールでは常に入れる（undefined を渡して確かめる）
    {
      key: "day-off",
      label: "休み",
      allowed: rule.allowsNextDay(rule.fromShiftName, undefined),
    },
  ];

  const n = options.length;
  const svgH = Math.max(ROW_H, n * ROW_H + (n - 1) * ROW_GAP);
  const midY = svgH / 2;
  const rowCenterY = (i: number) => i * (ROW_H + ROW_GAP) + ROW_H / 2;

  return (
    <StyledDiagram>
      <div className="e-head">
        <span className="e-chip">{rule.label}</span>
        <span className="e-cond">
          「{rule.fromShiftName}」の翌日に入れるのは <strong>休み</strong> か{" "}
          <strong>
            {options
              .filter((o) => o.allowed && o.shiftId)
              .map((o) => o.label)
              .join("・") || "（なし）"}
          </strong>{" "}
          だけ
        </span>
      </div>

      <div className="e-body">
        {/* 前日: このルールの勤務帯 */}
        <div className="e-side">
          <span className="e-side-label">前日</span>
          <div
            className="e-card e-prev"
            style={{
              background: from.bg,
              color: from.fg,
              borderColor: `${from.fg}59`,
            }}
          >
            <span className="e-card-label">{rule.fromShiftName}</span>
            {fromShift && <span className="e-card-sub">{fromShift.startTimeLabel}</span>}
          </div>
        </div>

        {/* 間隔: 帰宅から次の勤務まで N 時間。ここが足りるかどうかが分岐の理由。 */}
        <div className="e-side">
          <span className="e-side-label" aria-hidden>
            &nbsp;
          </span>
          <div className="e-rest" title={rule.restReason}>
            <span className="e-rest-hours">{rule.minRestHours}時間</span>
            <span className="e-rest-caption">帰宅→次の勤務</span>
          </div>
        </div>

        {/* 分岐: 間隔が足りる先へはつながり、足りない先へは途切れる */}
        <div className="e-side">
          <span className="e-side-label" aria-hidden>
            &nbsp;
          </span>
          <svg
          className="e-branch"
          width={SVG_W}
          height={svgH}
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          aria-hidden
        >
          {/* 幹（前日から分岐点まで）。前日の勤務帯の色。 */}
          <path
            d={`M 0 ${midY} L ${SPLIT_X} ${midY}`}
            fill="none"
            stroke={from.fg}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <circle cx={SPLIT_X} cy={midY} r={3.5} fill={from.fg} />

          {options.map((option, i) => {
            const y = rowCenterY(i);
            const color = colorOf(option.shiftId);
            const cx = (SPLIT_X + SVG_W) / 2;
            const d = `M ${SPLIT_X} ${midY} C ${cx} ${midY}, ${cx} ${y}, ${SVG_W} ${y}`;
            if (option.allowed) {
              return (
                <path
                  key={option.key}
                  d={d}
                  fill="none"
                  stroke={color.fg}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              );
            }
            // 入れない先: 赤い破線で伸ばし、途中で断ち切る（× を重ねる）
            return (
              <g key={option.key}>
                <path
                  d={d}
                  fill="none"
                  stroke={ALERT}
                  strokeWidth={1.8}
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  opacity={0.7}
                />
                <g transform={`translate(${cx} ${(midY + y) / 2})`}>
                  <circle r={7} fill="#fff" stroke={ALERT} strokeWidth={1.6} />
                  <path
                    d="M -3 -3 L 3 3 M 3 -3 L -3 3"
                    stroke={ALERT}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </g>
              </g>
            );
          })}
          </svg>
        </div>

        {/* 翌日: 選べるもの一覧（入れないものは打ち消す） */}
        <div className="e-side">
          <span className="e-side-label">翌日</span>
          <ul className="e-next" style={{ gap: ROW_GAP }}>
            {options.map((option) => {
              const color = colorOf(option.shiftId);
              return (
                <li
                  key={option.key}
                  className={`e-card e-next-card${option.allowed ? "" : " is-forbidden"}`}
                  style={{
                    background: color.bg,
                    color: color.fg,
                    borderColor: `${color.fg}59`,
                  }}
                  title={
                    option.allowed
                      ? `${rule.fromShiftName}の翌日に${option.label}は入れる`
                      : `${rule.fromShiftName}の翌日に${option.label}は入れない（${rule.restReason}）`
                  }
                >
                  <span className="e-card-label">{option.label}</span>
                  {option.sub && <span className="e-card-sub">{option.sub}</span>}
                  <span className="e-mark">{option.allowed ? "○" : "✕"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="e-why">{rule.describe()}</p>
      <p className="e-note">
        いまは勤務帯の組で持っています。勤務帯に終業時刻が入ったら、
        {rule.minRestHours}時間から自動で導けます。
      </p>
    </StyledDiagram>
  );
};

const StyledDiagram = styled.div<HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  font-size: 0.86em;
  color: #37474f;

  .e-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .e-chip {
    padding: 2px 8px;
    border-radius: 999px;
    background: #fce4ec;
    color: #ad1457;
    border: 1px solid #f8bbd0;
    font-weight: 700;
    white-space: nowrap;
  }
  .e-cond {
    color: #546e7a;
    strong {
      color: #37474f;
    }
  }

  /* 各列は「見出し＋中身」の同じ形にしてある（間隔ピルと分岐SVGの見出しは空白）。
     こうしておくと align-items:center で揃えたとき、分岐SVGの行と翌日カードの行が
     ぴったり重なる（列の高さが 見出し＋中身 で等しくなるため）。見出しの高さが列ごとに
     違うと、腕の行き先とカードが1行ぶんずれる。 */
  .e-body {
    display: flex;
    align-items: center;
    gap: 4px;
    /* 狭いバブルでは列を潰さず横スクロールさせる。潰れると腕の行き先とカードがずれる。 */
    overflow-x: auto;
  }

  /* 前日／間隔／分岐／翌日 の各列 */
  .e-side {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .e-side-label {
    font-size: 0.78em;
    font-weight: 700;
    color: #90a4ae;
    text-align: center;
  }

  .e-card {
    box-sizing: border-box;
    /* 高さは SVG の行座標と共有しているので、縮ませない */
    flex: 0 0 auto;
    height: ${ROW_H}px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 9px;
    border: 1px solid;
    border-radius: 6px;
    white-space: nowrap;
  }
  .e-card-label {
    font-weight: 700;
  }
  .e-card-sub {
    font-size: 0.8em;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }

  .e-next {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .e-next-card {
    justify-content: space-between;
    min-width: 104px;
  }
  .e-mark {
    font-weight: 700;
    color: #43a047;
  }

  /* 入れない勤務帯: 制約バーのアイコンと同じ見せ方（薄く＋赤で打ち消す） */
  .e-next-card.is-forbidden {
    position: relative;
    opacity: 0.55;

    .e-mark {
      color: ${ALERT};
      opacity: 1;
    }
    /* カードを横切る赤い打ち消し線（右端の ✕ は読めるよう手前で止める） */
    &::after {
      content: "";
      position: absolute;
      left: 6px;
      right: 26px;
      top: 50%;
      height: 2px;
      border-radius: 1px;
      background: ${ALERT};
    }
  }

  /* 間隔（帰宅から次の勤務まで） */
  .e-rest {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    padding: 6px 8px;
    border: 1px dashed #b0bec5;
    border-radius: 8px;
    background: #fafafa;
  }
  .e-rest-hours {
    font-weight: 700;
    color: #37474f;
    font-variant-numeric: tabular-nums;
  }
  .e-rest-caption {
    font-size: 0.72em;
    color: #90a4ae;
    white-space: nowrap;
  }

  .e-branch {
    display: block;
    flex-shrink: 0;
  }

  .e-why {
    margin: 0;
    padding-top: 8px;
    border-top: 1px dashed #e0e4e7;
    color: #546e7a;
  }
  .e-note {
    margin: 0;
    font-size: 0.78em;
    color: #b0bec5;
  }
`;
