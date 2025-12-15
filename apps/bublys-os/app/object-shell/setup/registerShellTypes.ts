/**
 * registerShellTypes
 * アプリケーション起動時に全てのShell型を登録
 */

import { shellTypeRegistry } from '../feature/ShellTypeRegistry';
import { Counter } from '../../world-line/Counter/domain/Counter';
import { CounterShellRenderer } from '../renderers/CounterShellRenderer';
import { CounterShell } from '../shells/CounterShell';

export function registerShellTypes() {
  // Counter型の登録
  shellTypeRegistry.register<Counter>({
    typeName: 'counter',
    ShellClass: CounterShell,  // Shell クラスを追加
    serializer: (c) => c.toJson(),
    deserializer: Counter.fromJson,
    Renderer: CounterShellRenderer,
  });

  console.log('[Shell Types] Registered:', shellTypeRegistry.getAllTypeNames());
}
