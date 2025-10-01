"use client"
import { useEffect, useState } from 'react';

interface ReceivedMessage {
  type: string;
  payload?: any;
  data?: any;
}

export default function EmbeddedPage() {
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received in calculator:', event.data);
      
      try {
        const message = event.data as ReceivedMessage;
        console.log('Parsed message:', message);
        
        setReceivedMessages(prev => [...prev, message]);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 計算結果を抽出
  const calculationResults = receivedMessages
    .filter(msg => msg.type === 'POST' && msg.payload?.action === 'calc')
    .map((msg, index) => {
      const data = msg.payload?.data;
      if (Array.isArray(data) && data.length === 2) {
        const [num1, num2] = data.map(Number);
        if (!isNaN(num1) && !isNaN(num2)) {
          return {
            id: index,
            num1,
            num2,
            result: num1 + num2
          };
        }
      }
      return null;
    })
    .filter(result => result !== null);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2>電卓アプリ</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>計算結果</h3>
        {calculationResults.length > 0 ? (
          <div style={{ 
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '1rem',
            margin: '1rem 0',
            backgroundColor: '#f8fff8'
          }}>
            <h4>最新の計算結果: {calculationResults[calculationResults.length - 1].result}</h4>
            <div style={{ marginTop: '1rem' }}>
              <strong>計算式: </strong>
              {calculationResults[calculationResults.length - 1].num1} + {calculationResults[calculationResults.length - 1].num2} = 
              <strong> {calculationResults[calculationResults.length - 1].result}</strong>
            </div>
          </div>
        ) : (
          <p>計算履歴がありません</p>
        )}
      </div>
      
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid #eee'
              }}>
                <span><strong>Type:</strong> {msg.type}</span>
                <span style={{ 
                  color: '#555',
                  fontSize: '0.9em'
                }}>
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(msg.payload || msg.data, null, 2)}
              </div>
            </div>
          ))
        ) : (
          <p>メッセージ履歴がありません</p>
        )}
      </div>
    </div>
  );
}