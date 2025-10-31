"use client";

import { selectMemo, useAppSelector } from '@bublys-org/state-management';

export default function Index({ params }: { params: { memoId: string } }) {
  //メモの一覧を表示
  const memoId = params.memoId;
  const memo = useAppSelector(selectMemo(memoId));

  return (
    <div>
      {memo.lines.map((lineId) => {
        const block = memo.blocks[lineId];
        if (block.type === "text") {
          return <p key={block.id} contentEditable>{block.content}</p>;
        }
        return null;
      })}
    </div>
  );
}