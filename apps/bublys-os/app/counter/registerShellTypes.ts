/**
 * registerShellTypes
 * アプリケーション起動時に全てのShell型を登録
 */

import { shellTypeRegistry } from '@bublys-org/object-shell';
import { Counter } from './Counter';
import { CounterShellRenderer } from './CounterShellRenderer';
import { CounterShell } from './CounterShell';

export function registerShellTypes() {
  // Counter型の登録
  shellTypeRegistry.register<Counter>({
    typeName: 'counter',
    ShellClass: CounterShell,
    serializer: (c) => c.toJson(),
    deserializer: Counter.fromJson,
    Renderer: CounterShellRenderer,
  });

  console.log('[Shell Types] Registered:', shellTypeRegistry.getAllTypeNames());
}
