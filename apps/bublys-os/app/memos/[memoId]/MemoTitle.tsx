import { Memo } from "@bublys-org/state-management";
import { IconButton } from "@mui/material";
import { LuClipboardCopy } from "react-icons/lu";

interface MemoTitleProps {
  memo: Memo;
}

export function MemoTitle({ memo }: MemoTitleProps) {
  const firstBlockId = memo.lines[0];
  const firstBlock = firstBlockId ? memo.blocks[firstBlockId] : null;
  const content = firstBlock?.content || '';
  
  return (
    <div>
      <h2>
        「{content}」
        <IconButton onClick={() => navigator.clipboard.writeText(content)}>
          <LuClipboardCopy />
        </IconButton>
      </h2>
    </div>
  );
}