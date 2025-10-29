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
import { addApp, setActiveApp, removeApp, hydrate } from './store/appSlice';
import type { AppData } from './store/appSlice';
import { Message } from './Message.domain';
import IframeAppContent from './IframeAppContent';
import { v4 as uuidv4 } from 'uuid';

export interface ExportDataDTO {
  containerURL: string;
  value: number;
}

export interface OnChangeValueDTO {
  containerURL: string;
  value: number;
}

export interface HandShakeDTO {
  key: string;
  value: { URL: string; value: string };
}

interface AssociateMessage {
  fromMessage: Message;
  toMessages: Message[];
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
  const [handShakeData, setHandShakeData] = useState<Message[]>([]);
  const [exportData, setExportData] = useState<Message[]>([]);
  const [associateData, setAssociateData] = useState<AssociateMessage[]>([]);

  const createMessage = (method: string, params: any) => {
    return {
      protocol: 'http://localhost:3000',
      version: '0.0.1',
      method: method,
      params: params,
      id: uuidv4(),
      timestamp: Date.now(),
    };
  };

  // クライアント側でマウント時にlocalStorageから状態を復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const serializedState = localStorage.getItem('iframeViewerState');
        if (serializedState) {
          const savedState = JSON.parse(serializedState);
          dispatch(hydrate(savedState));
        }
      } catch (err) {
        console.warn('ローカルストレージからの復元に失敗しました', err);
      }
    }
  }, [dispatch]);
  const checkAndSetExportData = (message: Message) => {
    console.log(JSON.stringify(message));
    setExportData((prev) => {
      // 同じようなデータが存在するかチェック
      const existingIndex = prev.findIndex(
        (e) =>
          e.protocol === message.protocol &&
          e.version === message.version &&
          e.method === message.method &&
          e.params.containerURL === message.params.containerURL
      );

      // 存在する場合は置き換え
      if (existingIndex !== -1) {
        return prev.map((e, i) => (i === existingIndex ? message : e));
      }

      // 存在しない場合は追加し、同時にstartReferBlockを送信
      const app = activeApps?.find((app) => app.url === message.protocol);
      const startReferMessage = createMessage('startRefer', {
        containerURL: message.params.containerURL,
      });
      if (app) {
        sendMessageToIframe(app.id, startReferMessage);
      }
      return [...prev, message];
    });

    // const getValueMessage: Message = {
    //   protocol: message.protocol,
    //   version: message.version,
    //   method: 'getValue',
    //   params: message.params,
    //   id: message.id,
    //   timestamp: message.timestamp,
    // };
    // const associateMessage: AssociateMessage = {
    //   fromMessage: message,
    //   toMessages: [getValueMessage],
    // };
    // setAssociateData((prev) => [...prev, associateMessage]);
  };

  const onChangeExportData = (message: Message) => {
    setExportData((prev) =>
      prev.map((e) =>
        e.protocol === message.protocol &&
        e.params.containerURL === message.params.containerURL
          ? message
          : e
      )
    );
  };

  const checkAndSetHandShakeData = (message: Message) => {
    setHandShakeData((prev) => {
      // 同じようなデータが存在するかチェック
      const existingIndex = prev.findIndex(
        (e) =>
          e.protocol === message.protocol &&
          e.version === message.version &&
          e.method === message.method &&
          e.params.methods === message.params.methods
      );

      // 存在する場合は置き換え
      if (existingIndex !== -1) {
        return prev.map((e, i) => (i === existingIndex ? message : e));
      }

      // 存在しない場合は追加
      return [...prev, message];
    });
  };

  // activeAppsごとに個別のiframe refをMapで管理
  const iframeRefsMap = useRef(new Map<string, HTMLIFrameElement | null>());

  const sendMessageToIframe = useCallback((appId: string, message: Message) => {
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
      console.log(
        'Available iframes:',
        Array.from(iframeRefsMap.current.keys())
      );
    }
  }, []);

  const setIframeRef = useCallback(
    (appId: string) => {
      return (element: HTMLIFrameElement | null) => {
        if (element) {
          iframeRefsMap.current.set(appId, element);

          // refが設定されたら、iframeのロードを待ってhandshakeを送信
          const sendHandshakeWhenReady = () => {
            if (element.contentWindow) {
              sendMessageToIframe(appId, handShakeMessage());
            } else {
              // contentWindowがまだ準備できていない場合は少し待つ
              setTimeout(sendHandshakeWhenReady, 100);
            }
          };

          // iframeのロードイベントを待つ
          element.addEventListener('load', () => {
            setTimeout(() => sendHandshakeWhenReady(), 100);
          });
        } else {
          iframeRefsMap.current.delete(appId);
        }
      };
    },
    [sendMessageToIframe]
  );

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
      console.log(JSON.stringify(event.data));
      try {
        const message = event.data as Message;
        setReceivedMessages((prev) => [...prev, message]);
        if (message.method === 'exportData') {
          checkAndSetExportData(message);
        } else if (message.method === 'onChangeValue') {
          onChangeExportData(message);
        } else if (message.method === 'handShake') {
          const targetApp = apps.find((app) => app.url === message.protocol);
          if (targetApp) {
            sendMessageToIframe(targetApp.id, handShakeMessage());
          } else {
            console.warn('⚠️ App not found for protocol:', message.protocol);
          }
          checkAndSetHandShakeData(message);
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
  }, [apps, sendMessageToIframe]);

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

      {activeApps.map((app) => {
        const childHandShakeData = handShakeData?.find(
          (e) => e.protocol === app.url
        );

        return (
          <IframeAppContent
            key={app.id}
            receivedMessages={receivedMessages.filter(
              (msg) => msg.protocol === app.url
            )}
            application={app}
            exportData={exportData}
            childHandShakeMessage={childHandShakeData || null}
            iframeRef={setIframeRef(app.id)}
            sendMessageToIframe={(message) =>
              sendMessageToIframe(app.id, message)
            }
          />
        );
      })}

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
