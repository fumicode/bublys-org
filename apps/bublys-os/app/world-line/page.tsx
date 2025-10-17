'use client';
import { WorldLineManager } from './WorldLine/feature/WorldLineManager';
import { WorldLineView } from './WorldLine/ui/WorldLineView';

export default function Index() {
  return (
    <WorldLineManager>
      <WorldLineView />
    </WorldLineManager>
  );
}