'use client';

import { FC } from "react";
import styled from "styled-components";
import type {
  ScheduleForecast,
  ScheduleForecastIntent,
  ShiftCell,
} from "../domain/index.js";

export type SchedulePossibilityItem = {
  forecast: ScheduleForecast;
  decisionNodeId?: string;
};

type Props = {
  staffName: string;
  dayLabel: string;
  items: SchedulePossibilityItem[];
  shiftNameOf: (shiftId: string) => string;
  onChoose: (item: SchedulePossibilityItem) => void;
};

const INTENT_LABEL: Record<ScheduleForecastIntent, string> = {
  "constraint-safe": "制約の安全性を優先",
  "wish-first": "本人の希望を優先",
  "demand-first": "必要人数を優先",
};

const RISK_LABEL = {
  safe: "予測範囲では安定",
  concession: "配慮上の譲歩が必要になる可能性",
  risky: "先で制約リスクが増える可能性",
  "dead-end": "完成時に制約を満たせない可能性",
} as const;

function cellLabel(
  cell: ShiftCell,
  shiftNameOf: (shiftId: string) => string
): string {
  if (cell.kind === "day-off") return "休みにする";
  if (cell.kind === "undecided") return "未定のままにする";
  return `${shiftNameOf(cell.shiftId)}にする`;
}

export const SchedulePossibilityView: FC<Props> = ({
  staffName,
  dayLabel,
  items,
  shiftNameOf,
  onChoose,
}) => (
  <StyledWrap>
    <header>
      <span className="e-kicker">未来の分岐</span>
      <h3>{staffName} / {dayLabel}</h3>
      <p>
        未来を見る → 見通しを比較 → この一手を選ぶ。
        選ぶのは最初の一手だけです。先の配置は見通しとして残ります。
      </p>
    </header>

    {items.length === 0 ? (
      <p className="e-empty">
        比較できる未来がありません。セルを未定のままにするか、勤務帯・休みの候補を増やしてください。
      </p>
    ) : (
    <div className="e-list">
      {items.map((item) => {
        const { forecast } = item;
        const metrics = forecast.state.projected;
        return (
          <article key={forecast.id} className={`e-card is-${forecast.risk}`}>
            <div className="e-intent">{INTENT_LABEL[forecast.intent]}</div>
            <div className="e-decision">
              {cellLabel(forecast.decision, shiftNameOf)}
            </div>
            <div className="e-risk">{RISK_LABEL[forecast.risk]}</div>
            <ul className="e-reasons">
              {forecast.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <dl className="e-metrics">
              <div>
                <dt>制約違反</dt>
                <dd>{metrics.violationCount}</dd>
              </div>
              <div>
                <dt>譲歩</dt>
                <dd>{metrics.concessionCount}</dd>
              </div>
              <div>
                <dt>不足</dt>
                <dd>{metrics.staffingGap}</dd>
              </div>
              <div>
                <dt>未定</dt>
                <dd>{metrics.undecidedCount}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={!item.decisionNodeId}
              onClick={() => onChoose(item)}
            >
              まずこの一手を選ぶ
            </button>
          </article>
        );
      })}
    </div>
    )}
  </StyledWrap>
);

const StyledWrap = styled.div`
  width: min(520px, 80vw);
  padding: 12px;
  color: #263238;

  header h3 {
    margin: 2px 0 4px;
    font-size: 1.05rem;
  }

  header p {
    margin: 0 0 12px;
    color: #607d8b;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .e-empty {
    margin: 8px 0 0;
    padding: 12px;
    border: 1px dashed #cfd8dc;
    border-radius: 8px;
    color: #78909c;
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .e-kicker {
    color: #7986cb;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
  }

  .e-list {
    display: grid;
    gap: 10px;
  }

  .e-card {
    border: 1px solid #d9deef;
    border-radius: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.92);
  }

  .e-card.is-risky,
  .e-card.is-dead-end {
    border-color: #ffcc80;
  }

  .e-intent {
    color: #5c6bc0;
    font-size: 0.72rem;
  }

  .e-decision {
    margin-top: 2px;
    font-weight: 700;
  }

  .e-risk {
    margin-top: 4px;
    color: #6d4c41;
    font-size: 0.76rem;
  }

  .e-reasons {
    margin: 8px 0;
    padding-left: 18px;
    color: #546e7a;
    font-size: 0.76rem;
  }

  .e-metrics {
    display: flex;
    gap: 14px;
    margin: 8px 0;
  }

  .e-metrics div {
    display: flex;
    gap: 4px;
    font-size: 0.74rem;
  }

  .e-metrics dt {
    color: #78909c;
  }

  .e-metrics dd {
    margin: 0;
    font-weight: 700;
  }

  button {
    border: 1px solid #7986cb;
    border-radius: 6px;
    background: #eef0ff;
    color: #3949ab;
    padding: 5px 10px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.45;
    cursor: wait;
  }
`;
