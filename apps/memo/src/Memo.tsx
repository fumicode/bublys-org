import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  TextField,
  Stack,
  Select,
  MenuItem,
  Button,
  Container,
} from '@mui/material';
import {
  Message,
  DTOParams,
  ExportDataMessage,
  HandShakeMessage,
  OSMethod,
} from './Messages.domain';

interface ReferBlockDTO {
  containerURL: string;
}

export enum StorableType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  TIME = 'time',
}

//自分の読めるメソッドを相手に渡す
const handShakeMessage = () => {
  return createMessage('handShake', {
    methods: [
      {
        key: 'exportData',
        value: { containerURL: 'string', value: 'string' },
      },
      {
        key: 'startRefer',
        value: { containerURL: 'string', displayText: 'string' },
      },
      { key: 'endRefer', value: { containerURL: 'string' } },
    ],
    resources: [
      {
        containerName: 'MemoLine1',
        containerUrl: 'http://localhost:4301/memo/text/block1',
        storableTypes: [StorableType.TEXT],
      },
    ],
  });
};

const createMessage = (method: string, params: any) => {
  return {
    protocol: 'http://localhost:4301/',
    version: '0.0.1',
    method: method,
    params: params,
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

type slotRefState = 'None' | 'ReferTo' | 'ReferFrom';

export const Memo = () => {
  //export可能なデータ
  const blockURLs = ['http://localhost:4301/memo/text/block1'];
  const [exportableData, setExportableData] = useState<DTOParams[]>([
    ...blockURLs.map((url) => ({ containerURL: url, value: '' })),
  ]);

  const [isReferBlock, setIsReferBlock] = useState<slotRefState>('None');
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [parentMethods, setParentMethods] = useState<OSMethod[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<OSMethod | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<DTOParams | null>(null);

  const checkAndSetHandShakeData = (message: HandShakeMessage) => {
    console.log('handShakeを受け取った', message);
    setParentMethods((prev) => {
      const currentMethods = prev || [];
      const newMethods = [...currentMethods];

      //すでにkeyとvalueが登録されている場合は更新しない
      message.params.methods.forEach((method) => {
        if (!newMethods.find((e) => e.key === method.key)) {
          newMethods.push({
            key: method.key,
            value: method.value,
          });
        }
      });
      return newMethods;
    });

    // OSからhandshakeを受け取ったら、自分のhandshakeを返す
    sendMessageToIframeParent(handShakeMessage());
  };

  const selectMethod = (method: string) => {
    const handShakeDTO = parentMethods?.find((e) => e.key === method);
    if (!handShakeDTO) {
      console.log('Method not found');
      return;
    }
    setSelectedMethod(handShakeDTO);
  };

  const checkAndSetExportData = (message: Message) => {
    console.log('📥 checkAndSetExportData called', message);
    console.log('Current blockURLs:', blockURLs);
    console.log('Message containerURL:', message.params.containerURL);
    console.log('Current exportableData:', exportableData);

    setExportableData((prev) => {
      const index = prev.findIndex(
        (e) => e.containerURL === message.params.containerURL
      );
      console.log('Found index:', index);
      if (index === -1) {
        console.log('❌ containerURL not found in exportableData');
        return prev;
      }
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        value: message.params.value,
      };
      console.log('✅ Updated exportableData:', newData);
      return newData;
    });
  };

  useEffect(() => {
    const blockValue =
      exportableData.find((e) => e.containerURL === blockURLs[0])?.value || '';
    setSelectedBlock((prev) => {
      // 値が変わっていない場合は更新しない
      if (prev?.value === blockValue) return prev;
      return {
        containerURL: prev?.containerURL || '',
        value: blockValue,
      };
    });
    if (isReferBlock === 'ReferFrom') {
      sendMessageToIframeParent(
        createMessage('exportData', {
          containerURL: blockURLs[0],
          value: blockValue,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportableData, isReferBlock]);

  function isExportDataMessage(msg: Message): msg is ExportDataMessage {
    return (
      (msg as ExportDataMessage).params !== undefined &&
      (msg as ExportDataMessage).method === 'exportData'
    );
  }

  function isHandShakeMessage(msg: Message): msg is HandShakeMessage {
    return (
      (msg as HandShakeMessage).params !== undefined &&
      (msg as HandShakeMessage).method === 'handShake'
    );
  }
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

      console.log(JSON.stringify(event.data));
      try {
        const message = event.data as Message;
        setReceivedMessages((prev) => [...prev, message]);
        if (isExportDataMessage(message)) {
          checkAndSetExportData(message);
        }
        if (isHandShakeMessage(message)) {
          checkAndSetHandShakeData(message);
        }
        if (event.data.method === 'startRefer') {
          const referBlockDTO = message.params as unknown as ReferBlockDTO;
          if (blockURLs.includes(referBlockDTO.containerURL)) {
            setIsReferBlock('ReferFrom');
          }
        } else if (event.data.method === 'endRefer') {
          const referBlockDTO = message.params as unknown as ReferBlockDTO;
          if (blockURLs.includes(referBlockDTO.containerURL)) {
            setIsReferBlock('None');
          }
        }
      } catch (error) {
        console.error('Error :サポートされていない形式です', error);
      }
    };
    window.addEventListener('message', handleMessage);

    // アプリの準備が完了したことを通知（handshakeはOSからのhandshakeを受け取った後に送る）
    console.log('📢 Memo app is ready, sending ready message');
    setTimeout(() => {
      sendMessageToIframeParent(createMessage('ready', {}));
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const sendMessageToIframeParent = (message: Message) => {
    if (window.parent === window) {
      console.log('Iframeの中に表示されていないため、メッセージを送信しません');
      return;
    }
    //オリジンはとりあえず今は何でもOK
    window.parent.postMessage(message, '*');
    console.log('Sending message to parent:', message);
  };

  return (
    <div>
      <TextField
        value={
          exportableData.find((e) => e.containerURL === blockURLs[0])?.value ||
          ''
        }
        onChange={(e) => {
          setExportableData((prev) => {
            const index = prev.findIndex(
              (d) => d.containerURL === blockURLs[0]
            );
            if (index === -1) return prev;
            const newData = [...prev];
            newData[index] = { ...newData[index], value: e.target.value };
            return newData;
          });
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              border:
                isReferBlock === 'ReferTo'
                  ? '1px solid blue'
                  : isReferBlock === 'ReferFrom'
                  ? '1px solid red'
                  : '1px solid black',
            },
            '&:hover fieldset': {
              border:
                isReferBlock === 'ReferTo'
                  ? '2px solid blue'
                  : isReferBlock === 'ReferFrom'
                  ? '2px solid red'
                  : '2px solid black',
            },
            '&.Mui-focused fieldset': {
              border:
                isReferBlock === 'ReferTo'
                  ? '2px solid blue'
                  : isReferBlock === 'ReferFrom'
                  ? '2px solid red'
                  : '2px solid black',
            },
          },
        }}
      ></TextField>
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
                {JSON.stringify(msg, null, 2)}
              </div>
            </div>
          ))
        ) : (
          <p>メッセージ履歴がありません</p>
        )}
      </div>

      <Stack direction="row" spacing={1} alignItems="center">
        <Select onChange={(e) => selectMethod(e.target.value as string)}>
          <MenuItem value={''}>Unselected</MenuItem>
          {parentMethods?.map((pMethod, index) => (
            <MenuItem key={index} value={pMethod.key}>
              {pMethod.key}
            </MenuItem>
          ))}
        </Select>
        <Select
          onChange={(e) =>
            setSelectedBlock({
              containerURL: e.target.value as string,
              value:
                exportableData.find(
                  (data) => data.containerURL === e.target.value
                )?.value || '',
            })
          }
        >
          <MenuItem value={''}>Unselected</MenuItem>
          {exportableData?.map((data, index) => (
            <MenuItem key={index} value={data.containerURL}>
              {data.containerURL}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="outlined"
          onClick={() => {
            if (selectedMethod && selectedBlock) {
              const latestValue = exportableData.find(
                (data) => data.containerURL === selectedBlock.containerURL
              );
              if (latestValue) {
                sendMessageToIframeParent(
                  createMessage(selectedMethod.key, latestValue)
                );
              }
            }
          }}
        >
          送信
        </Button>
      </Stack>
    </div>
  );
};

export default Memo;
