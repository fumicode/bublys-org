'use client';

import { FC, ReactNode } from "react";
import styled, { css } from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import {
  BUILT_IN_PROFILE_ITEM,
  PROFILE_CATEGORIES,
  type ProfileCategoryKey,
  type ProfileEntry,
  type Staff,
  type StaffProfile,
} from "../domain/index.js";
import { ProfileMarks, profileMarkStyles } from "./ProfileMarks.js";
import { ProfileEditableCell, profileEditableCellStyles } from "./ProfileEditableCell.js";

/**
 * 1つの分類のセルの中身（#236）。値を並べる:
 *   - 名前の横に出す値 … その記号（🔰・囲んだ文字・責任者のバッジ・休みの形のアイコン）
 *   - 出さない値       … 薄い文字（表は一覧して読む場所なので、出さない値も読めるようにする）
 * 所属は名前のそばに出しているので、ここには並べない。
 */
export const ProfileCategoryCell: FC<{ entries: readonly ProfileEntry[] }> = ({ entries }) => (
  <span className="e-profile-cell-values">
    {entries
      .filter((e) => e.itemId !== BUILT_IN_PROFILE_ITEM.department)
      .flatMap((e) =>
        e.values.map((v) =>
          v.mark ? (
            <ProfileMarks key={`${e.itemId}:${v.id}`} marks={[v.mark]} />
          ) : (
            <span
              key={`${e.itemId}:${v.id}`}
              className="e-profile-text"
              title={`${e.itemName}：${v.label}${e.source === "member" ? "（この勤務表だけ）" : ""}`}
            >
              {v.label}
            </span>
          )
        )
      )}
  </span>
);

/**
 * ProfileCategoryCell の見た目。置き場所の styled に差し込む。
 * 責任者のバッジは形だけ（色は ProfileMarks が役割ごとに inline で当てる）
 */
export const profileCategoryCellStyles = css`
  .e-profile-cell-values {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px 5px;
  }
  .e-profile-text {
    font-size: 0.78em;
    color: #78909c;
    white-space: nowrap;
  }
  .e-leader-badge {
    font-size: 0.6em;
    font-weight: bold;
    line-height: 1.1;
    padding: 1px 3px;
    border-radius: 3px;
    white-space: nowrap;
  }
`;

type Row = {
  staff: Staff;
  profile: StaffProfile;
};

/**
 * スタッフプロファイルの表（人×分類。店舗の既定値。#236）。
 * セルの ✎ でその場の編集欄を開いて直す（renderEditor）。スタッフ詳細は勤務表の中の1人なので、
 * 店舗の階層であるこの表からは開かない。
 */
export const StaffProfileTableView: FC<{
  rows: readonly Row[];
  /** その人のその分類の編集欄（ProfileCategoryFields）。渡すとセルに ✎ が出る */
  renderEditor?: (staff: Staff, category: ProfileCategoryKey) => ReactNode;
}> = ({ rows, renderEditor }) => (
  <StyledTable>
    <thead>
      <tr>
        <th className="e-th-name">スタッフ</th>
        {PROFILE_CATEGORIES.map((c) => (
          <th key={c.key}>{c.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map(({ staff, profile }) => (
        <tr key={staff.id}>
          <td className="e-name">
            <div className="e-cell">
              <PersonIcon fontSize="small" className="e-icon" />
              <span className="e-label">{staff.name}</span>
              {staff.department && <span className="e-dept">{staff.department}</span>}
            </div>
          </td>
          {PROFILE_CATEGORIES.map((c) => (
            <td key={c.key}>
              <div className="e-cell">
                <ProfileEditableCell
                  title={`${staff.name}：${c.label}`}
                  editor={renderEditor && (() => renderEditor(staff, c.key))}
                >
                  <ProfileCategoryCell entries={profile.entriesIn(c.key)} />
                </ProfileEditableCell>
              </div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </StyledTable>
);

const StyledTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;

  th {
    font-weight: normal;
    font-size: 0.75em;
    color: #888;
    text-align: left;
    padding: 2px 6px;
    white-space: nowrap;
    border-bottom: 1px solid #e0e0e0;
  }
  td {
    padding: 0;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  .e-cell {
    min-height: 28px;
    padding: 3px 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  tr:hover td {
    background: #f5f7f8;
  }
  .e-name {
    white-space: nowrap;
    .e-icon {
      color: #90a4ae;
    }
    .e-label {
      font-weight: bold;
    }
    .e-dept {
      font-size: 0.75em;
      color: #3949ab;
    }
  }
  ${profileMarkStyles}
  ${profileCategoryCellStyles}
  ${profileEditableCellStyles}
`;
