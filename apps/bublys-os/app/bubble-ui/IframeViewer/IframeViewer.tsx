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
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { addApp, setActiveApp, removeApp, hydrate } from './store/appSlice';
import type { AppData } from './store/appSlice';
import { Message } from './Messages.domain';
import IframeAppContent from './IframeAppContent';
import PostMessageManager from './PostMessageManager';
import { AppDataAndRefs } from './PostMessageManager';
import getDomainWithProtocol from './GetDomainWithProtocol';

const IframeViewer = () => {
  const dispatch = useDispatch();
  const { apps, activeAppIds } = useSelector((state: RootState) => state.app);
  const displayedAppLimit = 2;
  const [inputURLText, setInputURLText] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const receivedMessages = useSelector(
    (state: RootState) => state.massage.receivedMessages
  );
  console.log(receivedMessages);
  const handShakeData = useSelector(
    (state: RootState) => state.massage.handShakeMessages
  );
  console.log(handShakeData);
  const associateUpdateDataPairs = useSelector(
    (state: RootState) => state.exportData.associateUpdateDataPairs
  );
  // refが取得できるまで待機するアプリIDのセット
  const [pendingAppIds, setPendingAppIds] = useState<Set<string>>(new Set());

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

  //activeAppIdsに対応するappDataとiframeRefを組み合わせた配列
  const activeApps: AppDataAndRefs[] = useMemo(() => {
    const newActiveApps: AppDataAndRefs[] = [];
    for (let i = 0; i < activeAppIds.length; i++) {
      const appData = apps?.find((app) => app.uuid === activeAppIds[i]);
      if (!appData) {
        continue;
      }
      const appRef = iframeRefsMap.current.get(appData.uuid);
      if (!appRef) {
        continue;
      }
      newActiveApps.push({ appData, ref: appRef });
    }
    return newActiveApps;
  }, [activeAppIds, apps]);

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
          console.log('✅ [setIframeRef] Ref set for:', appId);
          iframeRefsMap.current.set(appId, element);

          // refが設定されたら、待機中の場合はactiveAppIdsに追加
          if (pendingAppIds.has(appId)) {
            console.log('⏰ [setIframeRef] Pending app detected, adding to activeAppIds:', appId);
            setPendingAppIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(appId);
              return newSet;
            });

            if (activeAppIds.includes(appId)) {
              // 既に含まれている場合はスキップ
              console.log('⏭️ [setIframeRef] Already in activeAppIds:', appId);
            } else if (activeAppIds.length >= displayedAppLimit) {
              const newActiveAppIds = [
                ...activeAppIds.slice(activeAppIds.length - displayedAppLimit + 1),
                appId,
              ];
              console.log('📝 [setIframeRef] Dispatching setActiveApp (with limit):', newActiveAppIds);
              dispatch(setActiveApp(newActiveAppIds));
            } else {
              console.log('📝 [setIframeRef] Dispatching setActiveApp:', [...activeAppIds, appId]);
              dispatch(setActiveApp([...activeAppIds, appId]));
            }
          }
        } else {
          iframeRefsMap.current.delete(appId);
        }
      };
    },
    [activeAppIds, displayedAppLimit, pendingAppIds, dispatch]
  );

  const handleAppClick = (app: AppData) => {
    if (activeAppIds.includes(app.uuid)) {
      console.log('🔽 [handleAppClick] Removing from activeAppIds:', app.uuid);
      dispatch(setActiveApp(activeAppIds.filter((id) => id !== app.uuid)));
    } else {
      console.log('⏳ [handleAppClick] Adding to pending:', app.uuid);
      setPendingAppIds((prev) => new Set(prev).add(app.uuid));
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

  const child = (
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
              key={app.uuid}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <Button
                variant={
                  activeAppIds.includes(app.uuid) ? 'contained' : 'outlined'
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
                  dispatch(removeApp(app.uuid));
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
          (app) => activeAppIds.includes(app.uuid) || pendingAppIds.has(app.uuid)
        )
        .map((app) => {
          const childHandShakeData = handShakeData?.find(
            (e) =>
              getDomainWithProtocol(e.protocol) ===
              getDomainWithProtocol(app.url)
          );

          return (
            <IframeAppContent
              key={app.uuid}
              receivedMessages={receivedMessages.filter(
                (msg) =>
                  getDomainWithProtocol(msg.protocol) ===
                  getDomainWithProtocol(app.url)
              )}
              application={app}
              exportData={associateUpdateDataPairs.map((e) => e.fromDTO)}
              childHandShakeMessage={childHandShakeData || null}
              iframeRef={setIframeRef(app.uuid)}
              sendMessageToIframe={(message) =>
                sendMessageToIframe(app.uuid, message)
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

  return <PostMessageManager appRefs={activeApps} child={child} />;
};

export default IframeViewer;
