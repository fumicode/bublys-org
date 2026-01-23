'use client';

import { FC, useEffect, useMemo, useContext } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectGakkaiShiftStaffList,
  selectGakkaiShiftSelectedStaffId,
  setStaffList,
  setSelectedStaffId,
} from "@bublys-org/state-management";
import { StaffListView } from "../ui/StaffListView";
import { createSampleStaffList } from "../data/sampleStaff";
import { Staff_スタッフ, SkillLevel_スキルレベル, TimeSlot_時間帯 } from "../domain";
import { Role_係 } from "../domain";
import styled from "styled-components";
import { Button } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { BubblesContext } from "@bublys-org/bubbles-ui";

/** フィルター条件の型 */
export type StaffFilter = {
  pc?: { level: SkillLevel_スキルレベル; operator: '>=' | '=' };
  zoom?: { level: SkillLevel_スキルレベル; operator: '>=' | '=' };
  english?: boolean;
  eventExperience?: boolean;
  availableAt?: string[];  // 参加可能な時間帯のID配列（AND条件）
};

/** URLクエリからフィルターをパース */
export function parseStaffFilter(query: string): StaffFilter {
  const filter: StaffFilter = {};
  if (!query) return filter;

  const params = new URLSearchParams(query);

  // pc=intermediate+ → { level: 'intermediate', operator: '>=' }
  const pc = params.get('pc');
  if (pc) {
    if (pc.endsWith('+')) {
      filter.pc = { level: pc.slice(0, -1) as SkillLevel_スキルレベル, operator: '>=' };
    } else {
      filter.pc = { level: pc as SkillLevel_スキルレベル, operator: '=' };
    }
  }

  const zoom = params.get('zoom');
  if (zoom) {
    if (zoom.endsWith('+')) {
      filter.zoom = { level: zoom.slice(0, -1) as SkillLevel_スキルレベル, operator: '>=' };
    } else {
      filter.zoom = { level: zoom as SkillLevel_スキルレベル, operator: '=' };
    }
  }

  if (params.get('english') === 'yes') {
    filter.english = true;
  }

  if (params.get('eventExperience') === 'yes') {
    filter.eventExperience = true;
  }

  // availableAt=slot1,slot2,slot3 → ['slot1', 'slot2', 'slot3']
  const availableAt = params.get('availableAt');
  if (availableAt) {
    filter.availableAt = availableAt.split(',');
  }

  return filter;
}

