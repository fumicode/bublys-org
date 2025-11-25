import { SmartRect } from '@bublys-org/bubbles-ui';

export type RectItem = {
  id: string;
  rect: SmartRect;
  label: string;
  color: string;
  showGrid?: boolean; // グリッドを表示するかどうか
};
