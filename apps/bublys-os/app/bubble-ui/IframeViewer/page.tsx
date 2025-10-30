'use client';

import { IframeViewerProviders } from './providers';
import IframeViewerContent from './IframeViewerContent';

export default function IframeViewerPage() {
  return (
    <IframeViewerProviders>
      <IframeViewerContent />
    </IframeViewerProviders>
  );
}