/** フィルターをURL文字列に変換 */
export function stringifyStaffFilter(filter: StaffFilter): string {
  const params = new URLSearchParams();

  if (filter.pc) {
    params.set('pc', filter.pc.level + (filter.pc.operator === '>=' ? '+' : ''));
  }
  if (filter.zoom) {
    params.set('zoom', filter.zoom.level + (filter.zoom.operator === '>=' ? '+' : ''));
  }
  if (filter.english) {
    params.set('english', 'yes');
  }
  if (filter.eventExperience) {
    params.set('eventExperience', 'yes');
  }
  if (filter.availableAt && filter.availableAt.length > 0) {
    params.set('availableAt', filter.availableAt.join(','));
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}

/** スキルレベルを比較 */
function matchesSkillFilter(
  staffLevel: SkillLevel_スキルレベル,
  filterLevel: SkillLevel_スキルレベル,
  operator: '>=' | '='
): boolean {
  if (operator === '=') {
    return staffLevel === filterLevel;
  }
  // >= の場合
  const staffNum = Role_係.skillLevelToNumber(staffLevel);
  const filterNum = Role_係.skillLevelToNumber(filterLevel);
  return staffNum >= filterNum;
}

/** フィルター条件にマッチするか判定 */
function matchesFilter(staff: Staff_スタッフ, filter: StaffFilter): boolean {
  if (filter.pc && !matchesSkillFilter(staff.skills.pc, filter.pc.level, filter.pc.operator)) {
    return false;
  }
  if (filter.zoom && !matchesSkillFilter(staff.skills.zoom, filter.zoom.level, filter.zoom.operator)) {
    return false;
  }
  if (filter.english && staff.skills.english !== 'daily_conversation') {
    return false;
  }
  if (filter.eventExperience && !staff.skills.eventExperience) {
    return false;
  }
  // 参加可能時間帯のAND条件チェック（すべての指定時間帯に参加可能である必要がある）
  if (filter.availableAt && filter.availableAt.length > 0) {
    const allAvailable = filter.availableAt.every((slotId) => staff.isAvailableAt(slotId));
    if (!allAvailable) {
      return false;
    }
  }
  return true;
}

/** フィルター条件を人間が読める形式で説明（スキルと時間帯を分けて返す） */
function describeFilter(filter: StaffFilter): { skills: string; timeSlots: string } {
  const skillParts: string[] = [];
  let timeSlotsPart = '';

  if (filter.pc) {
    const levelLabel = Role_係.getSkillLevelLabel(filter.pc.level);
    const opLabel = filter.pc.operator === '>=' ? '以上' : '';
    skillParts.push(`PC${levelLabel}${opLabel}`);
  }

  if (filter.zoom) {
    const levelLabel = Role_係.getSkillLevelLabel(filter.zoom.level);
    const opLabel = filter.zoom.operator === '>=' ? '以上' : '';
    skillParts.push(`Zoom${levelLabel}${opLabel}`);
  }

  if (filter.english) {
    skillParts.push('英語可');
  }

  if (filter.eventExperience) {
    skillParts.push('経験あり');
  }

  if (filter.availableAt && filter.availableAt.length > 0) {
    const timeSlots = TimeSlot_時間帯.createDefaultTimeSlots();
    const slotLabels = filter.availableAt.map((slotId) => {
      const slot = timeSlots.find((s) => s.id === slotId);
      if (!slot) return slotId;
      const date = new Date(slot.date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const period = TimeSlot_時間帯.getPeriodLabel(slot.period);
      return `${month}/${day}${period}`;
    });
    timeSlotsPart = `${slotLabels.join('・')}参加可能`;
  }

  return { skills: skillParts.join('、'), timeSlots: timeSlotsPart };
}

type StaffCollectionProps = {
  filter?: StaffFilter;
  onStaffSelect?: (staffId: string) => void;
};

const buildDetailUrl = (staffId: string) => `gakkai-shift/staffs/${staffId}`;

export const StaffCollection: FC<StaffCollectionProps> = ({ filter, onStaffSelect }) => {
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectGakkaiShiftStaffList);
  const selectedStaffId = useAppSelector(selectGakkaiShiftSelectedStaffId);
  const { openBubble } = useContext(BubblesContext);

  // 初期データのロード
  useEffect(() => {
    if (staffList.length === 0) {
      const sampleData = createSampleStaffList();
      dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
    }
  }, [dispatch, staffList.length]);

  // フィルター適用
  const filteredStaffList = useMemo(() => {
    if (!filter || Object.keys(filter).length === 0) {
      return staffList;
    }
    return staffList.filter((staff) => matchesFilter(staff, filter));
  }, [staffList, filter]);

  const handleStaffClick = (staffId: string) => {
    dispatch(setSelectedStaffId(staffId));
    onStaffSelect?.(staffId);
  };

  const hasFilter = filter && Object.keys(filter).length > 0;
  const filterDescription = hasFilter ? describeFilter(filter) : null;

  // 絞り込み検索バブルを開く
  const handleOpenFilter = () => {
    // 現在のフィルター条件を引き継いで検索画面を開く
    const currentFilter = filter ? stringifyStaffFilter(filter) : '';
    openBubble(`gakkai-shift/staffs/filter${currentFilter}`, 'root');
  };

  return (
    <StyledContainer>
      <div className="e-header">
        {hasFilter && filterDescription ? (
          <>
            <div className="e-filter-description">
              {filterDescription.skills && (
                <p>「{filterDescription.skills}」</p>
              )}
              {filterDescription.timeSlots && (
                <p>「{filterDescription.timeSlots}」</p>
              )}
              <p>な</p>
            </div>
            <h3>
              スタッフ一覧
              <span className="e-filter-badge">
                ({filteredStaffList.length}/{staffList.length}名)
              </span>
            </h3>
          </>
        ) : (
          <h3>スタッフ一覧 ({staffList.length}名)</h3>
        )}
      </div>

      {/* 絞り込み検索ボタン */}
      <div className="e-filter-section">
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handleOpenFilter}
          className="e-filter-button"
        >
          絞り込み検索
        </Button>
      </div>

      <StaffListView
        staffList={filteredStaffList}
        selectedStaffId={selectedStaffId}
        buildDetailUrl={buildDetailUrl}
        onStaffClick={handleStaffClick}
        filteredSkills={hasFilter ? {
          pc: filter.pc,
          zoom: filter.zoom,
          english: filter.english,
          eventExperience: filter.eventExperience,
        } : undefined}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }

    .e-filter-description {
      margin: 0 0 4px 0;
      font-size: 0.85em;
      color: #1976d2;

      p {
        margin: 0;
      }
    }

    .e-filter-badge {
      font-weight: normal;
      color: #1976d2;
    }
  }

  .e-filter-section {
    margin-bottom: 12px;

    .e-filter-button {
      font-size: 0.85em;
      text-transform: none;
    }
  }
`;
