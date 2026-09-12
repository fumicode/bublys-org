'use client';

import { FC } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { ShiftWishStatusIcon } from "./ShiftWishStatusIcon.js";
import {
  collectedAtLabel,
  WISH_STATUS_LABEL,
  type ShiftWishStaffRow,
} from "./shiftWishStatus.js";
import { STAFF_SHIFT_WISH_SHEET_VIEW_TYPE } from "./viewObjectTypes.js";

type ShiftWishStaffListViewProps = {
  year: number;
  /** 1-12 */
  month: number;
  /** スタッフ全員ぶんの行（希望をまだ聞いていない人も「未入力」で並ぶ） */
  rows: ShiftWishStaffRow[];
  /**
   * その人の希望入力表バブルの URL。ObjectView に渡すだけで、ダブルクリック展開・ドラッグ・
   * data-url は ObjectView が担う。URL スキームは app 層の関心事なので注入で受ける。
   */
  wishUrl: (staffId: string) => string;
};

/**
 * ある月のシフト希望の回収状況（スタッフ全員ぶん）。
 *
 * シフト作成者がここを見て「まだ聞けていない人」を潰していく。行をダブルクリックすると、
 * その人・その月の入力表バブルが**新しく出る**。この画面の中で対象の人が入れ替わることは
 * ない（別の人を見たければ、その人のバブルを開く）。
 */
export const ShiftWishStaffListView: FC<ShiftWishStaffListViewProps> = ({
  year,
  month,
  rows,
  wishUrl,
}) => {
  const collected = rows.filter((r) => r.status === "collected").length;
  const started = rows.filter((r) => r.status !== "empty").length;

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          シフト希望{" "}
          <span className="e-sub">
            {year}年{month}月
          </span>
        </h3>
        <p className="e-progress">
          回収済み {collected}/{rows.length}人
          {started > collected && `・入力中 ${started - collected}人`}
        </p>
        <p className="e-note">
          本人から聞き取った希望を入力します。「入力する」をダブルクリックで入力表、
          名前をダブルクリックでその人のバブルが開きます。
        </p>
      </div>

      <ul className="e-staffs">
        {rows.length === 0 ? (
          <li className="e-empty">スタッフがいません</li>
        ) : (
          rows.map((row) => {
            const openLabel = row.status === "collected" ? "内容を見る" : "入力する";
            return (
              <li key={row.staff.id} className={`e-staff is-${row.status}`}>
                {/* ObjectView: ダブルクリックでスタッフ詳細バブル / ドラッグでポケットへ */}
                <div className="e-staff-head">
                  <ObjectView
                    object={row.staff}
                    label={row.staff.name}
                    draggable={true}
                    openingPosition="bubble-side-left"
                  >
                    <span className="e-staff-name">
                      <PersonIcon fontSize="small" className="e-avatar" />
                      {row.staff.name}
                      {row.staff.department && (
                        <span className="e-dept">{row.staff.department}</span>
                      )}
                    </span>
                  </ObjectView>
                </div>

                <div className="e-staff-status">
                  <span className="e-status-icon">
                    <ShiftWishStatusIcon status={row.status} />
                  </span>
                  {WISH_STATUS_LABEL[row.status]}
                  {row.status === "draft" && `・${row.filledDays}日ぶん`}
                  {row.status === "collected" &&
                    row.collectedAt &&
                    `・${collectedAtLabel(row.collectedAt)}`}
                </div>

                {/* ObjectView: ダブルクリックでこの人の入力表 / ドラッグでポケットへ */}
                <div className="e-staff-open">
                  <ObjectView
                    type={STAFF_SHIFT_WISH_SHEET_VIEW_TYPE}
                    url={wishUrl(row.staff.id)}
                    label={`${row.staff.name}のシフト希望（${year}年${month}月）`}
                    openingPosition="bubble-side-right"
                  >
                    <span
                      className={`e-open${row.status === "collected" ? " is-done" : ""}`}
                      title={`ダブルクリックで${row.staff.name}の入力表を開く`}
                    >
                      {openLabel}
                    </span>
                  </ObjectView>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 300px;

  .e-header {
    margin-bottom: 8px;
    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-progress {
      margin: 2px 0 0;
      font-size: 0.82em;
      font-weight: bold;
      color: #558b2f;
    }
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }

  .e-staffs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-staff {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "head button"
      "status button";
    align-items: center;
    gap: 0 8px;
    padding: 5px 8px;
    border: 1px solid #eee;
    border-radius: 4px;

    &.is-collected {
      background: #f1f8e9;
      border-color: #dcedc8;
    }
    &.is-draft {
      background: #fffdf5;
      border-color: #f2ead6;
    }
  }

  .e-staff-head {
    grid-area: head;
    min-width: 0;
  }
  .e-staff-name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    .e-avatar {
      color: #9e9e9e;
    }
    .e-dept {
      font-weight: normal;
      font-size: 0.78em;
      color: #999;
    }
  }

  .e-staff-status {
    grid-area: status;
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.78em;
    color: #888;
  }
  .e-status-icon {
    display: inline-flex;
    color: #9e9e9e;
    .is-collected & {
      color: #558b2f;
    }
    .is-draft & {
      color: #c8a415;
    }
  }

  /* ObjectView（UrledPlace）は display:contents なので、配置は外側の div に持たせる。
     ボタンの体裁は ObjectView の中の span 側で作る（<button> を包むと Enter を吸われる）。 */
  .e-staff-open {
    grid-area: button;
  }
  .e-open {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    border: 1px solid #90a4ae;
    border-radius: 6px;
    background: #eceff1;
    color: #37474f;
    font-size: 0.8em;
    padding: 3px 10px;
    cursor: pointer;

    &:hover {
      background: #cfd8dc;
    }
    /* 回収済みは「もう済んだこと」なので控えめに */
    &.is-done {
      border-color: transparent;
      background: transparent;
      color: #78909c;
    }
  }

  .e-empty {
    color: #999;
    font-size: 0.85em;
  }
`;
