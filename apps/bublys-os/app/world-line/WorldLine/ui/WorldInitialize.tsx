export function WorldInitializeButton({ onInitialize, disabled = false }: { onInitialize: () => void; disabled?: boolean }) {
    return (
      <button
        onClick={onInitialize}
        disabled={disabled}
        style={{
          cursor: 'pointer',
          backgroundColor: 'transparent',
          width: '100px',
        }}
      >
        {disabled ? '初期化中...' : '🚀 初期化'}
      </button>
    );
}