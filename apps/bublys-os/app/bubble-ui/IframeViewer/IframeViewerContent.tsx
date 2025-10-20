'use client';

import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { addApp, setActiveApp, removeApp } from './store/appSlice';
import type { AppData } from './store/appSlice';
import { Message } from './sendMessage.domain';
import IframeAppContent from './IframeAppContent';

const IframeViewerContent = () => {
  const dispatch = useDispatch();
  const { apps, activeAppIds } = useSelector((state: RootState) => state.app);
  const displayedAppLimit = 2;
  const [inputURLText, setInputURLText] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleAppClick = (app: AppData) => {
    if (activeAppIds.includes(app.id)) {
      dispatch(setActiveApp(activeAppIds.filter((id) => id !== app.id)));
    } else {
      if (activeAppIds.length >= displayedAppLimit) {
        // 古い要素を削除して新しい要素を追加
        const newActiveAppIds = [
          ...activeAppIds.slice(activeAppIds.length - displayedAppLimit),
          app.id,
        ];
        dispatch(setActiveApp(newActiveAppIds));
      } else {
        dispatch(setActiveApp([...activeAppIds, app.id]));
      }
    }
  };

  const handleInstall = () => {
    if (appName.trim() && inputURLText.trim()) {
      dispatch(addApp({ name: appName, url: inputURLText }));
      setAppName('');
      setInputURLText('');
      setModalOpen(false);
    }
  };

  const activeApps = apps.filter((app) => activeAppIds.includes(app.id));

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

  const sendMessageToIframe = useCallback((message: Message) => {
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
    <Box sx={{ display: 'flex' }}>
      {/* サイドバー */}
      <Box
        sx={{
          width: 250,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          p: 2,
        }}
      >
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
            <Box
              key={app.id}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <Button
                variant={
                  activeAppIds.includes(app.id) ? 'contained' : 'outlined'
                }
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

      {activeApps.map((app) => (
        <IframeAppContent
          key={app.id}
          application={app}
          sendMessageToIframe={sendMessageToIframe}
        />
      ))}

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
