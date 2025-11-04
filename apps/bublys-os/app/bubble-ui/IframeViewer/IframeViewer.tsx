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
import {
  addApp,
  setActiveApp,
  setInActiveApp,
  removeApp,
  hydrate,
} from './store/appSlice';
import type { AppData } from './store/appSlice';
import { Message } from './Messages.domain';
import IframeAppContent from './IframeAppContent';
import PostMessageManager from './PostMessageManager';
import { AppDataAndRefs } from './PostMessageManager';
import getDomainWithProtocol from './GetDomainWithProtocol';

const IframeViewer = () => {
  const dispatch = useDispatch();
  const { apps, activeAppIds } = useSelector((state: RootState) => state.app);
  const [inputURLText, setInputURLText] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState('');

  //各アプリのref
  const [iframeRefsMap, setIframeRefsMap] = useState<
    Map<string, HTMLIFrameElement | null>
  >(new Map());

  // refが取得できるまで待機するアプリIDのセット。refが取得できたらactiveAppIdsに追加し削除
  const [pendingAppIds, setPendingAppIds] = useState<Set<string>>(new Set());

  //各アプリのrefをセットする。この関数はIframeAppContentでrefの参照が取れた際に呼び出される。
  const handleSetIframeRef = (appId: string, iframe: HTMLIFrameElement) => {
    setIframeRefsMap((prev) => new Map(prev).set(appId, iframe));

    if (pendingAppIds.has(appId)) {
      if (!activeAppIds.includes(appId)) {
        dispatch(setActiveApp(appId));
      }
      setPendingAppIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });
    }
  };

  //アプリクリックの処理
  const handleAppClick = (app: AppData) => {
    if (activeAppIds.includes(app.uuid)) {
      dispatch(setInActiveApp(app.uuid));
    } else {
      setPendingAppIds((prev) => new Set(prev).add(app.uuid));
    }
  };

  //activeAppIdsに対応するappDataとiframeRefを組み合わせた配列
  const activeApps: AppDataAndRefs[] = useMemo(() => {
    const newActiveApps: AppDataAndRefs[] = [];
    for (let i = 0; i < activeAppIds.length; i++) {
      const appData = apps?.find((app) => app.uuid === activeAppIds[i]);
      if (!appData) {
        continue;
      }
      const appRef = iframeRefsMap.get(appData.uuid);
      if (!appRef) {
        continue;
      }
      newActiveApps.push({ appData, ref: appRef });
    }
    return newActiveApps;
  }, [activeAppIds]);

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

  const sendMessageToIframe = useCallback((appId: string, message: Message) => {
    const iframe = iframeRefsMap.get(appId);
    if (iframe?.contentWindow) {
      console.log('📤 Sending message to iframe:', message);
      try {
        iframe.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('Error sending message to iframe:', error);
      }
    } else {
      console.error('❌ Iframe contentWindow is not available for app:', appId);
      console.log('Available iframes:', Array.from(iframeRefsMap.keys()));
    }
  }, []);

  const handleInstall = () => {
    if (appName.trim() && inputURLText.trim()) {
      dispatch(addApp({ name: appName, url: inputURLText }));
      setAppName('');
      setInputURLText('');
      setModalOpen(false);
    }
  };

  //-----------uiに渡すためのメッセージ由来のデータ-------------
  const receivedMessages = useSelector(
    (state: RootState) => state.massage.receivedMessages
  );
  const handShakeData = useSelector(
    (state: RootState) => state.massage.handShakeMessages
  );
  const associateUpdateDataPairs = useSelector(
    (state: RootState) => state.exportData.associateUpdateDataPairs
  );

  //-----------ui本体-------------
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
          (app) =>
            activeAppIds.includes(app.uuid) || pendingAppIds.has(app.uuid)
        )
        .map((app) => {
          const childHandShakeData = handShakeData?.find(
            (e) =>
              getDomainWithProtocol(e.protocol) ===
              getDomainWithProtocol(app.url)
          );

          return (
            <IframeAppContent
              onIframeLoad={handleSetIframeRef}
              appId={app.uuid}
              key={app.uuid}
              receivedMessages={receivedMessages.filter(
                (msg) =>
                  getDomainWithProtocol(msg.protocol) ===
                  getDomainWithProtocol(app.url)
              )}
              application={app}
              exportData={associateUpdateDataPairs.map((e) => e.fromDTO)}
              childHandShakeMessage={childHandShakeData || null}
              // iframeRef={setIframeRef(app.uuid)}
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
