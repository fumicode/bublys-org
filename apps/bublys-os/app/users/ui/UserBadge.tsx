import { UserIcon } from "./UserIcon";
import { IconBadge } from "./IconBadge";
import { DRAG_DATA_TYPES } from "../../bubble-ui/utils/drag-types";

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
      dragType={DRAG_DATA_TYPES.user}
    />
  );
};
