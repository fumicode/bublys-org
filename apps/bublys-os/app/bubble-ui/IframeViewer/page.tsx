'use client';

import { IframeViewerProviders } from './providers';
import IframeViewer from './IframeViewer';

export default function IframeViewerPage() {
  return (
    <IframeViewerProviders>
      <IframeViewer />
    </IframeViewerProviders>
  );
}
