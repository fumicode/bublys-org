import { FC } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectMemoAtApex } from "./memoSelectors";
import { dispatchDeleteMemo } from "./memoActions";

type MemoDeleteConfirmProps = {
  memoId: string;
  onCancel: () => void;
  onDeleted?: () => void;
};

export const MemoDeleteConfirm: FC<MemoDeleteConfirmProps> = ({ memoId, onCancel, onDeleted }) => {
  const dispatch = useAppDispatch();
  const memo = useAppSelector(selectMemoAtApex(memoId));

  const handleDelete = () => {
    dispatchDeleteMemo(dispatch, memoId);
    onDeleted?.();
  };

  // メモの最初の行を取得
  const memoTitle = memo?.blocks[memo.lines?.[0]]?.content ?? "メモ";

  return (
    <Stack spacing={2}>
      <Typography variant="h6">本当に削除しますか？</Typography>
      <Typography variant="body2" color="text.secondary">
        {memo ? `「${memoTitle}...」` : "対象のメモが見つかりません"}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="text" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={!memo}>
          削除する
        </Button>
      </Stack>
    </Stack>
  );
};
