import { Box, Button, TextField, Typography } from '@mui/material';
import { useState, useRef } from 'react';
import type { AppData } from './store/appSlice';
import type { Message } from './sendMessage.domain';

interface IframeAppContentProps {
  application: AppData | null;
  sendMessageToIframe: (message: Message) => void;
}

export const IframeAppContent = ({
  application,
  sendMessageToIframe,
}: IframeAppContentProps) => {
  const [inputURLText, setInputURLText] = useState('');
  const [displayedApp, setActiveApp] = useState<AppData | null>(application);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [inputMethodText, setInputMethodText] = useState('');
  const [inputParamsText, setInputParamsText] = useState('');

  return (
    <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
      <TextField
        fullWidth
        value={inputURLText}
        onChange={(e) => setInputURLText(e.target.value)}
        placeholder="URLを入力"
        sx={{ mb: 2 }}
      />

      {displayedApp && (
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
              ref={iframeRef}
              src={displayedApp.url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title={displayedApp.name}
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
            </Box>

            {/* Send Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                sendMessageToIframe({
                  protocol: 'MCP',
                  version: '1.0',
                  method: inputMethodText,
                  params: {
                    sender: 'bublysOS',
                    data: inputParamsText,
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
