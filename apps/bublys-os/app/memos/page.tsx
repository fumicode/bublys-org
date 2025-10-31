"use client";

import { addMemo, Memo, selectMemos, useAppDispatch, useAppSelector } from '@bublys-org/state-management';


export default function Index() {
  //メモの一覧を表示
  const memos = useAppSelector(selectMemos);

  const dispatch = useAppDispatch();

  return (
    <div>
      <ul>
        {Object.entries(memos).map(([id, memo]) => (
          <li key={id}>
            <a href={`/memos/${id}`}>メモID: {id}</a>
            {memo.blocks[memo.lines?.[0]]?.content}
          </li>
        ))}
      </ul>

      <div>
        <button onClick={(e)=> {
          e.preventDefault();
          dispatch(addMemo({ id: crypto.randomUUID(), memo: { blocks: {}, lines: [] } }));

        }}>メモを追加</button> 
      </div>
    </div>
  );
}