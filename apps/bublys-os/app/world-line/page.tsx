'use client';
import { WorldLineGitManager } from './WorldLineGit/feature/WorldLineGitManager';
import { WorldLineGitView } from './WorldLineGit/ui/WorldLineGitView';

export default function Index() {
  return (
    <WorldLineGitManager>
      <WorldLineGitView />
    </WorldLineGitManager>
  );
}