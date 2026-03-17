'use client';

import { FC } from "react";
import styled from "styled-components";
import { Member } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";

type MemberListViewProps = {
  memberList: Member[];
  selectedMemberId?: string | null;
  buildDetailUrl: (memberId: string) => string;
  onMemberClick?: (memberId: string) => void;
  /** フィルターで絞り込まれた局（表示用） */
  filteredDepartment?: string;
};

export const MemberListView: FC<MemberListViewProps> = ({
  memberList,
  selectedMemberId,
  buildDetailUrl,
  onMemberClick,
  filteredDepartment,
}) => {
  return (
    <StyledMemberList>
      {memberList.length === 0 ? (
        <li className="e-empty">局員がいません</li>
      ) : (
        memberList.map((member) => {
          const detailUrl = buildDetailUrl(member.id);
          return (
            <li
              key={member.id}
              className={`e-item ${selectedMemberId === member.id ? "is-selected" : ""}`}
            >
              <ObjectView
                type="Member"
                url={detailUrl}
                label={member.name}
                draggable={true}
                onClick={() => onMemberClick?.(member.id)}
              >
                <div className="e-content">
                  <PersonIcon fontSize="small" className="e-avatar" />
                  <div className="e-text">
                    <div className="e-name">{member.name}</div>
                    <div className="e-meta">
                      {member.department}
                      {member.isNewMember && <span className="e-new-badge">新入生</span>}
                    </div>
                    {filteredDepartment && (
                      <div className="e-dept-badge">{member.department}</div>
                    )}
                  </div>
                </div>
              </ObjectView>
            </li>
          );
        })
      )}
    </StyledMemberList>
  );
};

const StyledMemberList = styled.ul`
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
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .e-new-badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.75em;
      background-color: #e8f5e9;
      color: #2e7d32;
      font-weight: bold;
    }

    .e-dept-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7em;
      font-weight: bold;
      background-color: #e3f2fd;
      color: #1565c0;
      margin-top: 2px;
    }
  }
`;
