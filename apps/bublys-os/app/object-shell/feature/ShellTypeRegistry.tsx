/**
 * ShellTypeRegistry
 * ObjectShellの型ごとにシリアライザー/デシリアライザー/レンダラーを登録・管理
 */

import { FC } from 'react';
import { ObjectShell } from '../domain';

export interface ShellTypeConfig<T> {
  typeName: string;
  serializer: (obj: T) => any;
  deserializer: (data: any) => T;
  Renderer: FC<{ shell: ObjectShell<T> }>;
}

class ShellTypeRegistry {
  private types = new Map<string, ShellTypeConfig<any>>();

  register<T>(config: ShellTypeConfig<T>) {
    this.types.set(config.typeName, config);
  }

  get(typeName: string): ShellTypeConfig<any> | undefined {
    return this.types.get(typeName);
  }

  getRenderer(typeName: string): FC<{ shell: ObjectShell<any> }> {
    const config = this.get(typeName);
    if (!config) {
      throw new Error(`Unknown shell type: ${typeName}`);
    }
    return config.Renderer;
  }

  serialize<T>(typeName: string, obj: T): any {
    const config = this.get(typeName);
    if (!config) {
      throw new Error(`Unknown shell type: ${typeName}`);
    }
    return config.serializer(obj);
  }

  deserialize<T>(typeName: string, data: any): T {
    const config = this.get(typeName);
    if (!config) {
      throw new Error(`Unknown shell type: ${typeName}`);
    }
    return config.deserializer(data);
  }

  hasType(typeName: string): boolean {
    return this.types.has(typeName);
  }

  getAllTypeNames(): string[] {
    return Array.from(this.types.keys());
  }
}

export const shellTypeRegistry = new ShellTypeRegistry();
