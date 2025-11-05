import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectMemo, updateMemo } from '../store/memoSlice';
import { Memo, MemoBlock } from '../store/Memo';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';
import styled from 'styled-components';

type MemoEditorProps = {
  memoId: string;
};

export function MemoEditor({ memoId }: MemoEditorProps) {
  const memo = useSelector(selectMemo(memoId));
  const dispatch = useDispatch();
  const contentRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  const focusBlock = (id: string, collapseToStart: boolean) => {
    setTimeout(() => {
      const node = contentRefs.current[id];
      if (node) {
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(collapseToStart);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLParagraphElement>,
    block: MemoBlock
  ) => {
    if ('isComposing' in e.nativeEvent && e.nativeEvent.isComposing) return;

    let newMemo = memo;
    let focusId: string | undefined;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusId = memo.getNextBlockId(block.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusId = memo.getPrevBlockId(block.id);
    } else if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0 && sel.focusOffset === 0) {
        e.preventDefault();
        const content = e.currentTarget.innerText;
        newMemo = memo
          .updateBlockContent(block.id, content)
          .mergeWithPrevious(block.id);
        focusId = memo.getPrevBlockId(block.id);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const { memo: updatedMemo, newBlockId } = memo.insertTextBlockAfter(
        block.id,
        'text',
        ''
      );
      newMemo = updatedMemo;
      focusId = newBlockId;
    }

    if (newMemo !== memo) {
      dispatch(updateMemo({ memo: newMemo.toJson() }));
    }
    if (focusId) {
      const collapseToStart = e.key === 'ArrowDown' || e.key === 'Enter';
      focusBlock(focusId, collapseToStart);
    }
  };

  return (
    <StyledMemoDiv>
      {memo.lines.map((lineId) => {
        const block = memo.blocks[lineId];
        if (block.type === 'text') {
          return (
            <div key={block.id} className="e-block">
              <div className="e-block-id">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(block.id);
                  }}
                >
                  <LuClipboardCopy />
                </IconButton>
              </div>
              <p
                className="e-block-content"
                contentEditable
                suppressContentEditableWarning
                ref={(el) => {
                  contentRefs.current[block.id] = el;
                }}
                onBlur={(e) => {
                  const content = e.currentTarget.innerText;
                  const updated = memo
                    .updateBlockContent(block.id, content)
                    .toJson();
                  dispatch(updateMemo({ memo: updated }));
                }}
                onKeyDown={(e) => handleKeyDown(e, block)}
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

  display: grid;
  grid-template-columns: 2em 1fr;

  > .e-block {
    display: contents;

    &:hover {
      > .e-block-id {
        opacity: 1;
      }
    }
    > .e-block-id {
      font-size: 12px;
      width: 1em;
      opacity: 0;
    }

    > .e-block-content {
      margin: 0;
      min-height: 20px;
      &:focus {
        outline: none;
      }
    }
  }
`;
