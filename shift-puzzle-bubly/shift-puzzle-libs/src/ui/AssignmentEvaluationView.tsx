'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  StaffAssignmentEvaluation_スタッフ配置評価,
  SkillMatchDetail,
  ConstraintViolation,
} from "../domain/index.js";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningIcon from "@mui/icons-material/Warning";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import { Button } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";

type AssignmentEvaluationViewProps = {
  evaluation: StaffAssignmentEvaluation_スタッフ配置評価;
  staffName: string;
  timeSlotLabel: string;
  roleName: string;
  constraintViolations?: ConstraintViolation[];
  staffDetailUrl?: string;
  staffAvailabilityUrl?: string;
  onStaffClick?: () => void;
  onTimeSlotClick?: () => void;
};

export const AssignmentEvaluationView: FC<AssignmentEvaluationViewProps> = ({
  evaluation,
  staffName,
  timeSlotLabel,
  roleName,
  constraintViolations = [],
  staffDetailUrl,
  staffAvailabilityUrl,
  onStaffClick,
  onTimeSlotClick,
}) => {
  const status = evaluation.getOverallStatus();

  return (
    <StyledContainer>
      <div className="e-header">
        <div className="e-assignment-visual">
          {/* 左側: 時間帯・係のセル */}
          <div className="e-cell">
            <div className="e-cell-primary">
              {staffAvailabilityUrl ? (
                <ObjectView
                  type="StaffAvailability"
                  url={staffAvailabilityUrl}
                  label={`${staffName}の参加可能時間帯`}
                  draggable={true}
                  onClick={onTimeSlotClick}
                >
                  <Button variant="text" size="small" component="span" className="e-link-button">
                    {timeSlotLabel}
                  </Button>
                </ObjectView>
              ) : (
                <span>{timeSlotLabel}</span>
              )}
            </div>
            <div className="e-cell-secondary">{roleName}</div>
          </div>

          {/* 中央: 総合評価 + 矢印 */}
          <div className="e-center">
            <div className={`e-score is-${status}`}>
              {evaluation.totalScore > 0 ? "+" : ""}{evaluation.totalScore}pt
            </div>
            <ArrowBackIcon className="e-arrow" />
          </div>

          {/* 右側: スタッフ */}
          <div className="e-cell">
            <div className="e-cell-primary">
              <PersonIcon className="e-person-icon" />
              {staffDetailUrl ? (
                <ObjectView
                  type="Staff"
                  url={staffDetailUrl}
                  label={staffName}
                  draggable={true}
                  onClick={onStaffClick}
                >
                  <Button variant="text" size="small" component="span" className="e-link-button">
                    {staffName}
                  </Button>
                </ObjectView>
              ) : (
                <span>{staffName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="e-section">
        <div className="e-section-title">スキルマッチング</div>
        <div className="e-skill-table">
          <div className="e-skill-header">
            <span className="e-skill-name">スキル</span>
            <span className="e-skill-required">要求</span>
            <span className="e-skill-has">本人</span>
            <span className="e-skill-result">評価</span>
          </div>
          {evaluation.skillMatches.map((match, idx) => (
            <SkillMatchRow key={idx} match={match} />
          ))}
        </div>
      </div>

      <div className="e-section">
        <div className="e-section-title">時間帯</div>
        <div className="e-row">
          <span className="e-label">参加可能:</span>
          <EvalIcon ok={evaluation.isAvailable} />
        </div>
        <div className="e-row">
          <span className="e-label">発表重複:</span>
          <span className={evaluation.hasPresentationConflict ? "is-bad" : "is-good"}>
            {evaluation.hasPresentationConflict ? "あり" : "なし"}
          </span>
        </div>
      </div>

      {constraintViolations.length > 0 && (
        <div className="e-section e-constraint-violations">
          <div className="e-section-title">
            <WarningIcon fontSize="inherit" /> 制約違反
          </div>
          <ul className="e-violation-list">
            {constraintViolations.map((violation, idx) => (
              <li key={idx}>{violation.message}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.issues.length > 0 && (
        <div className="e-section e-issues">
          <div className="e-section-title">
            <WarningIcon fontSize="inherit" /> 注意事項
          </div>
          <ul className="e-issue-list">
            {evaluation.issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </StyledContainer>
  );
};

// 評価アイコン
const EvalIcon: FC<{ ok: boolean }> = ({ ok }) => (
  <span className={ok ? "is-good" : "is-bad"}>
    {ok ? <CheckCircleIcon fontSize="inherit" /> : <CancelIcon fontSize="inherit" />}
  </span>
);

// スキルレベルを日本語に変換
const getSkillLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    none: 'なし',
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級',
  };
  return labels[level] ?? level;
};

// 係からの要求を日本語に変換
const getRequiredLabel = (required: string): string => {
  if (required === 'none') return '要求なし';
  if (required === 'any') return 'あれば優先';
  return getSkillLevelLabel(required);
};

const getScoreSymbol = (diff: number): string => {
  if (diff >= 2) return '◎';
  if (diff >= 1) return '○';
  if (diff >= 0) return '△';
  return '×';
};

// スキルマッチ行
const SkillMatchRow: FC<{ match: SkillMatchDetail }> = ({ match }) => {
  // 要求なしの場合は評価対象外
  const isNotRequired = match.required === 'none';

  return (
    <div className="e-skill-row">
      <span className="e-skill-name">{match.skillName}</span>
      <span className="e-skill-required">{getRequiredLabel(match.required as string)}</span>
      <span className="e-skill-has">{getSkillLevelLabel(match.staffHas as string)}</span>
      <span className={`e-skill-result ${isNotRequired ? "is-not-required" : match.isMatch ? "is-match" : "is-no-match"}`}>
        {isNotRequired ? "-" : `${getScoreSymbol(match.scoreDiff)} ${match.scoreDiff > 0 ? `+${match.scoreDiff}` : match.scoreDiff}`}
      </span>
    </div>
  );
};

const StyledContainer = styled.div`
  padding: 12px;
  font-size: 0.9em;

  .e-header {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1976d2;
  }

  .e-assignment-visual {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-cell {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 10px;
    min-width: 0;
  }

  .e-cell-primary {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    font-size: 0.85em;
    white-space: nowrap;
  }

  .e-cell-secondary {
    font-size: 0.75em;
    color: #666;
    margin-top: 2px;
  }

  .e-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .e-score {
    font-size: 0.8em;
    font-weight: bold;
    margin-bottom: 2px;

    &.is-excellent { color: #2e7d32; }
    &.is-good { color: #558b2f; }
    &.is-acceptable { color: #f9a825; }
    &.is-warning { color: #ef6c00; }
    &.is-error { color: #c62828; }
  }

  .e-arrow {
    color: #999;
  }

  .e-person-icon {
    font-size: 1.1em;
    color: #666;
  }

  .e-section {
    margin-bottom: 12px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    &.e-issues {
      background-color: #fff3e0;
      border-color: #ff9800;
    }

    &.e-constraint-violations {
      background-color: #fffde7;
      border-color: #fbc02d;
    }
  }

  .e-violation-list {
    margin: 0;
    padding-left: 20px;

    li {
      padding: 2px 0;
      color: #f57f17;
    }
  }

  .e-section-title {
    font-weight: bold;
    font-size: 0.85em;
    color: #666;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .e-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;

    .e-label {
      min-width: 80px;
      color: #666;
    }
  }

  .is-good {
    color: #2e7d32;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .is-bad {
    color: #c62828;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .is-neutral {
    color: #666;
  }

  .e-skill-table {
    font-size: 0.9em;
  }

  .e-skill-header,
  .e-skill-row {
    display: flex;
    align-items: center;
    padding: 4px 0;

    .e-skill-name {
      width: 60px;
      flex-shrink: 0;
    }

    .e-skill-required {
      width: 80px;
      flex-shrink: 0;
    }

    .e-skill-has {
      width: 60px;
      flex-shrink: 0;
    }

    .e-skill-result {
      flex: 1;
      text-align: right;
    }
  }

  .e-skill-header {
    font-size: 0.8em;
    color: #888;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 2px;
  }

  .e-skill-row {
    .e-skill-name {
      font-weight: bold;
    }

    .e-skill-required {
      color: #1976d2;
    }

    .e-skill-has {
      color: #333;
    }

    .e-skill-result {
      font-weight: bold;

      &.is-match {
        color: #2e7d32;
      }

      &.is-no-match {
        color: #c62828;
      }

      &.is-not-required {
        color: #999;
        font-weight: normal;
      }
    }
  }

  .e-issue-list {
    margin: 0;
    padding-left: 20px;

    li {
      padding: 2px 0;
      color: #e65100;
    }
  }

  .e-link-button {
    padding: 0 4px;
    min-width: auto;
    font-size: inherit;
    font-weight: inherit;
    text-transform: none;
    vertical-align: baseline;
  }
`;
