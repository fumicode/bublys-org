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
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { addApp, setActiveApp, removeApp } from './store/appSlice';
import type { AppData } from './store/appSlice';
import { Message } from './Message.domain';
import IframeAppContent from './IframeAppContent';
import { v4 as uuidv4 } from 'uuid';

interface ExportDataDTO {
  containerURL: string;
  value: number;
}

interface OnChangeValueDTO {
  containerURL: string;
  value: number;
}

//自分のメソッドを相手に渡す
const handShakeMessage = () => {
  return {
    protocol: 'http://localhost:3000',
    version: '0.0.1',
    method: 'handShake',
    params: {
      methods: [
        {
          key: 'exportData',
          value: { containerURL: 'string', value: 'number' },
        },
        {
          key: 'onChangeValue',
          value: { containerURL: 'string', value: 'number' },
        },
      ],
    },
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

const IframeViewerContent = () => {
  const dispatch = useDispatch();
  const { apps, activeAppIds } = useSelector((state: RootState) => state.app);
  const displayedAppLimit = 2;
  const [inputURLText, setInputURLText] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const activeApps = apps.filter((app) => activeAppIds.includes(app.id));
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

  const [holdData, setHoldData] = useState<Message[]>([]);
  const checkAndSetHoldData = (message: Message) => {
    //同じようなデータがすでに存在する場合は置き換える
    setHoldData((prev) =>
      prev.map((e) =>
        e.protocol === message.protocol &&
        e.version === message.version &&
        e.method === message.method &&
        e.params.containerURL === message.params.containerURL
          ? message
          : e
      )
    );
    //同じようなデータが存在しない場合は追加する
    setHoldData((prev) => [...prev, message]);
  };

  const onChangeHoldData = (message: Message) => {
    setHoldData((prev) =>
      prev.map((e) =>
        e.protocol === message.protocol &&
        e.params.containerURL === message.params.containerURL
          ? message
          : e
      )
    );
  };

  // activeAppsごとに個別のiframe refをMapで管理
  const iframeRefsMap = useRef(new Map<string, HTMLIFrameElement | null>());

  const setIframeRef = useCallback((appId: string) => {
    return (element: HTMLIFrameElement | null) => {
      if (element) {
        iframeRefsMap.current.set(appId, element);
        console.log('✅ Iframe ref set for app:', appId);
      } else {
        iframeRefsMap.current.delete(appId);
        console.log('❌ Iframe ref removed for app:', appId);
      }
    };
  }, []);

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

  // 子ウィンドウからのメッセージを受信
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
        setReceivedMessages((prev) => [...prev, message]);
        if (message.method === 'exportData') {
          checkAndSetHoldData(message);
        } else if (message.method === 'onChangeValue') {
          onChangeHoldData(message);
        } else if (message.method === 'handShake') {
          console.log(apps.find((app) => app.url === message.protocol)?.url);
          sendMessageToIframe(
            apps.find((app) => app.url === message.protocol)?.id || '',
            handShakeMessage()
          );
        }
      } catch (error) {
        console.error('Error :サポートされていない形式です', error);
        return;
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const sendMessageToIframe = useCallback(
    (appId: string, message: Message) => {
      const iframe = iframeRefsMap.current.get(appId);
      if (iframe?.contentWindow) {
        console.log('📤 Sending message to iframe:', message);
        try {
          iframe.contentWindow.postMessage(message, '*');
        } catch (error) {
          console.error('Error sending message to iframe:', error);
        }
      } else {
        console.error('❌ Iframe contentWindow is not available for app:', appId);
        console.log('Available iframes:', Array.from(iframeRefsMap.current.keys()));
      }
    },
    []
  );

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
          receivedMessages={receivedMessages.filter(
            (msg) => msg.protocol === app.url
          )}
          application={app}
          iframeRef={setIframeRef(app.id)}
          sendMessageToIframe={(message) =>
            sendMessageToIframe(app.id, message)
          }
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
