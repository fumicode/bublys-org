import { injectSlice, injectMiddleware } from '@bublys-org/state-management';
import { worldLineGraphSlice } from './worldLineGraphSlice';
import { worldLineGraphListenerMiddleware } from './worldLineGraphListener';

export function initWorldLineGraph(): void {
  injectSlice(worldLineGraphSlice);
  injectMiddleware(worldLineGraphListenerMiddleware.middleware);
}
