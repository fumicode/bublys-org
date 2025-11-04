import { RawMemo, selectMemo, useAppSelector } from "@bublys-org/state-management";
import { IconButton } from "@mui/material";
import { LuClipboardCopy } from "react-icons/lu";


export function MemoTitle({ memoId }: { memoId: string }) {
  const memo = useAppSelector(selectMemo(memoId)) as RawMemo;
  return (
    <div>
      <h2>
        「{memo.blocks[memo.lines?.[0]]?.content}」
        <IconButton onClick={() => navigator.clipboard.writeText(memo.blocks[memo.lines?.[0]]?.content || '')}>
          <LuClipboardCopy />
        </IconButton>
      </h2>
    </div>
  );
}