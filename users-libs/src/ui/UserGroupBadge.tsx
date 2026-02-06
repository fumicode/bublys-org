import { UserGroupIcon } from "./UserIcon.js";
import { IconBadge } from "./IconBadge.js";

type UserGroupBadgeProps = {
  label: string;
  onClick?: () => void;
  linkTarget?: string;
};

export const UserGroupBadge = ({ label, onClick, linkTarget }: UserGroupBadgeProps) => {
  return (
    <IconBadge
      icon={<UserGroupIcon fontSize="small" />}
      label={label}
      onClick={onClick}
      dataUrl={linkTarget}
      objectType="UserGroup"
    />
  );
};
