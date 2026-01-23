import { UserIcon } from "./UserIcon.js";
import { IconBadge } from "./IconBadge.js";

type UserBadgeProps = {
  label: string;
  onClick?: () => void;
  linkTarget?: string;
};

export const UserBadge = ({ label, onClick, linkTarget }: UserBadgeProps) => {
  return (
    <IconBadge
      icon={<UserIcon fontSize="small" />}
      label={label}
      onClick={onClick}
      dataUrl={linkTarget}
      objectType="User"
    />
  );
};
