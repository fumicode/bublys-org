'use client';

import { FC } from "react";
import styled from "styled-components";
import type {
  DeadCellDiagnosis,
  ScheduleRepair,
  ShiftCell,
} from "../domain/index.js";

type DeadCellDiagnosisViewProps = {
  diagnosis: DeadCellDiagnosis;
  /** スタッフID → 表示名 */
  nameOf: (staffId: string) => string;
  /** セルの値 → 表示名（"早番" / "休み"） */
  labelOf: (cell: ShiftCell) => string;
  /** その手を勤務表に書き込む */
  onApply: (repair: ScheduleRepair) => void;
};

/**
 * 詰みセルの診断表示（純粋）。
 *
 * 「なぜどの値も入らないのか」と「どこを書き換えれば入るのか」を並べる。
 * どの手が良いかは決めない——どの制約を優先するかは現場の判断なので、解消される違反と
 * 代償を両方見せて選んでもらう（repairDeadCell.ts の方針）。
 */
export const DeadCellDiagnosisView: FC<DeadCellDiagnosisViewProps> = ({
  diagnosis,
  nameOf,
  labelOf,
  onApply,
}) => {
  const { day, staffId, blocked, repairs } = diagnosis;

  return (
    <StyledWrap>
      <h3 className="e-head">
        {day.day}日 {nameOf(staffId)} は、どの値も入れられません
      </h3>

      <div className="e-section">
        <h4>入らない理由</h4>
        <ul className="e-reasons">
          {blocked.map((entry) => (
            <li key={labelOf(entry.cell)}>
              <span className="e-value">{labelOf(entry.cell)}</span>
              <span className="e-why">
                {entry.blockedBy.map((v) => v.message).join(" / ")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="e-section">
        <h4>
          解消できる手
          {repairs.length > 0 && <span className="e-count">{repairs.length}件</span>}
        </h4>
        {repairs.length === 0 ? (
          <p className="e-none">
            1か所を書き換えるだけでは解消できません。制約そのもの（連勤上限・休み上限・
            必要人数）を見直すか、複数箇所をまとめて組み直す必要があります。
          </p>
        ) : (
          <ul className="e-repairs">
            {repairs.map((repair) => (
              <li key={`${repair.staffId}:${repair.day.key}:${labelOf(repair.to)}`}>
                <div className="e-repair-head">
                  <span className="e-move">
                    {repair.day.day}日 {nameOf(repair.staffId)} → {labelOf(repair.to)}
                  </span>
                  <button type="button" onClick={() => onApply(repair)}>
                    この手を使う
                  </button>
                </div>
                <dl className="e-effect">
                  <dt>入れられるようになる</dt>
                  <dd>{repair.unlocks.map(labelOf).join("・")}</dd>
                  {repair.resolves.length > 0 && (
                    <>
                      <dt className="e-good">解消</dt>
                      <dd className="e-good">
                        {repair.resolves.map((v) => v.message).join(" / ")}
                      </dd>
                    </>
                  )}
                  <dt className={repair.costs.length > 0 ? "e-bad" : undefined}>代償</dt>
                  <dd className={repair.costs.length > 0 ? "e-bad" : undefined}>
                    {repair.costs.length === 0
                      ? "なし"
                      : repair.costs.map((v) => v.message).join(" / ")}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  font-size: 0.82em;
  color: #333;

  .e-head {
    margin: 0 0 8px;
    font-size: 1.05em;
    color: #b71c1c;
  }

  .e-section {
    margin-top: 10px;

    h4 {
      margin: 0 0 4px;
      font-size: 1em;
      color: #555;
    }
  }

  .e-count {
    margin-left: 6px;
    color: #888;
    font-weight: normal;
  }

  .e-reasons {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      gap: 8px;
      padding: 2px 0;
    }
  }

  .e-value {
    flex: 0 0 3.5em;
    color: #555;
  }

  .e-why {
    color: #b71c1c;
  }

  .e-none {
    margin: 0;
    color: #666;
    line-height: 1.5;
  }

  .e-repairs {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 6px 8px;
      background: #fafafa;
    }
  }

  .e-repair-head {
    display: flex;
    align-items: center;
    gap: 8px;

    .e-move {
      font-weight: bold;
    }

    button {
      margin-left: auto;
      border: 1px solid #90caf9;
      border-radius: 4px;
      background: #fff;
      color: #1565c0;
      cursor: pointer;
      padding: 1px 8px;
      font-size: 0.95em;

      &:hover {
        background: #e3f2fd;
      }
    }
  }

  .e-effect {
    display: grid;
    grid-template-columns: 10em 1fr;
    gap: 1px 8px;
    margin: 4px 0 0;

    dt {
      color: #888;
    }

    dd {
      margin: 0;
    }

    .e-good {
      color: #2e7d32;
    }

    .e-bad {
      color: #b71c1c;
    }
  }
`;
