import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TextField, Stack, Select, MenuItem, Button } from '@mui/material';

export interface Message {
  protocol: string;
  version: string;
  method: string;
  params: any;
  id: string;
  timestamp: number;
}

interface StartReferBlockDTO {
  blockURL: string;
  displayText: string;
}

interface RequestGetBlockDTO {
  blockURL: string;
  displayText: string;
}

interface EndReferBlockDTO {
  blockURL: string;
}

interface HandShakeDTO {
  key: string;
  value: { blockURL: string; displayText: string };
}

//自分のメソッドを相手に渡す
const handShakeMessage = () => {
  return {
    protocol: 'http://localhost:4201',
    version: '0.0.1',
    method: 'handShake',
    params: {
      methods: [
        {
          key: 'startReferBlock',
          value: { blockURL: 'string', displayText: 'string' },
        },
        {
          key: 'requestGetBlock',
          value: { blockURL: 'string', displayText: 'string' },
        },
        { key: 'endReferBlock', value: { blockURL: 'string' } },
      ],
    },
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

interface BlockData {
  URL: string;
  value: string;
}

export const MemoBody = () => {
  //textareaに実際に表示されている文字
  const [textareaValue, setTextareaValue] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [parentMethods, setParentMethods] = useState<HandShakeDTO[] | null>(
    null
  );
  const [selectedMethod, setSelectedMethod] = useState<HandShakeDTO | null>(
    null
  );
  const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);

  useEffect(() => {
    setSelectedBlock({
      URL: selectedBlock?.URL || '',
      value: textareaValue,
    });
  }, [textareaValue]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // React DevToolsを除外
      if (
        event.data?.source?.includes('react-devtools') ||
        event.data?.source?.includes('devtools')
      ) {
        return;
      }

      // 自分からのメッセージを除外
      if (event.source === window) {
        return;
      }

      try {
        const message = event.data as Message;
        console.log('Parsed message:', message);
        setReceivedMessages((prev) => [...prev, message]);
        if (event.data.method === 'handShake') {
          console.log(message.params.methods);
          const handShakeDTO = message.params
            .methods as unknown as HandShakeDTO[];
          setParentMethods(handShakeDTO);
        }
        if (event.data.method === 'startReferBlock') {
          const startReferBlockDTO =
            message.params as unknown as StartReferBlockDTO;
          if (startReferBlockDTO.blockURL === 'memo/text/line1') {
            // 関数形式で最新の値を取得
            setTextareaValue(startReferBlockDTO.displayText);
          }
        } else if (event.data.method === 'requestGetBlock') {
          const requestGetBlockDTO =
            message.params as unknown as RequestGetBlockDTO;
          if (requestGetBlockDTO.blockURL === 'memo/text/line1') {
            // 関数形式で最新の値を取得
            setTextareaValue(requestGetBlockDTO.displayText);
          }
        } else if (event.data.method === 'endReferBlock') {
          const endReferBlockDTO =
            message.params as unknown as EndReferBlockDTO;
          if (endReferBlockDTO.blockURL === 'memo/text/line1') {
            // 関数形式で最新の値を取得
            setTextareaValue('');
          }
        }
      } catch (error) {
        console.error('Error :サポートされていない形式です', error);
      }
    };
    window.addEventListener('message', handleMessage);
    sendMessageToIframeParent(handShakeMessage());
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const createMessage = (method: string, params: any) => {
    return {
      protocol: 'http://localhost:4201',
      version: '0.0.1',
      method: method,
      params: params,
      id: uuidv4(),
      timestamp: Date.now(),
    };
  };

  const sendMessageToIframeParent = (message: Message) => {
    if (window.parent === window) {
      console.log('Iframeの中に表示されていないため、メッセージを送信しません');
      return;
    }
    //オリジンはとりあえず今は何でもOK
    window.parent.postMessage(message, '*');
    console.log('Sending message to parent:', message);
  };

  // const autoResizeTextarea = (element: HTMLTextAreaElement) => {
  //   element.style.height = 'auto';
  //   element.style.height = element.scrollHeight + 'px';
  // };

  //参照情報も含んだ各行のデータ
  // const [memoData, setMemoData] = useState<MemoData[]>([]);
  // console.log(memoData);
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

  const saveMemoData = (input: string) => {
    setTextareaValue(input);
  };

  return (
    <div>
      <TextField
        value={textareaValue}
        onChange={(e) => {
          saveMemoData(e.target.value);
        }}
        sx={{ width: '100%' }}
      ></TextField>
      {/* <textarea
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
      /> */}
      <div>
        <h3>受信したメッセージ履歴</h3>
        {receivedMessages.length > 0 ? (
          receivedMessages.map((msg, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                margin: '10px 0',
                padding: '12px',
                backgroundColor: '#f9f9f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #eee',
                }}
              >
                <span>
                  <strong>method:</strong> {msg.method}
                </span>
                <span
                  style={{
                    color: '#555',
                    fontSize: '0.9em',
                  }}
                >
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(msg.params, null, 2)}
              </div>
            </div>
          ))
        ) : (
          <p>メッセージ履歴がありません</p>
        )}
      </div>

      <Stack direction="row" spacing={1} alignItems="center">
        <Select
          onChange={(e) =>
            setSelectedMethod(e.target.value as unknown as HandShakeDTO)
          }
        >
          <MenuItem value={''}>Unselected</MenuItem>
          {parentMethods?.map((e, index) => (
            <MenuItem key={index} value={e.key}>
              {e.key}
            </MenuItem>
          ))}
        </Select>
        <Select
          onChange={(e) =>
            setSelectedBlock(
              e.target.value === 'memo/text/line1'
                ? { URL: 'memo/text/line1', value: textareaValue }
                : null
            )
          }
        >
          <MenuItem value={''}>Unselected</MenuItem>
          <MenuItem value={'memo/text/line1'}>memo/text/line1</MenuItem>
        </Select>
        <Button
          variant="outlined"
          onClick={() => {
            if (selectedMethod && selectedBlock) {
              setSelectedBlock({
                URL: selectedBlock?.URL || '',
                value: textareaValue,
              });
              sendMessageToIframeParent(
                createMessage(selectedMethod.key, selectedBlock)
              );
            }
          }}
        >
          送信
        </Button>
      </Stack>
    </div>
  );
};

export default MemoBody;
