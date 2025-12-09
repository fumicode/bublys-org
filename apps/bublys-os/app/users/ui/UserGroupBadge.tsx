import { UserGroupIcon } from "./UserIcon";
import { IconBadge } from "./IconBadge";

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
    />
  );
};
