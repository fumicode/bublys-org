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
import { useState, useEffect, useMemo, useCallback } from 'react';

import type { AppData } from "@bublys-org/state-management";

import { 
  RootState ,
  addApp,
  setActiveApp,
  setInActiveApp,
  removeApp,
  hydrate,
  useAppDispatch, 
  useAppSelector 
} from "@bublys-org/state-management"

import {IframeAppContext} from './IframeAppContext';
import PostMessageManager from './PostMessageManager';
import { AppDataAndRef } from './PostMessageManager';

type IframeViewerProps = {
  children?: React.ReactNode;
}

const IframeViewer = ({ children }: IframeViewerProps) => {
  const dispatch = useAppDispatch();
  const { apps, activeAppIds } = useAppSelector((state: RootState) => state.app);
  console.log(
    'apps',
    apps.map((e) => e.id)
  );
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
  const handleSetIframeRef = useCallback(
    (appId: string, iframe: HTMLIFrameElement) => {
      console.log('🔧 handleSetIframeRef called for appId:', appId);
      console.log('📋 Current activeAppIds:', activeAppIds);
      console.log('⏳ Current pendingAppIds:', Array.from(pendingAppIds));

      setIframeRefsMap((prev) => new Map(prev).set(appId, iframe));

      if (pendingAppIds.has(appId)) {
        if (!activeAppIds.includes(appId)) {
          console.log('✅ Adding to activeAppIds:', appId);
          dispatch(setActiveApp(appId));
        } else {
          console.log('⚠️ Already in activeAppIds, skipping:', appId);
        }
        setPendingAppIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(appId);
          return newSet;
        });
      }
    },
    [activeAppIds, pendingAppIds, dispatch]
  );

  //アプリクリックの処理
  const handleAppClick = (app: AppData) => {
    if (activeAppIds.includes(app.id)) {
      dispatch(setInActiveApp(app.id));
    } else {
      setPendingAppIds((prev) => new Set(prev).add(app.id));
    }
  };

  //activeAppIdsに対応するappDataとiframeRefを組み合わせた配列
  const activeApps: AppDataAndRef[] = useMemo(() => {
    const newActiveApps: AppDataAndRef[] = [];
    for (let i = 0; i < activeAppIds.length; i++) {
      const appData = apps?.find((app) => app.id === activeAppIds[i]);
      if (!appData) {
        continue;
      }
      const appRef = iframeRefsMap.get(appData.id);
      if (!appRef) {
        continue;
      }
      newActiveApps.push({ appData, ref: appRef });
    }
    console.log(
      '🔄 activeApps updated:',
      newActiveApps.map((a) => ({ id: a.appData.id, url: a.appData.url }))
    );
    return newActiveApps;
  }, [activeAppIds, apps, iframeRefsMap]);

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

  const handleInstall = () => {
    if (appName.trim() && inputURLText.trim()) {
      dispatch(addApp({ name: appName, url: inputURLText }));
      setAppName('');
      setInputURLText('');
      setModalOpen(false);
    }
  };

  //-----------ui本体-------------
  const contents = (
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
      {children}
      {/* {apps
        .filter(
          (app) => activeAppIds.includes(app.id) || pendingAppIds.has(app.id)
        )
        .map((app) => {
          console.log('🖼️ Rendering IframeAppContent for:', app.id, app.name);
          return <IframeAppContent key={app.id} appId={app.id} />;
        })} */}

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

  return (
    <PostMessageManager
      appRefs={activeApps}
      registerIframeRef={handleSetIframeRef}
    >
      {contents}
    </PostMessageManager>
  );
};

export default IframeViewer;
