"use client";

import { selectMemo, useAppSelector, useAppDispatch, updateMemo } from '@bublys-org/state-management';
import { Memo } from '@bublys-org/state-management';
import type { RawMemo } from '@bublys-org/state-management';
import React, { useRef } from 'react';
import styled from 'styled-components';

export default function Index({ params }: { params: { memoId: string } }) {
  const memoId = params.memoId;
  const memo = useAppSelector(selectMemo(memoId)) as RawMemo;
  const dispatch = useAppDispatch();
  const contentRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  return (
    <StyledMemoDiv>
      {memo.lines.map((lineId) => {
        const block = memo.blocks[lineId];
        if (block.type === "text") {
          return (
            <div key={block.id} className="e-block">
              <div className="e-block-id">#{block.id.slice(0, 8)}</div>
              <p
                className="e-block-content"
                contentEditable
                ref={el => { contentRefs.current[block.id] = el; }}
                onBlur={e => {
                  const content = e.currentTarget.innerText;
                  const updated = new Memo(memo).updateBlockContent(block.id, content).toPlain();
                  dispatch(updateMemo({ memo: updated }));
                }}
                onKeyDown={e => {
                  // Skip IME composition commit Enter
                  if ((e.nativeEvent as any).isComposing) return;
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const newId = crypto.randomUUID();
                    const updated = new Memo(memo).insertTextBlockAfter(block.id, { id: newId, type: "text", content: "" }).toPlain();
                    dispatch(updateMemo({ memo: updated }));
                    setTimeout(() => {
                      contentRefs.current[newId]?.focus();
                    }, 0);
                  }
                }}
              >
                {block.content}
              </p>
            </div>
          );
        }
        return null;
      })}
    </StyledMemoDiv>
  );
}

const StyledMemoDiv = styled.div`
  border: 1px solid #ccc;
  padding: 16px;
  border-radius: 8px;
  background-color: #f9f9f9;

  > .e-block {
    margin-bottom: 12px;
    padding: 8px;
    display: flex;
    flex-direction: row;

    > .e-block-id {
      font-size: 12px;
    }

    > .e-block-content {
      flex: 1;
      margin: 0;
      min-height: 20px;
    }
  }
`;
