import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  InlineContent,
  LineData,
  MemoData,
  insertReference,
} from './memoData.domain';

export default function MemoEditor() {
  const [editorValue, setEditorValue] = useState<MemoData>({
    lineDatas: [
      {
        //初期値は空文字1行
        lineUUID: uuidv4(),
        contents: [{ type: 'text', text: '' }],
      },
    ],
  });

  //MemoData を保持（再レンダーなし）
  const memoData = useRef<MemoData>(editorValue);
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  // state が更新されたら ref も同期
  useEffect(() => {
    memoData.current = editorValue;
  }, [editorValue]);

  //MemoDataをjson表示する用
  const [jsonViewerValue, setJsonViewerValue] = useState<MemoData>(editorValue);

  const updateJsonViewerValue = () => {
    if (!editorRef.current) return;
    const newMemoData = createMemoDataFromDOM() || memoData.current;
    setJsonViewerValue(newMemoData);
  };

  // DOMからMemoDataを作成
  const createMemoDataFromDOM = () => {
    if (!editorRef.current) return;
    const newLineDatas: LineData[] = [];

    // ブロック要素とみなすタグ（この一覧は必要に応じて拡張）
    const BLOCK_TAGS = new Set(['DIV', 'P', 'LI']);

    // contents を currentContents に集めて、行が確定したら pushLine() する
    const pushLine = (currentContents: InlineContent[]) => {
      if (currentContents.length === 0) {
        // 空行を明示的に残す（高さ確保したければ text を '\u00A0' にするオプションも可）
        newLineDatas.push({
          lineUUID: uuidv4(),
          contents: [{ type: 'text', text: '' }],
        });
      } else {
        newLineDatas.push({ lineUUID: uuidv4(), contents: currentContents });
      }
    };

    // ノード群を辿りながら contents を currentContents に追加していく
    const collectContentsInto = (
      node: Node,
      currentContents: InlineContent[]
    ) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.textContent ?? '';
        // 意味のあるテキストだけを扱う。空白も残したければ trim を外す
        const text = raw; // そのまま保持したいなら raw、空白のみ無視したければ raw.trim()
        if (text.length > 0) {
          const last = currentContents[currentContents.length - 1];
          if (last && last.type === 'text') last.text += text;
          else currentContents.push({ type: 'text', text });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName;

        // 参照要素（data-ref-id がある）
        if (el.dataset?.refId) {
          currentContents.push({
            type: 'ref',
            refUUID: el.dataset.refId,
            displayText: el.textContent ?? '',
          });
          return;
        }

        // <br> は行区切り
        if (tag === 'BR') {
          // 現在の行を確定して新しい行を開始
          pushLine([...currentContents]); // push a copy
          currentContents.length = 0; // clear
          return;
        }

        // ブロック要素は「この要素内を処理 → 行を確定して次へ」
        if (BLOCK_TAGS.has(tag)) {
          // ブロック要素の中身を新しいラインとして扱いたい場合：
          // まずその中を集めて、終了後に行として push する
          const innerContents: InlineContent[] = [];
          el.childNodes.forEach((n) => collectContentsInto(n, innerContents));
          pushLine(innerContents);
          return;
        }

        // 書式タグ（span, b, i, em 等）は中を再帰的に処理（行の分割は起こさない）
        if (['SPAN', 'B', 'I', 'STRONG', 'EM', 'U', 'A'].includes(tag)) {
          el.childNodes.forEach((n) => collectContentsInto(n, currentContents));
          return;
        }

        // その他はテキストコンテンツをまとめて追加
        const text = el.textContent ?? '';
        if (text.length > 0) {
          const last = currentContents[currentContents.length - 1];
          if (last && last.type === 'text') last.text += text;
          else currentContents.push({ type: 'text', text });
        }
      }
    };

    // editorRef.current の childNodes を先に逐次走査し、
    // BR がトップレベルにある場合やテキストノードが直接ある場合にも対処する
    const rootChildren = Array.from(editorRef.current.childNodes);

    // currentContents: 今作っている行の contents
    let currentContents: InlineContent[] = [];

    rootChildren.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName;

        // トップレベルのブロック要素（div, p 等）はそのまま1行分として扱う
        if (BLOCK_TAGS.has(tag)) {
          // もし currentContents に何か残っていれば先に確定しておく
          if (currentContents.length > 0) {
            pushLine(currentContents);
            currentContents = [];
          }

          // ここでブロック要素自体を1行として処理（中で <br> があれば対応）
          const innerContents: InlineContent[] = [];
          el.childNodes.forEach((n) => collectContentsInto(n, innerContents));
          pushLine(innerContents);
        }
        // <br> がトップレベルにある場合は行区切り
        else if (tag === 'BR') {
          pushLine(currentContents);
          currentContents = [];
        } else {
          // inline 要素がトップレベルにいる場合（span 等） → currentContents に追加
          collectContentsInto(node, currentContents);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.textContent ?? '';
        // トップレベルのテキストノードは改行や空白だけだと無視する。必要なら trim の扱いを変える
        if (raw.length > 0) {
          const last = currentContents[currentContents.length - 1];
          if (last && last.type === 'text') last.text += raw;
          else currentContents.push({ type: 'text', text: raw });
        }
      }
    });

    // 最後に残った currentContents を確定
    if (currentContents.length > 0) {
      pushLine(currentContents);
    }

    // 最後に全く行が無ければ空行を一つ作る
    if (newLineDatas.length === 0) {
      newLineDatas.push({
        lineUUID: uuidv4(),
        contents: [{ type: 'text', text: '' }],
      });
    }

    return { lineDatas: newLineDatas } as MemoData;
  };

  // memoDataを更新
  const updateMemoDataFromDOM = () => {
    const newMemoData = createMemoDataFromDOM();
    memoData.current = newMemoData || memoData.current;
  };

  // MemoDataからHTMLを生成
  const renderLine = (memo: MemoData) => {
    return (
      <>
        {memo.lineDatas.map((line) => (
          <div
            key={line.lineUUID}
            data-line-id={line.lineUUID}
            style={{ minHeight: '1.5em' }}
          >
            {line.contents.map((content, idx) => {
              if (content.type === 'text') {
                if (content.text === '') {
                  return <br key={idx} />;
                }
                return (
                  <span key={idx} data-content-type="text">
                    {content.text}
                  </span>
                );
              } else {
                return (
                  <span
                    key={idx}
                    data-content-type="ref"
                    data-ref-id={content.refUUID}
                    contentEditable="false"
                    style={{
                      backgroundColor: '#e3f2fd',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      display: 'inline-block',
                      margin: '0 1px',
                    }}
                  >
                    {content.displayText}
                  </span>
                );
              }
            })}
          </div>
        ))}
      </>
    );
  };

  // 選択変更を監視して MemoData の ref を更新
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !editorRef.current) return;

      if (selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      // 選択範囲がエディタ内にあるか確認
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;

      // 選択範囲が存在する場合のみ MemoData を更新
      if (!selection.isCollapsed) {
        console.log('選択範囲あり - MemoData の ref を更新');
        updateMemoDataFromDOM();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // 入力ハンドラ（何もしない - ブラウザに任せる）
  const handleInput = () => {
    // 通常の入力では何もしない
  };

  // IME対応
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // Enterキーで新しい行を作成
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // 新しい行要素を作成
      const newLine = document.createElement('div');
      newLine.dataset.lineId = uuidv4();
      const br = document.createElement('br');
      newLine.appendChild(br);

      // カーソル位置に挿入
      range.deleteContents();
      range.insertNode(newLine);

      // カーソルを新しい行に移動
      range.setStart(newLine, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // 参照を追加する関数（ここだけ state を更新して再レンダー）
  const addSampleReference = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('テキストを選択してください');
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      alert('テキストを選択してください');
      return;
    }

    // 1. 選択範囲の行を特定
    let lineElement = range.startContainer.parentElement;
    while (lineElement && !lineElement.dataset.lineId) {
      lineElement = lineElement.parentElement;
    }

    if (!lineElement) {
      alert('行が見つかりません');
      return;
    }

    const lineUUID = lineElement.dataset.lineId;

    // 2. 選択範囲のオフセットを計算
    const preRange = range.cloneRange();
    preRange.selectNodeContents(lineElement);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + range.toString().length;

    console.log('選択情報:', { lineUUID, startOffset, endOffset });

    // 3. ref から最新の MemoData を取得
    const currentData = memoData.current;
    const lineIndex = currentData.lineDatas.findIndex(
      (l) => l.lineUUID === lineUUID
    );

    if (lineIndex === -1) {
      alert('行が見つかりません');
      console.log(
        '利用可能なlineUUIDs:',
        currentData.lineDatas.map((l) => l.lineUUID)
      );
      return;
    }

    console.log('対象行のcontents:', currentData.lineDatas[lineIndex].contents);

    // 4. 参照を挿入
    const newContents = insertReference(
      currentData.lineDatas[lineIndex].contents,
      startOffset,
      endOffset,
      uuidv4()
    );

    console.log('参照挿入後のcontents:', newContents);

    const newLineDatas = [...currentData.lineDatas];
    newLineDatas[lineIndex] = {
      ...newLineDatas[lineIndex],
      contents: newContents,
    };

    const newMemoData = { lineDatas: newLineDatas };

    // 5. state を更新 → 再レンダー（参照が画面に表示される）
    console.log('state を更新 - 再レンダー発生:', newMemoData);
    setEditorValue(newMemoData);
    // ref も同期（useEffect で自動的に更新される）
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Memo Editor (ref管理 + 選択時更新)</h2>

      <button
        onClick={addSampleReference}
        style={{
          marginBottom: '10px',
          padding: '8px 16px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        選択範囲を参照に変換
      </button>

      <button
        onClick={updateJsonViewerValue}
        style={{
          marginLeft: '10px',
          marginBottom: '10px',
          padding: '8px 16px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        MemoDataを更新
      </button>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '12px',
          minHeight: '200px',
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: 'monospace',
          outline: 'none',
        }}
      >
        {renderLine(editorValue)}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>MemoData (参照追加時のみ更新)</h3>
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '600px',
          }}
        >
          {JSON.stringify(jsonViewerValue, null, 2)}
        </pre>
      </div>
    </div>
  );
}
