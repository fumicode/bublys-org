'use client';

import { FC } from "react";
import styled from "styled-components";
import { Staff_スタッフ } from "../domain";
import PersonIcon from "@mui/icons-material/Person";
import { UrledPlace } from "../../bubble-ui/components";

type StaffListViewProps = {
  staffList: Staff_スタッフ[];
  selectedStaffId?: string | null;
  buildDetailUrl: (staffId: string) => string;
  onStaffClick?: (staffId: string) => void;
};

export const StaffListView: FC<StaffListViewProps> = ({
  staffList,
  selectedStaffId,
  buildDetailUrl,
  onStaffClick,
}) => {
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
              <UrledPlace url={detailUrl}>
                <button
                  style={{ all: "unset", cursor: "pointer", width: "100%" }}
                  onClick={() => onStaffClick?.(staff.id)}
                >
                  <div className="e-content">
                    <PersonIcon fontSize="small" className="e-avatar" />
                    <div className="e-text">
                      <div className="e-name">{staff.name}</div>
                      <div className="e-meta">
                        {staff.state.school} / {staff.state.grade}
                      </div>
                    </div>
                    <div className="e-status">
                      <StatusBadge status={staff.status} />
                    </div>
                  </div>
                </button>
              </UrledPlace>
            </li>
          );
        })
      )}
    </StyledStaffList>
  );
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const label = Staff_スタッフ.getStatusLabel(status as 'pending' | 'accepted' | 'waitlist' | 'rejected');
  return <span className={`e-badge e-badge--${status}`}>{label}</span>;
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

    .e-status {
      flex-shrink: 0;
    }

    .e-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: bold;

      &.e-badge--pending {
        background-color: #fff3e0;
        color: #e65100;
      }

      &.e-badge--accepted {
        background-color: #e8f5e9;
        color: #2e7d32;
      }

      &.e-badge--waitlist {
        background-color: #e3f2fd;
        color: #1565c0;
      }

      &.e-badge--rejected {
        background-color: #fce4ec;
        color: #c62828;
      }
    }
  }
`;
