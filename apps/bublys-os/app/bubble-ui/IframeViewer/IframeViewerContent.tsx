'use client';

import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography, IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { addApp, setActiveApp, removeApp } from './store/appSlice';
import type { AppData } from './store/appSlice';

interface MessageData {
  type: string;
  payload?: payload;
}

type payload = {
  sender: string;
  action: string;
  data?: unknown;
}

const IframeViewerContent = () => {
  const dispatch = useDispatch();
  const { apps, activeAppId } = useSelector((state: RootState) => state.app);
  const [inputSenderText, setInputSenderText] = useState("bublysOS");
  const [inputURLText, setInputURLText] = useState("");
  const [inputTypeText, setInputTypeText] = useState("");
  const [inputActionText, setInputActionText] = useState("");
  const [inputDataText, setInputDataText] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleAppClick = (app: AppData) => {
    if (activeAppId === app.id) {
      dispatch(setActiveApp(null));
      setInputURLText("");
    } else {
      dispatch(setActiveApp(app.id));
      setInputURLText(app.url);
    }
  };

  const handleInstall = () => {
    if (appName.trim() && inputURLText.trim()) {
      dispatch(addApp({ name: appName, url: inputURLText }));
      setAppName("");
      setInputURLText("");
      setModalOpen(false);
    }
  };

  const activeApp = apps.find(app => app.id === activeAppId);

  // 親ウィンドウからのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received in parent:', event.data);
      
      // メッセージの処理
      const message = event.data;
      if (message && typeof message === 'object' && message.type) {
        console.log('Received message from iframe:', message);
        
        if (message.type === 'INIT_RESPONSE') {
          console.log('Iframe is ready:', message.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const sendMessageToIframe = useCallback((message: MessageData) => {
    if (iframeRef.current?.contentWindow) {
      console.log('Sending message to iframe:', message);
      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('Error sending message to iframe:', error);
      }
    } else {
      console.error('Iframe contentWindow is not available');
    }
  }, []);

  return (
    <Box sx={{ display: 'flex'}}>
      {/* サイドバー */}
      <Box sx={{ width: 250, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', p: 2 }}>
        <Button 
          variant="contained" 
          fullWidth 
          sx={{ mb: 2 }}
          onClick={() => setModalOpen(true)}
        >
          アプリを追加
        </Button>
        
        <Stack spacing={1}>
          {apps.map((app) => (
            <Box key={app.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant={activeAppId === app.id ? 'contained' : 'outlined'}
                onClick={() => handleAppClick(app)}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                {app.name}
              </Button>
              <IconButton 
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(removeApp(app.id));
                }}
                size="small"
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
        <TextField
          fullWidth
          value={inputURLText}
          onChange={(e) => setInputURLText(e.target.value)}
          placeholder="URLを入力"
          sx={{ mb: 2 }}
        />
        
        {activeApp && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 100px)',
            flex: 1,
            gap: 2
          }}>
            <Box 
              sx={{ 
                flex: 1, 
                border: 1, 
                borderColor: 'divider', 
                overflow: 'hidden'
              }}
            >
              <iframe
                ref={iframeRef}
                src={activeApp.url}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  display: 'block' 
                }}
                title={activeApp.name}
              />
            </Box>
        
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.paper', flexShrink: 0}}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                POST MESSAGE
              </Typography>

              {/* TYPE */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
                  TYPE
                </Typography>
                <TextField 
                  value={inputTypeText} 
                  onChange={(e) => setInputTypeText(e.target.value)} 
                  fullWidth 
                  size="small"
                  placeholder="TYPEを入力" 
                />
              </Box>

              {/* PAYLOAD */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  payload
                </Typography>
                
                <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'primary.main' }}>
                  {/* senderBublyId */}
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      senderBublyId
                    </Typography>
                    <TextField 
                      value={inputSenderText} 
                      onChange={(e) => setInputSenderText(e.target.value)} 
                      fullWidth 
                      size="small"
                      placeholder="senderを入力" 
                    />
                  </Box>

                  {/* action */}
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      action
                    </Typography>
                    <TextField 
                      value={inputActionText} 
                      onChange={(e) => setInputActionText(e.target.value)} 
                      fullWidth 
                      size="small"
                      placeholder="actionを入力" 
                    />
                  </Box>

                  {/* data */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      data
                    </Typography>
                    <TextField 
                      value={inputDataText} 
                      onChange={(e) => setInputDataText(e.target.value)} 
                      fullWidth 
                      size="small"
                      placeholder="dataを入力" 
                    />
                  </Box>
                </Box>
              </Box>

              {/* Send Button */}
              <Button 
                fullWidth
                variant="contained" 
                onClick={() => {
                  let parsedData: unknown = inputDataText;
                  
                  // dataフィールドをJSON形式として解析を試みる
                  if (inputDataText.trim()) {
                    try {
                      // JSON形式の場合（例: [5,5] や {"key": "value"}）
                      parsedData = JSON.parse(inputDataText);
                    } catch {
                      // JSON形式でない場合、カンマ区切りを配列に変換を試みる
                      if (inputDataText.includes(',')) {
                        parsedData = inputDataText.split(',').map(s => {
                          const trimmed = s.trim();
                          const num = Number(trimmed);
                          return isNaN(num) ? trimmed : num;
                        });
                      }
                    }
                  }
                  
                  sendMessageToIframe({ 
                    type: inputTypeText, 
                    payload: { 
                      sender: inputSenderText, 
                      action: inputActionText, 
                      data: parsedData 
                    } 
                  });
                }}
              >
                Send Message
              </Button>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* アプリ追加モーダル */}
      <Dialog open={isModalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>アプリを追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="アプリ名"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="URL"
            fullWidth
            value={inputURLText}
            onChange={(e) => setInputURLText(e.target.value)}
            placeholder="https://example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleInstall}
            variant="contained"
            disabled={!appName.trim() || !inputURLText.trim()}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IframeViewerContent;