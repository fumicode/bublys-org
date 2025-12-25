'use client';

import { FC } from "react";
import styled from "styled-components";
import { Staff_スタッフ, Role_係 } from "../domain";
import PersonIcon from "@mui/icons-material/Person";
import { UrledPlace } from "../../bubble-ui/components";
import { Button } from "@mui/material";

type StaffDetailViewProps = {
  staff: Staff_スタッフ;
  buildAvailabilityUrl?: (staffId: string) => string;
  onOpenAvailability?: (staffId: string) => void;
};

export const StaffDetailView: FC<StaffDetailViewProps> = ({
  staff,
  buildAvailabilityUrl,
  onOpenAvailability,
}) => {
  const availabilityUrl = buildAvailabilityUrl?.(staff.id);

  return (
    <StyledStaffDetail>
      <div className="e-header">
        <PersonIcon className="e-avatar" />
        <div className="e-title">
          <h3 className="e-name">{staff.name}</h3>
          <div className="e-furigana">{staff.state.furigana}</div>
        </div>
        <StatusBadge status={staff.status} />
      </div>

      <section className="e-section">
        <h4>基本情報</h4>
        <dl className="e-dl">
          <dt>所属</dt>
          <dd>{staff.state.school}</dd>
          <dt>学年</dt>
          <dd>{staff.state.grade}</dd>
          <dt>性別</dt>
          <dd>{Staff_スタッフ.getGenderLabel(staff.gender)}</dd>
          <dt>メール</dt>
          <dd>{staff.email}</dd>
          <dt>電話</dt>
          <dd>{staff.state.phone}</dd>
        </dl>
      </section>

      <section className="e-section">
        <h4>スキル</h4>
        <dl className="e-dl">
          <dt>PC</dt>
          <dd>{Role_係.getSkillLevelLabel(staff.skills.pc)}</dd>
          <dt>Zoom</dt>
          <dd>{Role_係.getSkillLevelLabel(staff.skills.zoom)}</dd>
          <dt>英語</dt>
          <dd>{staff.skills.english === 'daily_conversation' ? '日常会話可' : 'なし'}</dd>
          <dt>イベント経験</dt>
          <dd>
            {staff.skills.eventExperience ? 'あり' : 'なし'}
            {staff.skills.eventExperienceDetail && (
              <span className="e-detail"> ({staff.skills.eventExperienceDetail})</span>
            )}
          </dd>
        </dl>
      </section>

      <section className="e-section">
        <h4>参加可能時間帯</h4>
        <div className="e-slots">
          {staff.availableTimeSlots.length === 0 ? (
            <span className="e-empty">なし</span>
          ) : availabilityUrl ? (
            <UrledPlace url={availabilityUrl}>
              <Button
                variant="text"
                size="small"
                onClick={() => onOpenAvailability?.(staff.id)}
              >
                {staff.availableTimeSlots.length}枠 (詳細を見る)
              </Button>
            </UrledPlace>
          ) : (
            <span>{staff.availableTimeSlots.length}枠</span>
          )}
        </div>
      </section>

      {staff.presentation.hasPresentation && (
        <section className="e-section">
          <h4>発表予定</h4>
          <ul className="e-presentations">
            {staff.presentation.presentations.map((p, i) => (
              <li key={i}>{p.date} {p.period}</li>
            ))}
          </ul>
        </section>
      )}

      {staff.aptitudeScore !== undefined && (
        <section className="e-section">
          <h4>適性スコア</h4>
          <div className="e-score">{staff.aptitudeScore}点</div>
        </section>
      )}

      {staff.state.notes && (
        <section className="e-section">
          <h4>備考</h4>
          <p className="e-notes">{staff.state.notes}</p>
        </section>
      )}
    </StyledStaffDetail>
  );
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const label = Staff_スタッフ.getStatusLabel(status as 'pending' | 'accepted' | 'waitlist' | 'rejected');
  return <span className={`e-badge e-badge--${status}`}>{label}</span>;
};

const StyledStaffDetail = styled.div`
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

  .e-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.85em;
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

  .e-detail {
    color: #666;
    font-size: 0.9em;
  }

  .e-slots, .e-score {
    font-weight: bold;
  }

  .e-empty {
    color: #999;
  }

  .e-presentations {
    margin: 0;
    padding-left: 20px;
  }

  .e-notes {
    margin: 0;
    white-space: pre-wrap;
    color: #333;
  }
`;
