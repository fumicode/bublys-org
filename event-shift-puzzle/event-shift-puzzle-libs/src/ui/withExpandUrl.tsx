import { ReactNode } from 'react';
import { UrledPlace } from '@bublys-org/bubbles-ui';

/**
 * 「単独バブルとして開く」ボタンを URL で包む。
 *
 * ObjectView にするほどではない小さなアイコンボタン（↗）でも、開く先の URL を
 * data-url として置いておけば link bubble のリボンがそのボタンから伸びる。
 * url が無ければ何もしない。
 */
export const withExpandUrl = (url: string | undefined, node: ReactNode): ReactNode =>
  url ? <UrledPlace url={url}>{node}</UrledPlace> : node;
