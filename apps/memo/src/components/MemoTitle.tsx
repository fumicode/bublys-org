import React from 'react';
import { useSelector } from 'react-redux';
import { selectMemo } from '../store/memoSlice';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';

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
