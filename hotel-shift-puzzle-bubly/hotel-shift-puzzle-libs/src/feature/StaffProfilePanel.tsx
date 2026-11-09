'use client';

import { FC, useMemo } from "react";
import styled from "styled-components";
import type { Staff } from "../domain/index.js";
import { StaffProfileTableView } from "../ui/StaffProfileTableView.js";
import { useObjects } from "../objects/repository.js";
import { STAFF_TYPE } from "../objects/hotelObjects.js";
import { staffProfileResolver, useStaffProfileDictionary } from "./staffProfile.js";
import { StaffProfileDictionaryEditor } from "./StaffProfileDictionaryEditor.js";
import { useStoreProfileEditing } from "./profileEditing.js";
import { ProfileCategoryFields } from "../ui/ProfileCategoryFields.js";

/**
 * スタッフプロファイルのバブル（店舗。#236）。
 *
 *   - 上 … 人×分類の表（店舗での既定値）。セルの ✎ でその場の編集欄を開いて直す。
 *          スタッフ詳細は勤務表の中の1人なので、店舗の階層であるここからは開かない
 *   - 下 … 辞書（項目・値・名前の横の見せ方）。組み込みの項目（所属・責任者・休みの形）の
 *          見せ方もここ
 *
 * 責任者は勤務表ごとに決めるので、店舗の表には出ない（勤務スタッフの表に出る）。
 */
export const StaffProfilePanel: FC = () => {
  const roster = useObjects<Staff>(STAFF_TYPE);
  const dictionary = useStaffProfileDictionary();
  const profileOf = useMemo(
    () => staffProfileResolver({ staffList: roster, dictionary }),
    [roster, dictionary]
  );
  // セルの ✎ で開く編集欄（店舗の既定値）
  const profileFieldsOf = useStoreProfileEditing();
  const rows = useMemo(
    () => roster.map((staff) => ({ staff, profile: profileOf(staff.id) })),
    [roster, profileOf]
  );

  return (
    <StyledContainer>
      <h3>スタッフプロファイル</h3>
      <p className="e-lead">
        店舗での既定値です。セルの ✎ で直せます（これから作る勤務表に効きます）。
        責任者や、作成済みの勤務表での値は、その勤務表の勤務スタッフで直します。
      </p>
      <StaffProfileTableView
        rows={rows}
        renderEditor={(staff, category) => (
          <ProfileCategoryFields category={category} staff={staff} {...profileFieldsOf(staff)} />
        )}
      />

      <details className="e-dictionary">
        <summary>辞書（項目・値・名前の横の見せ方）</summary>
        <StaffProfileDictionaryEditor />
      </details>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  h3 {
    margin: 0 0 4px;
  }
  .e-lead {
    margin: 0 0 8px;
    font-size: 0.8em;
    color: #607d8b;
  }
  .e-dictionary {
    margin-top: 16px;
    summary {
      cursor: pointer;
      font-weight: bold;
      color: #455a64;
      margin-bottom: 8px;
    }
  }
`;
