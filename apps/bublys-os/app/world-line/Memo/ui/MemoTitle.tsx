import { Memo } from '../domain/Memo';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';
import { MemoIcon } from './MemoIcon';

interface MemoTitleProps {
  memo: Memo;
}

export function MemoTitle({ memo }: MemoTitleProps) {
  const firstBlockId = memo.lines[0];
  const firstBlock = firstBlockId ? memo.blocks[firstBlockId] : null;
  const content = firstBlock?.content || '';
  
  return (
    <div>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MemoIcon fontSize="medium" />
        <span>「{content}」</span>
        <IconButton onClick={() => navigator.clipboard.writeText(content)}>
          <LuClipboardCopy />
        </IconButton>
      </h2>
    </div>
  );
}
