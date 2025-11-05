"use client";

import { MemoList } from "./MemoList";

export default function Index() {

  return (
    <div style={{ padding: '16px'}}>
      <h1>メモ一覧</h1>
      <MemoList onSelectMemo={(id) => {
        location.href = `/memos/${id}`;
      }}/>
    </div>
  )

}
