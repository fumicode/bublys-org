import { useContext, useEffect } from 'react';
import { WorldLineContext } from '../domain/WorldLineContext';
import { WorldInitializeButton } from './WorldInitialize';
import { WorldLine3DView } from './WorldLine3DView';

// 以降は通常表示用の WorldLineView
export interface WorldLineViewProps<TWorldState> {
  renderWorldState: (
    worldState: TWorldState,
    onWorldStateChange: (newWorldState: TWorldState) => void
  ) => React.ReactNode;
  onOpenWorldLineView?: () => void; // 外部から3Dビューを開く場合（例：bubble-uiで新しいバブルを開く）
}

export function WorldLineView<TWorldState>({
  renderWorldState,
  onOpenWorldLineView,
}: WorldLineViewProps<TWorldState>) {
  const {
    apexWorld,
    grow,
    initialize,
    isInitializing,
    isInitialized,
    isShowing3DView,
    closeModal,
    showAllWorldLines,
  } = useContext(WorldLineContext);
  
  // Ctrl+Zで3Dビューを開くハンドラ
  useEffect(() => {
    // 3Dビューが表示されている場合は、このハンドラを無効化
    if (isShowing3DView) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        event.stopPropagation();
        if (onOpenWorldLineView) {
          onOpenWorldLineView();
        } else if (isInitialized && showAllWorldLines) {
          showAllWorldLines();
        } else {
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onOpenWorldLineView, isInitialized, showAllWorldLines, isShowing3DView]);

  // 3Dビューを表示している場合は3Dビューを表示
  if (isShowing3DView) {
    return (
      <WorldLine3DView<TWorldState>
        renderWorldState={renderWorldState}
        onCloseWorldLineView={closeModal}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
      {!isInitialized && (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <WorldInitializeButton 
            onInitialize={initialize}
            disabled={isInitializing}
          />
        </div>
      )}

      {isInitialized && apexWorld && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginTop: '1rem' }}>
              {renderWorldState(apexWorld.worldState, grow)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
