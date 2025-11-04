import { Memo, MemoBlock, RawMemo, selectMemo, updateMemo, useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { IconButton } from "@mui/material";
import { useRef } from "react";
import { LuClipboardCopy } from "react-icons/lu";
import styled from "styled-components";


export function MemoEditor({ memoId }: { memoId: string }) {
  const memo = useAppSelector(selectMemo(memoId)) as RawMemo;
  const dispatch = useAppDispatch();
  const contentRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  const handleKeyDown  = (e: React.KeyboardEvent<HTMLParagraphElement>, block: MemoBlock) => {
    // This function is now inlined below
    // Skip IME composition commit
    if ("isComposing" in e.nativeEvent && e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTimeout(() => {
        const idx = memo.lines.findIndex(id => id === block.id);
        if (idx < memo.lines.length - 1) {
          const nextId = memo.lines[idx + 1];
          const node = contentRefs.current[nextId];
          if (node) {
            node.focus();
            const range = document.createRange();
            range.selectNodeContents(node);
            range.collapse(true);
            const sel2 = window.getSelection();
            sel2?.removeAllRanges();
            sel2?.addRange(range);
          }
        }
      }, 0);
      return;
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setTimeout(() => {
        const idx = memo.lines.findIndex(id => id === block.id);
        if (idx > 0) {
          const prevId = memo.lines[idx - 1];
          const node = contentRefs.current[prevId];
          if (node) {
            node.focus();
            const range = document.createRange();
            range.selectNodeContents(node);
            range.collapse(false);
            const sel2 = window.getSelection();
            sel2?.removeAllRanges();
            sel2?.addRange(range);
          }
        }
      }, 0);
      return;
    }
    // Merge on backspace at start of block
    else if (e.key === 'Backspace') {


      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0 && sel.focusOffset === 0) {
        e.preventDefault();

        //はじめに、現在の行の内容を確定して保存する。
        const content = e.currentTarget.innerText;
        const updated = new Memo(memo).updateBlockContent(block.id, content);

        //そのうえで、前の行と結合する。
        const merged = updated.mergeBlock(block.id).toPlain();
        dispatch(updateMemo({ memo: merged }));

        //結合後に、カーソルを前の行の末尾に移動する
        setTimeout(() => {
          const idx = memo.lines.findIndex(id => id === block.id);
          if (idx > 0) {
            const prevId = memo.lines[idx - 1];
            const node = contentRefs.current[prevId];
            if (node) {
              node.focus();
              const range = document.createRange();
              range.selectNodeContents(node);
              range.collapse(false);
              const sel2 = window.getSelection();
              sel2?.removeAllRanges();
              sel2?.addRange(range);
            }
          }
        }, 0);
        return;
      }
    }
    // Insert new block on Enter
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newId = crypto.randomUUID();
      const updated = new Memo(memo).insertTextBlockAfter(block.id, { id: newId, type: "text", content: "" }).toPlain();
      dispatch(updateMemo({ memo: updated }));
      setTimeout(() => {
        contentRefs.current[newId]?.focus();
      }, 0);
    }

  }

  return (
    <StyledMemoDiv>
      {memo.lines.map((lineId) => {
        const block = memo.blocks[lineId];
        if (block.type === "text") {
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
                ref={el => { contentRefs.current[block.id] = el; }}
                onBlur={e => {
                  const content = e.currentTarget.innerText;
                  const updated = new Memo(memo).updateBlockContent(block.id, content).toPlain();
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
      >.e-block-id {
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