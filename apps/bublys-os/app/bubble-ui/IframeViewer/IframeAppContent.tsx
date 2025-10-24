import { Box, Button, TextField, Typography } from '@mui/material';
import { useState, useRef } from 'react';
import type { AppData } from './store/appSlice';
import type { Message } from './Message.domain';

interface IframeAppContentProps {
  application: AppData | null;
  iframeRef: (element: HTMLIFrameElement | null) => void;
  sendMessageToIframe: (message: Message) => void;
  receivedMessages: Message[];
}

export const IframeAppContent = ({
  application,
  iframeRef,
  sendMessageToIframe,
  receivedMessages,
}: IframeAppContentProps) => {
  const [inputURLText, setInputURLText] = useState('');
  // const [inputMethodText, setInputMethodText] = useState('');
  // const [inputParamsText, setInputParamsText] = useState('');
  return (
    <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
      <TextField
        fullWidth
        value={inputURLText}
        onChange={(e) => setInputURLText(e.target.value)}
        placeholder="URLを入力"
        sx={{ mb: 2 }}
      />

      {application && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 100px)',
            flex: 1,
            gap: 2,
          }}
        >
          <Box
            sx={{
              flex: 1,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <iframe
              key={application?.id}
              ref={iframeRef}
              src={application?.url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title={application?.name}
            />
          </Box>

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              bgcolor: 'background.paper',
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              POST MESSAGE
            </Typography>

            {/* PAYLOAD */}
            <Box sx={{ mb: 2 }}>
              <div>
                <h3>受信したメッセージ履歴</h3>
                {receivedMessages.length > 0 ? (
                  <div
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
                        <strong>method:</strong>{' '}
                        {receivedMessages[receivedMessages.length - 1].method}
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
                    <div
                      style={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(
                        receivedMessages[receivedMessages.length - 1],
                        null,
                        2
                      )}
                    </div>
                  </div>
                ) : (
                  <p>メッセージ履歴がありません</p>
                )}
              </div>
              <Box
                sx={{ pl: 2, borderLeft: 2, borderColor: 'primary.main' }}
              ></Box>
            </Box>

            {/* PAYLOAD */}
            {/* <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 'medium' }}
              >
                payload
              </Typography>

              <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'primary.main' }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    method
                  </Typography>
                  <TextField
                    value={inputMethodText}
                    onChange={(e) => setInputMethodText(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="methodを入力"
                  />
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    params
                  </Typography>

                  <TextField
                    fullWidth
                    value={inputParamsText}
                    onChange={(e) => setInputParamsText(e.target.value)}
                    placeholder="paramsを入力"
                    sx={{
                      mb: 2,
                      '& textarea': {
                        whiteSpace: 'pre-wrap', // テキストの折り返しを有効にする
                      },
                    }}
                    multiline
                    minRows={1} // 最小行数
                    maxRows={10} // 最大行数（スクロールが発生するまでの最大行数）
                  />
                </Box>
              </Box>
            </Box> */}

            {/* Send Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                sendMessageToIframe({
                  protocol: 'MCP',
                  version: '1.0',
                  method: 'PushNumber',
                  params: {
                    slotURL: 'calculator/slot1', //inputParamsText,
                    value: 4, //inputParamsText,
                  },
                  id: '1',
                  timestamp: Date.now(),
                });
              }}
            >
              Send Message
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default IframeAppContent;
