import { UserIcon } from "./UserIcon.js";
import type { OpeningPosition } from "@bublys-org/bubbles-ui";
import { IconBadge } from "./IconBadge.js";

type UserBadgeProps = {
  label: string;
  linkTarget?: string;
  /** ダブルクリックで開くときの展開位置 */
  openingPosition?: OpeningPosition;
};

export const UserBadge = ({ label, linkTarget, openingPosition }: UserBadgeProps) => {
  return (
    <IconBadge
      icon={<UserIcon fontSize="small" />}
      label={label}
      dataUrl={linkTarget}
      openingPosition={openingPosition}
      objectType="User"
    />
  );
};
