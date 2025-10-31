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
import { Message } from './Messages.domain';
import IframeAppContent from './IframeAppContent';

const IframeViewer = () => {
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
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);

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

          const sendHandshakeWhenReady = () => {
            if (element.contentWindow) {
              sendMessageToIframe(appId, handShakeMessage());
            } else {
              setTimeout(sendHandshakeWhenReady, 100);
            }
          };

          element.addEventListener('load', () => {
            setTimeout(() => {
              sendHandshakeWhenReady();
              if (pendingAppId === appId) {
                if (activeAppIds.includes(appId)) {
                  // 既に含まれている場合はそのまま
                  setPendingAppId(null);
                } else if (activeAppIds.length >= displayedAppLimit) {
                  const newActiveAppIds = [
                    ...activeAppIds.slice(
                      activeAppIds.length - displayedAppLimit
                    ),
                    appId,
                  ];
                  dispatch(setActiveApp(newActiveAppIds));
                  setPendingAppId(null);
                } else {
                  dispatch(setActiveApp([...activeAppIds, appId]));
                  setPendingAppId(null);
                }
              }
            }, 100);
          });
        } else {
          iframeRefsMap.current.delete(appId);
        }
      };
    },
    [
      sendMessageToIframe,
      activeAppIds,
      displayedAppLimit,
      pendingAppId,
      dispatch,
    ]
  );

  const handleAppClick = (app: AppData) => {
    if (activeAppIds.includes(app.id)) {
      dispatch(setActiveApp(activeAppIds.filter((id) => id !== app.id)));
    } else {
      setPendingAppId(app.id);
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

      {apps
        .filter(
          (app) => activeAppIds.includes(app.id) || app.id === pendingAppId
        )
        .map((app) => {
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

export default IframeViewer;
