import { UserGroupIcon } from "./UserIcon.js";
import type { OpeningPosition } from "@bublys-org/bubbles-ui";
import { IconBadge } from "./IconBadge.js";

type UserGroupBadgeProps = {
  label: string;
  linkTarget?: string;
  /** ダブルクリックで開くときの展開位置 */
  openingPosition?: OpeningPosition;
};

export const UserGroupBadge = ({ label, linkTarget, openingPosition }: UserGroupBadgeProps) => {
  return (
    <IconBadge
      icon={<UserGroupIcon fontSize="small" />}
      label={label}
      dataUrl={linkTarget}
      openingPosition={openingPosition}
      objectType="UserGroup"
    />
  );
};
