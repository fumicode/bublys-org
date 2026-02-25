'use client';

import { FC, ReactNode } from "react";
import styled from "styled-components";
import { Staff_スタッフ, Role_係, SkillLevel_スキルレベル } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";

/** フィルターで絞り込まれたスキルの情報 */
export type FilteredSkills = {
  pc?: { level: SkillLevel_スキルレベル; operator: '>=' | '=' };
  zoom?: { level: SkillLevel_スキルレベル; operator: '>=' | '=' };
  english?: boolean;
  eventExperience?: boolean;
};

type StaffListViewProps = {
  staffList: Staff_スタッフ[];
  selectedStaffId?: string | null;
  buildDetailUrl: (staffId: string) => string;
  onStaffClick?: (staffId: string) => void;
  /** フィルターで絞り込まれたスキル（表示用） */
  filteredSkills?: FilteredSkills;
};

export const StaffListView: FC<StaffListViewProps> = ({
  staffList,
  selectedStaffId,
  buildDetailUrl,
  onStaffClick,
  filteredSkills,
}) => {
  /** フィルターに関連するスキルのバッジを生成 */
  const renderSkillBadges = (staff: Staff_スタッフ) => {
    if (!filteredSkills) return null;

    const badges: ReactNode[] = [];

    if (filteredSkills.pc) {
      const label = Role_係.getSkillLevelLabel(staff.skills.pc);
      badges.push(
        <span key="pc" className="e-skill-badge e-skill-badge--pc">
          PC: {label}
        </span>
      );
    }

    if (filteredSkills.zoom) {
      const label = Role_係.getSkillLevelLabel(staff.skills.zoom);
      badges.push(
        <span key="zoom" className="e-skill-badge e-skill-badge--zoom">
          Zoom: {label}
        </span>
      );
    }

    if (filteredSkills.english && staff.skills.english === 'daily_conversation') {
      badges.push(
        <span key="english" className="e-skill-badge e-skill-badge--english">
          英語可
        </span>
      );
    }

    if (filteredSkills.eventExperience && staff.skills.eventExperience) {
      badges.push(
        <span key="exp" className="e-skill-badge e-skill-badge--exp">
          経験あり
        </span>
      );
    }

    return badges.length > 0 ? <div className="e-skills">{badges}</div> : null;
  };

  return (
    <StyledStaffList>
      {staffList.length === 0 ? (
        <li className="e-empty">スタッフがいません</li>
      ) : (
        staffList.map((staff) => {
          const detailUrl = buildDetailUrl(staff.id);
          return (
            <li
              key={staff.id}
              className={`e-item ${selectedStaffId === staff.id ? "is-selected" : ""}`}
            >
              <ObjectView
                type="Staff"
                url={detailUrl}
                label={staff.name}
                draggable={true}
                onClick={() => onStaffClick?.(staff.id)}
              >
                <div className="e-content">
                  <PersonIcon fontSize="small" className="e-avatar" />
                  <div className="e-text">
                    <div className="e-name">{staff.name}</div>
                    <div className="e-meta">
                      {staff.state.school} / {staff.state.grade}
                    </div>
                    {renderSkillBadges(staff)}
                  </div>
                </div>
              </ObjectView>
            </li>
          );
        })
      )}
    </StyledStaffList>
  );
};

const StyledStaffList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.is-selected {
      background-color: #e3f2fd;
    }

    &:last-child {
      border-bottom: none;
    }

    > .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-avatar {
      color: #666;
      flex-shrink: 0;
    }

    .e-text {
      flex: 1;
      min-width: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-meta {
      color: #666;
      font-size: 0.85em;
    }

    .e-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }

    .e-skill-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7em;
      font-weight: bold;

      &.e-skill-badge--pc {
        background-color: #e3f2fd;
        color: #1565c0;
      }

      &.e-skill-badge--zoom {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }

      &.e-skill-badge--english {
        background-color: #e8f5e9;
        color: #2e7d32;
      }

      &.e-skill-badge--exp {
        background-color: #fff3e0;
        color: #e65100;
      }
    }
  }
`;
