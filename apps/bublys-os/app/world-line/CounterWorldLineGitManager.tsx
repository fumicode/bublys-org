'use client';
import React from 'react';
import { WorldLineGitManager } from './WorldLineGit/feature/WorldLineGitManager';
import { 
  CounterWorldState, 
  serializeCounterWorldState, 
  deserializeCounterWorldState,
  createInitialCounterWorldState
} from './Counter/feature/CounterManager';

/**
 * CounterとWorldLineGitを統合するマネージャーコンポーネント
 * WorldLineGitManagerに具体的な型（CounterWorldState）を適用
 */
interface CounterWorldLineGitManagerProps {
  children: React.ReactNode;
}

export function CounterWorldLineGitManager({ children }: CounterWorldLineGitManagerProps) {
  return (
    <WorldLineGitManager<CounterWorldState>
      serialize={serializeCounterWorldState}
      deserialize={deserializeCounterWorldState}
      createInitialWorldState={createInitialCounterWorldState}
    >
      {children}
    </WorldLineGitManager>
  );
}

