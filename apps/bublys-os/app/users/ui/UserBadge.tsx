import { UserIcon } from "./UserIcon";
import { IconBadge } from "./IconBadge";

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
