"use client";

import { addMemo, deleteMemo, Memo, selectMemos, useAppDispatch, useAppSelector } from '@bublys-org/state-management';

const createMemo = ():Memo => {
  const memoId = crypto.randomUUID();
  const firstLineId = crypto.randomUUID();
  return { 
    id: memoId, 
    blocks: {
      [firstLineId]: { 
        id: firstLineId,
        type: "text", content: "新しいメモの内容です。" 
      }
    },
    lines: [firstLineId]
  };
}


export default function Index() {
  //メモの一覧を表示
  const memos = useAppSelector(selectMemos);

  const dispatch = useAppDispatch();

  return (
    <div>
      <ul>
        {Object.entries(memos).map(([id, memo]) => (
          <li key={id}>
            <a href={`/memos/${id}`}>#{id}</a>
            「{memo.blocks[memo.lines?.[0]]?.content}...」

            <button onClick={(e)=> {
              e.preventDefault();
              navigator.clipboard.writeText(id);
            }}>[IDをコピー]</button>
            <button onClick={(e)=> {
              e.preventDefault();
              dispatch(deleteMemo(id));
            }}>[削除]</button>
          </li>
        ))}
      </ul>

      <div>
        <button onClick={(e)=> {
          e.preventDefault();
          dispatch(addMemo({memo:createMemo()} ));

        }}>メモを追加</button> 
      </div>
    </div>
  );
}