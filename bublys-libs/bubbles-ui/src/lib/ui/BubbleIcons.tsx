import { FC } from "react";

type IconProps = { size?: number };

export const CloseIcon: FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ToggleSizeIcon: FC<IconProps & { isMaximized: boolean }> = ({ size = 18, isMaximized }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {isMaximized ? (
      <>
        <path d="M8 8L10 10M16 16L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 8L14 10M8 16L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    )}
  </svg>
);

export const LayerUpIcon: FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 14L12 9L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LayerDownIcon: FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 10L12 15L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
