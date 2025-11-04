"use client";

import React, { use } from 'react';
import { MemoEditor } from './MemoEditor';
import { MemoTitle } from './MemoTitle';

export default function Index({ params }: { params: Promise<{memoId: string}> }) {
  const unwrappedParams = use(params);
  const memoId = unwrappedParams.memoId;

  return (
    <div style={{ padding: '16px'}}>
      <div style={{ marginBottom: '16px'}}>
        <a href="/memos">← メモ一覧に戻る</a>
      </div>

      <MemoTitle memoId={memoId} />
      <MemoEditor memoId={memoId} />
    </div>
  );
}
