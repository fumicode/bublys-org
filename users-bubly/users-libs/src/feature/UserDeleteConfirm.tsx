import { FC } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectUserById, deleteUser } from "../slice/index.js";
import { User } from "../domain/User.domain.js";

type UserDeleteConfirmProps = {
  userId: string;
  onCancel: () => void;
  onDeleted?: () => void;
};

export const UserDeleteConfirm: FC<UserDeleteConfirmProps> = ({ userId, onCancel, onDeleted }) => {
  const dispatch = useAppDispatch();
  const userEntity = useAppSelector(selectUserById(userId));
  const user = userEntity ? new User(userEntity.id, userEntity.name, userEntity.birthday) : undefined;

  const handleDelete = () => {
    dispatch(deleteUser(userId));
    onDeleted?.();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">本当に削除しますか？</Typography>
      <Typography variant="body2" color="text.secondary">
        {user ? `${user.name} / ${user.birthday}` : "対象のユーザーが見つかりません"}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="text" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={!user}>
          削除する
        </Button>
      </Stack>
    </Stack>
  );
};
