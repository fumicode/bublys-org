'use client';

import { FC } from "react";
import styled from "styled-components";
import { Member } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { Button } from "@mui/material";

type MemberDetailViewProps = {
  member: Member;
  buildAvailabilityUrl?: (memberId: string) => string;
  onOpenAvailability?: (memberId: string) => void;
};

export const MemberDetailView: FC<MemberDetailViewProps> = ({
  member,
  buildAvailabilityUrl,
  onOpenAvailability,
}) => {
  const availabilityUrl = buildAvailabilityUrl?.(member.id);

  return (
    <StyledMemberDetail>
      <div className="e-header">
        <PersonIcon className="e-avatar" />
        <div className="e-title">
          <ObjectView
            type="Member"
            url={`shift-puzzle/members/${member.id}`}
            label={member.name}
            draggable={true}
          >
            <h3 className="e-name">{member.name}</h3>
          </ObjectView>
          {member.state.furigana && (
            <div className="e-furigana">{member.state.furigana}</div>
          )}
        </div>
        {member.isNewMember && (
          <span className="e-new-badge">新入生</span>
        )}
      </div>

      <section className="e-section">
        <h4>基本情報</h4>
        <dl className="e-dl">
          <dt>所属局</dt>
          <dd>{member.department}</dd>
          <dt>新入生</dt>
          <dd>{member.isNewMember ? "はい" : "いいえ"}</dd>
        </dl>
      </section>

      <section className="e-section">
        <h4>参加可能時間</h4>
        <div className="e-slots">
          {(() => {
            const dayTypes = Object.keys(member.availability) as (keyof typeof member.availability)[];
            const totalMinutes = dayTypes.reduce((acc, dt) => {
              const ranges = member.getAvailableRanges(dt);
              return acc + ranges.reduce((s, r) => s + (r.endMinute - r.startMinute), 0);
            }, 0);
            const summary = `${dayTypes.length}日分 / 計 ${Math.round(totalMinutes / 60 * 10) / 10}h`;

            if (dayTypes.length === 0) {
              return <span className="e-empty">なし</span>;
            }
            if (availabilityUrl) {
              return (
                <ObjectView
                  type="MemberAvailability"
                  url={availabilityUrl}
                  label={`${member.name}の参加可能時間`}
                  draggable={true}
                  onClick={() => onOpenAvailability?.(member.id)}
                >
                  <Button variant="text" size="small" component="span">
                    {summary}（詳細を見る）
                  </Button>
                </ObjectView>
              );
            }
            return <span>{summary}</span>;
          })()}
        </div>
      </section>

      {member.state.notes && (
        <section className="e-section">
          <h4>備考</h4>
          <p className="e-notes">{member.state.notes}</p>
        </section>
      )}
    </StyledMemberDetail>
  );
};

const StyledMemberDetail = styled.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .e-avatar {
    font-size: 48px;
    color: #666;
  }

  .e-title {
    flex: 1;
  }

  .e-name {
    margin: 0;
    font-size: 1.25em;
  }

  .e-furigana {
    color: #666;
    font-size: 0.85em;
  }

  .e-new-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.85em;
    font-weight: bold;
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
  }

  .e-dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;

    dt {
      color: #666;
      font-size: 0.9em;
    }

    dd {
      margin: 0;
    }
  }

  .e-slots {
    font-weight: bold;
  }

  .e-empty {
    color: #999;
  }

  .e-notes {
    margin: 0;
    white-space: pre-wrap;
    color: #333;
  }
`;
