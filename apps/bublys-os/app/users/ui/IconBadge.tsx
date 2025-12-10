import React from "react";
import styled from "styled-components";
import { UrledPlace } from "../../bubble-ui/components";
import { DragDataType, useDragPayload } from "../../bubble-ui/utils/drag-types";

type IconBadgeProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  dataUrl?: string;
  draggable?: boolean;
  dragType?: DragDataType;
};

export const IconBadge = ({ icon, label, onClick, dataUrl, draggable = true, dragType}: IconBadgeProps) => {
  const dragPayload = dragType && dataUrl ? { type: dragType, url: dataUrl, label } : null;
  const { draggable: canDrag, onDragStart } = useDragPayload(dragPayload);

  const badge = (
    <StyledBadge
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      $clickable={!!onClick}
      draggable={draggable && !!dataUrl && canDrag}
      onDragStart={onDragStart}
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
