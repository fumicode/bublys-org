'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Staff } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";

type StaffDetailViewProps = {
  staff: Staff;
  /** 指定した年月のシフト希望エディタを開く */
  onOpenWish?: (year: number, month: number) => void;
};

export const StaffDetailView: FC<StaffDetailViewProps> = ({ staff, onOpenWish }) => {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);

  return (
    <StyledStaffDetail>
      <div className="e-header">
        <PersonIcon className="e-avatar" />
        <div className="e-title">
          {/* ObjectView: 詳細自身もダブルクリック展開 / ドラッグでポケットへ */}
          <ObjectView
            object={staff}
            label={staff.name}
            draggable={true}
            openingPosition="left-side"
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

      {onOpenWish && (
        <section className="e-section">
          <h4>シフト希望</h4>
          <div className="e-wish">
            <label>
              年
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              月
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </label>
            <button type="button" onClick={() => onOpenWish(year, month)}>
              この月の希望を編集
            </button>
          </div>
        </section>
      )}
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

  .e-wish {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      color: #555;
    }
    input {
      width: 64px;
      padding: 2px 4px;
    }
    button {
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      background: #fff;
      color: #37474f;
      font-size: 0.85em;
      padding: 4px 10px;
      cursor: pointer;

      &:hover {
        background: #eceff1;
        border-color: #90a4ae;
      }
    }
  }
`;
