
import React from "react";
import { useEffect, useRef, useState } from "react";

// 親コンポーネント例
function IframeViewer() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [messages, setMessages] = useState<Array<{type: string, data: any}>>([]);
  
    // メッセージ受信ハンドラ
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'http://localhost:4000') return; // iframeのオリジンを指定
        setMessages(prev => [...prev, {type: event.data.type, data: event.data}]);
      };
  
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);
  
    // iframeにメッセージを送信
    const sendMessageToIframe = () => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        { type: 'DATA_UPDATE', data: { message: '親からのメッセージ' } },
        'http://localhost:3001' // iframeのオリジンを指定
      );
    };
  
    return (
      <div>
        <iframe
          ref={iframeRef}
          src="http://localhost:4000" // iframeのURL
          title="Embedded App"
          style={{ width: '100%', height: '500px', border: '1px solid #ccc' }}
        />
        <button onClick={sendMessageToIframe}>メッセージ送信</button>
        <div>
          {messages.map((msg, i) => (
            <div key={i}>{JSON.stringify(msg)}</div>
          ))}
        </div>
      </div>
    );
  }

  export default IframeViewer;