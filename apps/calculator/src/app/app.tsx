'use client';
import { useEffect, useState } from 'react';
import { TextField, Stack, Select, MenuItem, Button } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  protocol: string;
  version: string;
  method: string;
  params: any;
  id: string;
  timestamp: number;
}

interface PushNumberDTO {
  slotURL: string;
  value: number;
}

interface UpdateNumberDTO {
  slotURL: string;
  value: number;
}

interface HandShakeDTO {
  key: string;
  value: { blockURL: string; displayText: string };
}

interface SlotData {
  slotURL: string;
  value: string;
}
//自分のメソッドを相手に渡す
const handShakeMessage = () => {
  return {
    protocol: 'http://localhost:4200',
    version: '0.0.1',
    method: 'handShake',
    params: {
      methods: [
        { key: 'PushNumber', value: { slotURL: 'string', value: 'number' } },
        { key: 'UpdateNumber', value: { slotURL: 'string', value: 'number' } },
      ],
    },
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

export default function EmbeddedPage() {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

  const [slot1Value, setSlot1Value] = useState('');
  const [slot2Value, setSlot2Value] = useState('');
  useEffect(() => {
    const calcResult = Number(slot1Value) + Number(slot2Value);
    setCalcResultValue(calcResult.toString());
    if (selectedSlot && selectedSlot.slotURL === 'calculator/result') {
      setSelectedSlot({
        slotURL: selectedSlot.slotURL,
        value: calcResult.toString(),
      });
    }
  }, [slot1Value, slot2Value]);
  const [calcResultValue, setCalcResultValue] = useState('');
  const [parentMethods, setParentMethods] = useState<HandShakeDTO[] | null>(
    null
  );
  const [selectedMethod, setSelectedMethod] = useState<HandShakeDTO | null>(
    null
  );
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);

  useEffect(() => {
    console.log('🔥 Calculator useEffect called - Component mounted!');
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
        if (event.data.method === 'PushNumber') {
          const pushNumberDTO = message.params as unknown as PushNumberDTO;
          if (pushNumberDTO.slotURL === 'calculator/slot1') {
            // 関数形式で最新の値を取得
            setSlot1Value((currentValue) => {
              return currentValue === ''
                ? pushNumberDTO.value.toString()
                : currentValue;
            });
          }
          if (pushNumberDTO.slotURL === 'calculator/slot2') {
            setSlot2Value((currentValue) => {
              return currentValue === ''
                ? pushNumberDTO.value.toString()
                : currentValue;
            });
          }
        } else if (event.data.method === 'UpdateNumber') {
          const updateNumberDTO = message.params as unknown as UpdateNumberDTO;
          if (updateNumberDTO.slotURL === 'calculator/slot1') {
            setSlot1Value(updateNumberDTO.value.toString());
          }
          if (updateNumberDTO.slotURL === 'calculator/slot2') {
            setSlot2Value(updateNumberDTO.value.toString());
          }
        } else if (event.data.method === 'handShake') {
          const handShakeDTO = message.params
            .methods as unknown as HandShakeDTO[];
          setParentMethods(handShakeDTO);
        }
      } catch (error) {
        console.error('Error :サポートされていない形式です', error);
      }
    };
    window.addEventListener('message', handleMessage);
    sendMessageToIframeParent(handShakeMessage());
    return () => {
      console.log('🧹 Calculator useEffect cleanup - Component unmounting!');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const createMessage = (method: string, params: any) => {
    return {
      protocol: 'http://localhost:4200',
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
          value={slot1Value}
          onChange={(e) => setSlot1Value(e.target.value)}
          sx={{ width: '5rem' }}
        ></TextField>
        <span style={{ fontSize: '2rem' }}>+</span>
        <TextField
          value={slot2Value}
          onChange={(e) => setSlot2Value(e.target.value)}
          sx={{ width: '5rem' }}
        ></TextField>
        <span style={{ fontSize: '2rem' }}>=</span>
        <TextField
          value={calcResultValue}
          sx={{ width: '5rem' }}
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
          onChange={(e) => setSelectedMethod(e.target.value as HandShakeDTO)}
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
            setSelectedSlot(
              e.target.value === 'calculator/slot1'
                ? { slotURL: 'calculator/slot1', value: slot1Value }
                : e.target.value === 'calculator/slot2'
                ? { slotURL: 'calculator/slot2', value: slot2Value }
                : e.target.value === 'calculator/result'
                ? { slotURL: 'calculator/result', value: calcResultValue }
                : null
            )
          }
        >
          <MenuItem value={''}>Unselected</MenuItem>
          <MenuItem value={'calculator/slot1'}>calculator/slot1</MenuItem>
          <MenuItem value={'calculator/slot2'}>calculator/slot2</MenuItem>
          <MenuItem value={'calculator/result'}>calculator/result</MenuItem>
        </Select>
        <Button
          variant="outlined"
          onClick={() => {
            if (selectedMethod && selectedSlot) {
              setSelectedSlot({
                slotURL: selectedSlot?.slotURL || '',
                value: selectedSlot.value,
              });
              sendMessageToIframeParent(
                createMessage(selectedMethod.key, selectedSlot)
              );
            }
          }}
        >
          送信
        </Button>
      </Stack>
    </div>
  );
}
