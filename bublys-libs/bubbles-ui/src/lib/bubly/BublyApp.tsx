'use client';
import { FC, useEffect, useCallback, useMemo } from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import {
  useAppSelector,
  useAppDispatch,
  selectWindowSize,
  setWindowSize,
} from '@bublys-org/state-management';
import { CoordinateSystem } from '@bublys-org/bubbles-ui-util';
import { Bubble, createBubble } from '../Bubble.domain.js';
import { BubblesContext } from '../bubble-routing/BubbleRouting.js';
import { BubbleRefsProvider } from '../context/BubbleRefsContext.js';
import {
  selectBubbleLayers,
  selectSurfaceBubbles,
  addBubble,
  deleteProcessBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  popChildInProcess as popChildAction,
  popChildMaxInProcess,
  joinSiblingInProcess as joinSiblingAction,
  relateBubbles,
  removeBubble,
  selectGlobalCoordinateSystem,
  setGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  OpeningPosition,
} from '../state/index.js';
import { BubblesLayeredView } from '../ui/BubblesLayeredView.js';
import { BublyMenuItem } from './BublyTypes.js';

/**
 * BublyApp のプロパティ
 */
export type BublyAppProps = {
  /** サイドバーに表示するタイトル */
  title: string;
  /** サイドバーに表示するサブタイトル（オプション） */
  subtitle?: string;
  /** サイドバーのメニュー項目 */
  menuItems: BublyMenuItem[];
  /** サイドバーのフッター（オプション） */
  sidebarFooter?: React.ReactNode;
};

/**
 * Bubly スタンドアロンアプリ用の共通UIシェル
 * サイドバー + バブル表示エリアを提供する
 */
export const BublyApp: FC<BublyAppProps> = ({
  title,
  subtitle,
  menuItems,
  sidebarFooter,
}) => {
  const dispatch = useAppDispatch();
  const bubbleLayers = useAppSelector(selectBubbleLayers);
  const surfaceBubbles = useAppSelector(selectSurfaceBubbles);

  // ページサイズ管理
  const pageSize = useAppSelector(selectWindowSize);
  useEffect(() => {
    const update = () =>
      dispatch(
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      );
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [dispatch]);

  // CoordinateSystem
  const globalCoordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);

  // アクションハンドラ
  const deleteBubble = (b: Bubble) => {
    dispatch(deleteBubbleAction(b.id));
    dispatch(removeBubble(b.id));
  };

  const layerDown = (b: Bubble) => {
    dispatch(layerDownAction(b.id));
  };

  const layerUp = (b: Bubble) => {
    dispatch(layerUpAction(b.id));
  };

  const popChild = useCallback((
    b: Bubble,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'bubble-side'
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(popChildAction({ bubbleId: b.id, openingPosition }));
    return b.id;
  }, [dispatch]);

  const popChildMax = useCallback((b: Bubble, openerBubbleId: string): string => {
    const availableWidth = pageSize.width - globalCoordinateSystem.offset.x - surfaceLeftTop.x;
    const availableHeight = pageSize.height - globalCoordinateSystem.offset.y - surfaceLeftTop.y;

    const resizedBubble = b.resizeTo({ width: availableWidth, height: availableHeight });
    const movedBubble = resizedBubble.moveTo({ x: 0, y: 0 });

    dispatch(addBubble(movedBubble.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: movedBubble.id }));
    dispatch(popChildMaxInProcess(b.id));

    return b.id;
  }, [dispatch, pageSize, globalCoordinateSystem, surfaceLeftTop]);

  const joinSibling = useCallback((
    b: Bubble,
    openerBubbleId: string
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(joinSiblingAction(b.id));
    return b.id;
  }, [dispatch]);

  const popChildOrJoinSibling = useCallback((
    name: string,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'bubble-side'
  ): string => {
    const newBubble = createBubble(name);

    const isNameEndWithHistory = /\/history$/.test(name);

    if (isNameEndWithHistory) {
      return popChildMax(newBubble, openerBubbleId);
    }

    if (surfaceBubbles?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId, openingPosition);
    }
  }, [surfaceBubbles, popChild, popChildMax, joinSibling]);

  const handleCoordinateSystemReady = useCallback((cs: CoordinateSystem) => {
    dispatch(setGlobalCoordinateSystem(cs.toData()));
  }, [dispatch]);

  const bubblesContextValue = useMemo(() => ({
    pageSize,
    surfaceLeftTop,
    coordinateSystem: globalCoordinateSystem,
    openBubble: popChildOrJoinSibling,
  }), [pageSize, surfaceLeftTop, globalCoordinateSystem, popChildOrJoinSibling]);

  const handleMenuItemClick = (item: BublyMenuItem) => {
    const url = typeof item.url === 'function' ? item.url() : item.url;
    popChildOrJoinSibling(url, 'root');
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      {/* サイドバー */}
      <Box
        sx={{
          width: 200,
          backgroundColor: 'rgba(30, 30, 40, 0.95)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ヘッダー */}
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* メニュー */}
        <List sx={{ flex: 1 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.label}
              onClick={() => handleMenuItemClick(item)}
              sx={{
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        {/* フッター */}
        {sidebarFooter && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {sidebarFooter}
          </Box>
        )}
      </Box>

      {/* メインエリア（バブル表示） */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <BubblesContext.Provider value={bubblesContextValue}>
          <BubbleRefsProvider>
            <Box sx={{ width: '100%', height: '100%' }}>
              <BubblesLayeredView
                bubbleLayers={bubbleLayers}
                vanishingPoint={globalCoordinateSystem.vanishingPoint}
                onBubbleClose={deleteBubble}
                onBubbleLayerDown={layerDown}
                onBubbleLayerUp={layerUp}
                onCoordinateSystemReady={handleCoordinateSystemReady}
              />
            </Box>
          </BubbleRefsProvider>
        </BubblesContext.Provider>
      </Box>
    </Box>
  );
};
