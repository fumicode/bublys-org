import { useEffect, useState } from 'react';
import {
  MemoData,
  LineData,
  // InlineContent,
  stringToContents,
  // contentsToString,
  // insertReference,
} from './memoData.domain';
import { v4 as uuidv4 } from 'uuid';
// import { Message } from '../sendMessage.domain';

type ParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ParamValue[]
  | { [key: string]: ParamValue };

//MCPに習った書き方のメッセージjson形式
export interface Message {
  protocol: string;
  version: string;
  method: string;
  params: {
    [key: string]: ParamValue;
  };
  id: string;
  timestamp: number;
}

export interface refDTO {
  refUUID: string;
  displayText: string;
}

// interface MemoBodyProps {
//   updateRefData: (refs: refDTO[]) => void;
// }

export type methodType =
  | 'startReferById'
  | 'updateRefValueById'
  | 'endReferById';

export const MemoBody = () => {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  console.log(receivedMessages);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received in memo:', event.data);

      if (
        event.data.protocol === 'memo-bubly-protocol' &&
        event.data.version === '0.0.1'
      ) {
        if (event.data.method === 'POST') {
          try {
            const message = event.data as Message;
            console.log('Parsed message:', message);

            setReceivedMessages((prev) => [...prev, message]);
          } catch (error) {
            console.error('Error processing message:', error);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };
  //textareaに実際に表示されている文字
  const [textareaValue, setTextareaValue] = useState('');

  //参照情報も含んだ各行のデータ
  const [memoData, setMemoData] = useState<MemoData[]>([]);
  console.log(memoData);
  //参照情報だけのデータ
  // const [refs, setRefs] = useState<InlineContent[]>([]);

  //参照情報だけを抽出する
  // const ExtractionRef = (memoData: MemoData[]) => {
  //   const newRefsState: InlineContent[] = [];
  //   memoData.forEach((memo) => {
  //     memo.lineDatas.forEach((line) => {
  //       line.contents.forEach((content) => {
  //         if (content.type === 'ref') {
  //           newRefsState.push(content);
  //         }
  //       });
  //     });
  //   });
  //   setRefs(newRefsState);
  // };

  //stateが新しくなるたびにUUIDがすべて作り直されてしまう
  const saveMemoData = (input: string) => {
    const lineTexts = input.split('\n');
    console.log(lineTexts);
    setTextareaValue(lineTexts.join('\n'));

    const lineDatas: LineData[] = lineTexts.map((lineText) => {
      return {
        lineUUID: uuidv4(),
        contents: stringToContents(lineText),
      };
    });
    const newMemoData: MemoData[] = [{ lineDatas: lineDatas }];
    setMemoData(newMemoData);
  };

  return (
    <div>
      <textarea
        ref={(el) => {
          if (el) {
            autoResizeTextarea(el);
          }
        }}
        value={textareaValue}
        spellCheck={false}
        onChange={(e) => {
          saveMemoData(e.target.value);
          autoResizeTextarea(e.target);
        }}
        rows={3}
        placeholder="paramsを入力"
        style={{
          width: '100%',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          padding: '8.5px 14px',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          borderRadius: '4px',
          resize: 'none',
          minHeight: 'calc(3 * 1.5em + 17px)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

export default MemoBody;
