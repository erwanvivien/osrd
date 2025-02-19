import { CommonToolState } from '../types';
import { EditorEntity } from '../../../../types';

export type SelectionState = CommonToolState & {
  selectionState:
    | { type: 'single' }
    | { type: 'polygon'; polygonPoints: [number, number][] }
    | { type: 'rectangle'; rectangleTopLeft: [number, number] | null }
    | { type: 'edition'; previousState?: SelectionState['selectionState'] };
  selection: EditorEntity[];
};
