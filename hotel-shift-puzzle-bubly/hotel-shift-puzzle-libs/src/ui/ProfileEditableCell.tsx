'use client';

import { FC, HTMLAttributes, ReactNode, useState } from "react";
import styled, { css } from "styled-components";
import { Popover } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { profileCategoryFieldsStyles } from "./ProfileCategoryFields.js";

type Props = {
  /** 編集欄の見出し（例: 「伊藤 さくら：基本情報」） */
  title: string;
  /**
   * 編集欄の中身（ProfileCategoryFields）。渡すと ✎ が出る。開いている間も毎回呼ぶので、
   * 直した値がその場で編集欄にも表にも出る
   */
  editor?: () => ReactNode;
  children: ReactNode;
};

/**
 * プロファイルの表のセル（#236）。中身（記号・値）の横に ✎ を出し、押すとその分類の編集欄を
 * その場に開く。スタッフ詳細を開かずに直せる。
 *
 * セルのダブルクリック（勤務スタッフの表ではスタッフ詳細を開く）とぶつからないよう、
 * ✎ は押す・ダブルクリックとも外へ伝えない。
 */
export const ProfileEditableCell: FC<Props> = ({ title, editor, children }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <span className="e-profile-editable">
      <span className="e-profile-editable-body">{children}</span>
      {editor && (
        <button
          type="button"
          className="e-profile-edit"
          title={`${title}を直す`}
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <EditIcon fontSize="inherit" />
        </button>
      )}
      {editor && (
        <Popover
          open={anchor !== null}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <StyledEditor onDoubleClick={(e) => e.stopPropagation()}>
            <h5>{title}</h5>
            {anchor && editor()}
          </StyledEditor>
        </Popover>
      )}
    </span>
  );
};

/** ProfileEditableCell の見た目（✎ の置き方）。表の styled に差し込む */
export const profileEditableCellStyles = css`
  .e-profile-editable {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  .e-profile-editable-body {
    flex: 1;
    min-width: 0;
  }
  .e-profile-edit {
    flex-shrink: 0;
    display: inline-flex;
    border: none;
    background: none;
    color: #b0bec5;
    font-size: 14px;
    padding: 2px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.1s;
    &:hover {
      color: #1976d2;
    }
  }
  /* 行に乗ったとき・キーボードで触れたときだけ ✎ を見せる（一覧を静かに保つ） */
  tr:hover .e-profile-edit,
  .e-profile-edit:focus-visible {
    opacity: 1;
  }
`;

// Popover は body 直下に出るので、編集欄の見た目はここで持つ
const StyledEditor = styled.div<HTMLAttributes<HTMLDivElement>>`
  padding: 10px 12px;
  min-width: 260px;
  max-width: 420px;
  font-size: 0.9rem;

  h5 {
    margin: 0 0 8px;
    font-size: 0.85em;
    color: #455a64;
  }
  ${profileCategoryFieldsStyles}
`;
