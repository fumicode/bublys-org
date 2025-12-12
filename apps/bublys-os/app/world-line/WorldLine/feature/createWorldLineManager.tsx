'use client';
import React from 'react';
import { WorldLineManager } from './WorldLineManager';

type BaseWorldLineConfig<TWorldState> = {
  serialize: (state: TWorldState) => any;
  deserialize: (data: any) => TWorldState;
  createInitialWorldState: () => TWorldState;
};

type WorldLineManagerWrapperProps = {
  children: React.ReactNode;
  objectId: string;
  createInitialWorldState?: () => any;
};

/**
 * WorldLineManager の薄いラッパーを動的に生成するヘルパー
 * serialize/deserialize/初期化処理を共有しつつ、objectId は呼び出し側のpropsで差し替え可能にする
 */
export function createWorldLineManager<TWorldState>(
  config: BaseWorldLineConfig<TWorldState>
) {
  return function WorldLineManagerWrapper({
    children,
    objectId,
    createInitialWorldState,
  }: WorldLineManagerWrapperProps) {
    return (
      <WorldLineManager<TWorldState>
        objectId={objectId}
        serialize={config.serialize}
        deserialize={config.deserialize}
        createInitialWorldState={createInitialWorldState || config.createInitialWorldState}
      >
        {children}
      </WorldLineManager>
    );
  };
}

