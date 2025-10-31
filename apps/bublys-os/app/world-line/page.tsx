'use client';
import { BublyWorldLineIntegration } from './integrations/BublyWorldLineIntegration';
import { BublyWorldLineManager } from './integrations/BublyWorldLineManager';
import { BublyAddButtons } from './integrations/BublyAddButtons';

export default function Index() {
  return (
    <div>
      <BublyWorldLineManager worldId="bubly-world-1">
        <BublyAddButtons />
        <BublyWorldLineIntegration />
      </BublyWorldLineManager>
    </div>
  );
}
