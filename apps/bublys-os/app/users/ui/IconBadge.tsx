import React from "react";
import styled from "styled-components";

type IconBadgeProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  dataLinkTarget?: string;
};

export const IconBadge = ({ icon, label, onClick, dataLinkTarget }: IconBadgeProps) => {
  return (
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
      data-link-target={dataLinkTarget}
    >
      <span className="e-icon">{icon}</span>
      <span className="e-label">{label}</span>
    </StyledBadge>
  );
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
