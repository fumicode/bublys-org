'use client';
import { BublyWorldLineIntegration } from './integrations/BublyWorldLineIntegration';
import { BublyWorldLineManager } from './integrations/BublyWorldLineManager';

export default function Index() {
  return (
    <div style={{ flex: '1', minWidth: '600px' }}>
      <BublyWorldLineManager worldId="bubly-world-1">
        <BublyWorldLineIntegration />
      </BublyWorldLineManager>
    </div>
  );
}
