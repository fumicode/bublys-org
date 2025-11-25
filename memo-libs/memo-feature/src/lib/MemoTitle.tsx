import { useSelector } from 'react-redux';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';

import { selectMemo } from '@bublys-org/memo-state';

type MemoTitleProps = {
  memoId: string;
};

export function MemoTitle({ memoId }: MemoTitleProps) {
  const memo = useSelector(selectMemo(memoId));
  const firstLineId = memo.lines[0];
  const content = memo.blocks[firstLineId]?.content || '';
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
