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
import { Member } from "../domain/index.js";
import styled from "styled-components";
import { Button } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { BubblesContext } from "@bublys-org/bubbles-ui";

/** フィルター条件の型 */
export type MemberFilterCriteria = {
  department?: string;
  availableFor?: string[];  // 参加可能なシフトのID配列（AND条件）
};

/** URLクエリからフィルターをパース */
export function parseMemberFilter(query: string): MemberFilterCriteria {
  const filter: MemberFilterCriteria = {};
  if (!query) return filter;

  const params = new URLSearchParams(query);

  const department = params.get('department');
  if (department) {
    filter.department = department;
  }

  const availableFor = params.get('availableFor');
  if (availableFor) {
    filter.availableFor = availableFor.split(',');
  }

  return filter;
}

/** フィルターをURL文字列に変換 */
export function stringifyMemberFilter(filter: MemberFilterCriteria): string {
  const params = new URLSearchParams();

  if (filter.department) {
    params.set('department', filter.department);
  }
  if (filter.availableFor && filter.availableFor.length > 0) {
    params.set('availableFor', filter.availableFor.join(','));
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}

/** フィルター条件にマッチするか判定 */
function matchesFilter(member: Member, filter: MemberFilterCriteria): boolean {
  if (filter.department && member.department !== filter.department) {
    return false;
  }
  if (filter.availableFor && filter.availableFor.length > 0) {
    const allAvailable = filter.availableFor.every((shiftId) => member.isAvailableFor(shiftId));
    if (!allAvailable) {
      return false;
    }
  }
  return true;
}

/** フィルター条件を説明 */
function describeFilter(filter: MemberFilterCriteria): string {
  const parts: string[] = [];
  if (filter.department) {
    parts.push(`${filter.department}所属`);
  }
  if (filter.availableFor && filter.availableFor.length > 0) {
    parts.push(`${filter.availableFor.length}シフト参加可能`);
  }
  return parts.join('、');
}

type MemberCollectionProps = {
  filter?: MemberFilterCriteria;
  onMemberSelect?: (memberId: string) => void;
};

const buildDetailUrl = (memberId: string) => `shift-puzzle/members/${memberId}`;

export const MemberCollection: FC<MemberCollectionProps> = ({ filter, onMemberSelect }) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const selectedMemberId = useAppSelector(selectShiftPuzzleSelectedMemberId);
  const { openBubble } = useContext(BubblesContext);

  // 初期データのロード
  useEffect(() => {
    if (memberList.length === 0) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList.length]);

  // フィルター適用
  const filteredMemberList = useMemo(() => {
    if (!filter || Object.keys(filter).length === 0) {
      return memberList;
    }
    return memberList.filter((member) => matchesFilter(member, filter));
  }, [memberList, filter]);

  const handleMemberClick = (memberId: string) => {
    dispatch(setSelectedMemberId(memberId));
    onMemberSelect?.(memberId);
  };

  const hasFilter = filter && Object.keys(filter).length > 0;
  const filterDescription = hasFilter ? describeFilter(filter) : null;

  // 絞り込み検索バブルを開く
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

      <MemberListView
        memberList={filteredMemberList}
        selectedMemberId={selectedMemberId}
        buildDetailUrl={buildDetailUrl}
        onMemberClick={handleMemberClick}
        filteredDepartment={hasFilter ? filter.department : undefined}
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
