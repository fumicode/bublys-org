import React from "react";
import styled from "styled-components";
import { UrledPlace } from "../../bubble-ui/components";

type IconBadgeProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  dataUrl?: string;
  draggable?: boolean;
  dragType?: 'user' | 'users' | 'user-group' | 'user-groups' | 'memo' | 'memos' | 'generic';
};

export const IconBadge = ({ icon, label, onClick, dataUrl, draggable = true, dragType}: IconBadgeProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (!dataUrl) return;

    e.dataTransfer.effectAllowed = 'copy';

    // シンプルに bubble type と 2つのデータだけ
    if (dragType) {
      e.dataTransfer.setData(dragType, dataUrl);  // 例: "user" -> "users/123"
    }
    e.dataTransfer.setData('url', dataUrl);       // URL
    e.dataTransfer.setData('label', label);        // ラベル（表示名）
  };

  const badge = (
    <StyledBadge
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      $clickable={!!onClick}
      draggable={draggable && !!dataUrl}
      onDragStart={handleDragStart}
    >
      <span className="e-icon">{icon}</span>
      <span className="e-label">{label}</span>
    </StyledBadge>
  );

  if (dataUrl) {
    return <UrledPlace url={dataUrl}>{badge}</UrledPlace>;
  }

  return badge;
};

const StyledBadge = styled.span<{ $clickable: boolean }>`
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
