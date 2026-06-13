'use client';

import { FC } from "react";
import styled from "styled-components";
import { Staff } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";

type StaffDetailViewProps = {
  staff: Staff;
};

export const StaffDetailView: FC<StaffDetailViewProps> = ({ staff }) => {
  return (
    <StyledStaffDetail>
      <div className="e-header">
        <PersonIcon className="e-avatar" />
        <div className="e-title">
          {/* ObjectView: 詳細自身もダブルクリック展開 / ドラッグでポケットへ */}
          <ObjectView
            type="Staff"
            id={staff.id}
            label={staff.name}
            draggable={true}
            openingPosition="bubble-side"
          >
            <h3 className="e-name">{staff.name}</h3>
          </ObjectView>
        </div>
      </div>

      <section className="e-section">
        <h4>基本情報</h4>
        <dl className="e-dl">
          <dt>ID</dt>
          <dd>{staff.id}</dd>
          <dt>名前</dt>
          <dd>{staff.name}</dd>
        </dl>
      </section>
    </StyledStaffDetail>
  );
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
`;
