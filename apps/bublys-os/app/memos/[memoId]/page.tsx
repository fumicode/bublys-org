"use client";

import React, { use } from 'react';
import { selectMemo, updateMemo, useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { MemoEditor } from './MemoEditor';
import { MemoTitle } from './MemoTitle';

export default function Index({ params }: { params: Promise<{memoId: string}> }) {
  const unwrappedParams = use(params);
  const memoId = unwrappedParams.memoId;
  const memo = useAppSelector(selectMemo(memoId));
  const dispatch = useAppDispatch();

  if (!memo) {
    return null;
  }

  return (
    <div style={{ padding: '16px'}}>
      <div style={{ marginBottom: '16px'}}>
        <a href="/memos">← メモ一覧に戻る</a>
      </div>

      <MemoTitle memo={memo} />
      <MemoEditor 
        memo={memo} 
        onMemoChange={(newMemo) => {
          dispatch(updateMemo({ memo: newMemo.toJson() }));
        }}
      />
    </div>
  );
}
