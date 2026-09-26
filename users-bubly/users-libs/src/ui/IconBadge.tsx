import React from "react";
import styled from "styled-components";
import { ObjectView, ObjectType, OpeningPosition } from "@bublys-org/bubbles-ui";

type IconBadgeProps = {
  icon: React.ReactNode;
  label: string;
  /** このバッジが指すオブジェクトの URL。渡すとバッジが ObjectView になる */
  dataUrl?: string;
  /** オブジェクトの型（ドラッグ種別の解決に使う） */
  objectType?: ObjectType;
  /** ダブルクリックで開くときの展開位置 */
  openingPosition?: OpeningPosition;
};

/**
 * アイコン付きのバッジ。URL と型を渡すと「そのオブジェクトそのもの」になる
 * ＝ ドラッグでき、ダブルクリックで開く（ObjectView の約束）。
 *
 * 以前は onClick を受けて単クリックで開いていたが、開くのはダブルクリックに統一した。
 * role/tabIndex/キーボード/ドラッグ/UrledPlace は全て ObjectView が持っているので、
 * ここは見た目だけを持つ。
 */
export const IconBadge = ({
  icon,
  label,
  dataUrl,
  objectType,
  openingPosition = "bubble-side-right",
}: IconBadgeProps) => {
  const badge = (
    <StyledBadge $clickable={!!dataUrl}>
      <span className="e-icon">{icon}</span>
      <span className="e-label">{label}</span>
    </StyledBadge>
  );

  if (!dataUrl) return badge;

  return (
    <ObjectView
      type={objectType}
      url={dataUrl}
      label={label}
      openingPosition={openingPosition}
    >
      {badge}
    </ObjectView>
  );
};

const StyledBadge = styled.span<{ $clickable: boolean } & React.HTMLAttributes<HTMLSpanElement>>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f2f4f7;
  color: #333;
  font-size: 0.9em;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  user-select: none;

  .e-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #555;
  }

  &:hover {
    background: ${({ $clickable }) => ($clickable ? "#e6e8ec" : "#f2f4f7")};
  }
`;
