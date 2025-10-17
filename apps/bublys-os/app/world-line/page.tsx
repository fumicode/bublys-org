'use client';
import { CounterWorldLineGitManager } from './CounterWorldLineGitManager';
import { WorldLineGitView } from './WorldLineGit/ui/WorldLineGitView';

export default function Index() {
  return (
    <CounterWorldLineGitManager>
      <WorldLineGitView />
    </CounterWorldLineGitManager>
  );
}