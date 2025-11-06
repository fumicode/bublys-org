'use client';
import { useEffect, useState } from 'react';
import { TextField, Stack, Select, MenuItem, Button } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  DTOParams,
  ExportDataMessage,
  OnChangeValueMessage,
  HandShakeMessage,
  OSMethod,
} from './Messages.domain';

type slotRefState = 'None' | 'ReferTo' | 'ReferFrom';

interface ReferSlotDTO {
  containerURL: string;
}

const createMessage = (method: string, params: any) => {
  return {
    protocol: 'http://localhost:4200/',
    version: '0.0.1',
    method: method,
    params: params,
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

export enum StorableType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  TIME = 'time',
}

//自分のメソッドを相手に渡す
const handShakeMessage = () => {
  return createMessage('handShake', {
    methods: [
      { key: 'exportData', value: { containerURL: 'string', value: 'string' } },
      {
        key: 'startRefer',
        value: { containerURL: 'string' },
      },
      {
        key: 'requestGetData',
        value: { containerURL: 'string' },
      },
      { key: 'endRefer', value: { containerURL: 'string' } },
    ],
    resources: [
      {
        containerName: 'Slot1',
        containerUrl: 'http://localhost:4200/calculator/slot1',
        storableTypes: [StorableType.NUMBER],
      },
      {
        containerName: 'Slot2',
        containerUrl: 'http://localhost:4200/calculator/slot2',
        storableTypes: [StorableType.NUMBER],
      },
    ],
  });
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

export default function EmbeddedPage() {
  const slotURLs = [
    'http://localhost:4200/calculator/slot1',
    'http://localhost:4200/calculator/slot2',
    'http://localhost:4200/calculator/result',
  ];

  const [parentMethods, setParentMethods] = useState<OSMethod[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<OSMethod | null>(null);
  const selectMethod = (method: string) => {
    const handShakeDTO = parentMethods?.find((e) => e.key === method);
    if (!handShakeDTO) {
      console.log('Method not found');
      return;
    }
    setSelectedMethod(handShakeDTO);
  };
  const [selectedSlot, setSelectedSlot] = useState<DTOParams | null>(null);
  const [exportableData, setExportableData] = useState<DTOParams[]>([
    ...slotURLs.map((url) => ({ containerURL: url, value: '' })),
  ]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

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

  const checkAndSetExportData = (message: Message) => {
    console.log('📥 checkAndSetExportData called', message);
    console.log('Current slotURLs:', slotURLs);
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

  const handleSetSlotValue = (value: string, slotURL: string) => {
    setExportableData((prev) => {
      const index = prev.findIndex((e) => e.containerURL === slotURL);
      if (index === -1) return prev;
      const newData = [...prev];
      newData[index] = { ...newData[index], value: value };
      return newData;
    });
    if (isReferSlot1 === 'ReferFrom') {
      sendMessageToIframeParent(
        createMessage('exportData', {
          containerURL: slotURL,
          value: value,
        })
      );
    }
  };

  const [isReferSlot1, setIsReferSlot1] = useState<slotRefState>('None');
  const [isReferSlot2, setIsReferSlot2] = useState<slotRefState>('None');
  const [isReferResult, setIsReferResult] = useState<slotRefState>('None');

  useEffect(() => {
    const slot1Value = exportableData.find(
      (e) => e.containerURL === slotURLs[0]
    )?.value;
    const slot2Value = exportableData.find(
      (e) => e.containerURL === slotURLs[1]
    )?.value;
    const calcResult = Number(slot1Value) + Number(slot2Value);
    const currentResult = exportableData.find(
      (e) => e.containerURL === slotURLs[2]
    )?.value;

    // 計算結果が変わった場合のみ更新
    if (currentResult !== calcResult.toString()) {
      setExportableData((prev) => {
        const index = prev.findIndex((e) => e.containerURL === slotURLs[2]);
        if (index === -1) return prev;
        const newData = [...prev];
        newData[index] = { ...newData[index], value: calcResult.toString() };
        return newData;
      });
      if (selectedSlot && selectedSlot.containerURL === slotURLs[2]) {
        setSelectedSlot({
          containerURL: selectedSlot.containerURL,
          value: calcResult.toString(),
        });
      }
      if (isReferResult === 'ReferFrom') {
        sendMessageToIframeParent(
          createMessage('exportData', {
            containerURL: slotURLs[2],
            value: calcResult.toString(),
          })
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportableData, isReferResult]);

  function isExportDataMessage(msg: Message): msg is ExportDataMessage {
    return (
      (msg as ExportDataMessage).params.containerURL !== undefined &&
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

      try {
        const message = event.data as Message;
        console.log('Parsed message:', message);
        setReceivedMessages((prev) => [...prev, message]);
        if (isExportDataMessage(message)) {
          checkAndSetExportData(message);
        } else if (isHandShakeMessage(message)) {
          checkAndSetHandShakeData(message);
        } else if (event.data.method === 'startRefer') {
          const referSlotDTO = message.params as unknown as ReferSlotDTO;
          if (referSlotDTO.containerURL === slotURLs[0]) {
            setIsReferSlot1('ReferFrom');
          }
          if (referSlotDTO.containerURL === slotURLs[1]) {
            setIsReferSlot2('ReferFrom');
          }
          if (referSlotDTO.containerURL === slotURLs[2]) {
            setIsReferResult('ReferFrom');
          }
        } else if (event.data.method === 'endRefer') {
          const referSlotDTO = message.params as unknown as ReferSlotDTO;
          if (referSlotDTO.containerURL === slotURLs[0]) {
            setIsReferSlot1('None');
          }
          if (referSlotDTO.containerURL === slotURLs[1]) {
            setIsReferSlot2('None');
          }
          if (referSlotDTO.containerURL === slotURLs[2]) {
            setIsReferResult('None');
          }
        }
      } catch (error) {
        console.error('Error :サポートされていない形式です', error);
      }
    };
    window.addEventListener('message', handleMessage);

    // アプリの準備が完了したことを通知（handshakeはOSからのhandshakeを受け取った後に送る）
    console.log('📢 Calculator app is ready, sending ready message');
    setTimeout(() => {
      sendMessageToIframeParent(createMessage('ready', {}));
    }, 100);

    return () => {
      console.log('🧹 Calculator useEffect cleanup - Component unmounting!');
      window.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2>電卓バブリ</h2>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          value={
            exportableData.find((e) => e.containerURL === slotURLs[0])?.value
          }
          onChange={(e) => handleSetSlotValue(e.target.value, slotURLs[0])}
          sx={{
            width: '5rem',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                border:
                  isReferSlot1 === 'ReferTo'
                    ? '1px solid blue'
                    : isReferSlot1 === 'ReferFrom'
                    ? '1px solid red'
                    : '1px solid black',
              },
              '&:hover fieldset': {
                border:
                  isReferSlot1 === 'ReferTo'
                    ? '2px solid blue'
                    : isReferSlot1 === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
              '&.Mui-focused fieldset': {
                border:
                  isReferSlot1 === 'ReferTo'
                    ? '2px solid blue'
                    : isReferSlot1 === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
            },
          }}
        ></TextField>
        <span style={{ fontSize: '2rem' }}>+</span>
        <TextField
          value={
            exportableData.find((e) => e.containerURL === slotURLs[1])?.value
          }
          onChange={(e) => handleSetSlotValue(e.target.value, slotURLs[1])}
          sx={{
            width: '5rem',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                border:
                  isReferSlot2 === 'ReferTo'
                    ? '1px solid blue'
                    : isReferSlot2 === 'ReferFrom'
                    ? '1px solid red'
                    : '1px solid black',
              },
              '&:hover fieldset': {
                border:
                  isReferSlot2 === 'ReferTo'
                    ? '2px solid blue'
                    : isReferSlot2 === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
              '&.Mui-focused fieldset': {
                border:
                  isReferSlot2 === 'ReferTo'
                    ? '2px solid blue'
                    : isReferSlot2 === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
            },
          }}
        ></TextField>
        <span style={{ fontSize: '2rem' }}>=</span>
        <TextField
          value={
            exportableData.find((e) => e.containerURL === slotURLs[2])?.value
          }
          sx={{
            width: '5rem',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                border:
                  isReferResult === 'ReferTo'
                    ? '1px solid blue'
                    : isReferResult === 'ReferFrom'
                    ? '1px solid red'
                    : '1px solid black',
              },
              '&:hover fieldset': {
                border:
                  isReferResult === 'ReferTo'
                    ? '2px solid blue'
                    : isReferResult === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
              '&.Mui-focused fieldset': {
                border:
                  isReferResult === 'ReferTo'
                    ? '2px solid blue'
                    : isReferResult === 'ReferFrom'
                    ? '2px solid red'
                    : '2px solid black',
              },
            },
          }}
          disabled
        ></TextField>
      </Stack>
      {/* <div style={{ marginBottom: '2rem' }}>
        <h3>計算結果</h3>
        {calculationResults.length > 0 ? (
          <div
            style={{
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              padding: '1rem',
              margin: '1rem 0',
              backgroundColor: '#f8fff8',
            }}
          >
            <h4>
              最新の計算結果:{' '}
              {calculationResults[calculationResults.length - 1].result}
            </h4>
            <div style={{ marginTop: '1rem' }}>
              <strong>計算式: </strong>
              {calculationResults[calculationResults.length - 1].num1} +{' '}
              {calculationResults[calculationResults.length - 1].num2} =
              <strong>
                {' '}
                {calculationResults[calculationResults.length - 1].result}
              </strong>
            </div>
          </div>
        ) : (
          <p>計算履歴がありません</p>
        )}
      </div> */}

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
          {parentMethods?.map((e, index) => (
            <MenuItem key={index} value={e.key}>
              {e.key}
            </MenuItem>
          ))}
        </Select>
        <Select
          onChange={(e) =>
            setSelectedSlot({
              containerURL: e.target.value as string,
              value:
                exportableData.find(
                  (data) => data.containerURL === e.target.value
                )?.value || '',
            })
          }
        >
          <MenuItem value={''}>Unselected</MenuItem>
          {slotURLs.map((url, index) => (
            <MenuItem key={index} value={url}>
              {url}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="outlined"
          onClick={() => {
            if (selectedMethod && selectedSlot) {
              const latestValue = exportableData.find(
                (data) => data.containerURL === selectedSlot.containerURL
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
}
