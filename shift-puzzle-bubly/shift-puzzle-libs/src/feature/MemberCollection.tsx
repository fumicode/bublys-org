'use client';

import { FC, useEffect, useMemo, useContext } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzleSelectedMemberId,
  setMemberList,
  setSelectedMemberId,
} from "../slice/index.js";
import { MemberListView } from "../ui/MemberListView.js";
import { createSampleMemberList } from "../data/sampleMember.js";
import { Member, type DayType } from "../domain/index.js";
import styled from "styled-components";
import { Button } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { BubblesContext } from "@bublys-org/bubbles-ui";

/** フィルター条件の型 */
export type MemberFilterCriteria = {
  departments?: string[];  // 複数選択（OR条件）
  newMemberOnly?: boolean;
  veteranOnly?: boolean;
  availableAt?: {
    dayType: DayType;
    startMinute: number;
    endMinute: number;
  };
};

/** URLクエリからフィルターをパース */
export function parseMemberFilter(query: string): MemberFilterCriteria {
  const filter: MemberFilterCriteria = {};
  if (!query) return filter;

  const params = new URLSearchParams(query);

  const departments = params.get('departments');
  if (departments) filter.departments = departments.split(',');

  if (params.get('newMemberOnly') === '1') filter.newMemberOnly = true;
  if (params.get('veteranOnly') === '1') filter.veteranOnly = true;

  const dayType = params.get('availableAtDayType') as DayType | null;
  const start = params.get('availableAtStart');
  const end = params.get('availableAtEnd');
  if (dayType && start && end) {
    filter.availableAt = {
      dayType,
      startMinute: parseInt(start, 10),
      endMinute: parseInt(end, 10),
    };
  }

  return filter;
}

/** フィルターをURL文字列に変換 */
export function stringifyMemberFilter(filter: MemberFilterCriteria): string {
  const params = new URLSearchParams();

  if (filter.departments && filter.departments.length > 0) {
    params.set('departments', filter.departments.join(','));
  }
  if (filter.newMemberOnly) params.set('newMemberOnly', '1');
  if (filter.veteranOnly) params.set('veteranOnly', '1');
  if (filter.availableAt) {
    params.set('availableAtDayType', filter.availableAt.dayType);
    params.set('availableAtStart', String(filter.availableAt.startMinute));
    params.set('availableAtEnd', String(filter.availableAt.endMinute));
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}

/** フィルター条件にマッチするか判定 */
function matchesFilter(member: Member, filter: MemberFilterCriteria): boolean {
  if (filter.departments && filter.departments.length > 0 && !filter.departments.includes(member.department)) return false;
  if (filter.newMemberOnly && !member.isNewMember) return false;
  if (filter.veteranOnly && member.isNewMember) return false;
  if (filter.availableAt) {
    const { dayType, startMinute, endMinute } = filter.availableAt;
    const ranges = member.getAvailableRanges(dayType);
    const covers = ranges.some(r => r.startMinute <= startMinute && r.endMinute >= endMinute);
    if (!covers) return false;
  }
  return true;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** フィルター条件を説明 */
function describeFilter(filter: MemberFilterCriteria): string {
  const parts: string[] = [];
  if (filter.departments && filter.departments.length > 0) {
    parts.push(`${filter.departments.join('・')}所属`);
  }
  if (filter.newMemberOnly) parts.push('新入生のみ');
  if (filter.veteranOnly) parts.push('経験者のみ');
  if (filter.availableAt) {
    const { dayType, startMinute, endMinute } = filter.availableAt;
    parts.push(`${dayType} ${minutesToTime(startMinute)}〜${minutesToTime(endMinute)}参加可能`);
  }
  return parts.join('、');
}

type MemberCollectionProps = {
  filter?: MemberFilterCriteria;
};

const buildDetailUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;

export const MemberCollection: FC<MemberCollectionProps> = ({ filter }) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const selectedMemberId = useAppSelector(selectShiftPuzzleSelectedMemberId);
  const { openBubble } = useContext(BubblesContext);

  // 初期データのロード（Redux Persist の旧スキーマ検出 → サンプル再投入）
  useEffect(() => {
    const needsReload =
      memberList.length === 0 ||
      memberList.some((m) => {
        const raw = m.state as unknown as Record<string, unknown>;
        return !('availability' in raw) || 'availableShiftIds' in raw;
      });
    if (needsReload) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList]);

  const filteredMemberList = useMemo(() => {
    if (!filter || Object.keys(filter).length === 0) return memberList;
    return memberList.filter((member) => matchesFilter(member, filter));
  }, [memberList, filter]);

  const handleMemberClick = (memberId: string) => {
    dispatch(setSelectedMemberId(memberId));
  };

  const hasFilter = filter && Object.keys(filter).length > 0;
  const filterDescription = hasFilter ? describeFilter(filter) : null;

  const handleOpenFilter = () => {
    const currentFilter = filter ? stringifyMemberFilter(filter) : '';
    openBubble(`shift-puzzle/members/filter${currentFilter}`, 'root');
  };

  return (
    <StyledContainer>
      <div className="e-header">
        {hasFilter && filterDescription ? (
          <>
            <div className="e-filter-description">
              <p>「{filterDescription}」な</p>
            </div>
            <h3>
              局員一覧
              <span className="e-filter-badge">
                ({filteredMemberList.length}/{memberList.length}名)
              </span>
            </h3>
          </>
        ) : (
          <h3>局員一覧 ({memberList.length}名)</h3>
        )}
      </div>

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

      {filteredMemberList.length > 0 && (
        <div
          className="e-drag-handle"
          draggable
          onDragStart={(e) => {
            draggingMemberIds = filteredMemberList.map(m => m.id);
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData(DRAG_TYPE_MEMBER_LIST, '');
          }}
          onDragEnd={() => { draggingMemberIds = null; }}
        >
          <DragIndicatorIcon fontSize="small" />
          {filteredMemberList.length}名をガントへドラッグ
        </div>
      )}

      <MemberListView
        memberList={filteredMemberList}
        selectedMemberId={selectedMemberId}
        buildDetailUrl={buildDetailUrl}
        onMemberClick={handleMemberClick}
        filteredDepartment={hasFilter && filter.departments?.length === 1 ? filter.departments[0] : undefined}
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
    margin-bottom: 8px;

    .e-filter-button {
      font-size: 0.85em;
      text-transform: none;
    }
  }

  .e-drag-handle {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    margin-bottom: 8px;
    background: #f0f4ff;
    border: 1px dashed #7986cb;
    border-radius: 4px;
    cursor: grab;
    font-size: 0.82em;
    color: #3949ab;
    user-select: none;

    &:hover {
      background: #e8ecff;
      border-color: #3949ab;
    }

    &:active {
      cursor: grabbing;
    }
  }
`;

// ========== ドラッグ転送用モジュール変数 ==========
// PrimitiveGanttEditor からimportして、drop 時に局員IDリストを受け取る

export const DRAG_TYPE_MEMBER_LIST = 'type/member-list';
export let draggingMemberIds: string[] | null = null;

