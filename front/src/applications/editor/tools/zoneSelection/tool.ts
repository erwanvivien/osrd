import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLeftCircle,
  BiSelection,
  FaDrawPolygon,
  MdPhotoSizeSelectSmall,
  TiTimesOutline,
} from 'react-icons/all';
import { MapEvent } from 'react-map-gl';
import { isEqual } from 'lodash';

import { DEFAULT_COMMON_TOOL_STATE, Tool } from '../types';
import { selectZone } from '../../../../reducers/editor';
import { ZoneSelectionState } from './types';
import { ZoneSelectionLayers } from './components';

const ZoneSelectionTool: Tool<ZoneSelectionState> = {
  // Zone selection:
  id: 'select-zone',
  icon: MdPhotoSizeSelectSmall,
  labelTranslationKey: 'Editor.tools.select-zone.label',
  getInitialState() {
    return {
      ...DEFAULT_COMMON_TOOL_STATE,
      zoneState: { type: 'rectangle', topLeft: null },
    };
  },
  actions: [
    [
      {
        id: 'select-zone-rectangle',
        icon: BiSelection,
        labelTranslationKey: 'Editor.tools.select-zone.actions.rectangle',
        isActive({ state }) {
          return state.zoneState.type === 'rectangle';
        },
        onClick({ setState, state }) {
          setState({
            ...state,
            zoneState: {
              type: 'rectangle',
              topLeft: null,
            },
          });
        },
      },
      {
        id: 'select-zone-polygon',
        icon: FaDrawPolygon,
        labelTranslationKey: 'Editor.tools.select-zone.actions.polygon',
        isActive({ state }) {
          return state.zoneState.type === 'polygon';
        },
        onClick({ setState, state }) {
          setState({
            ...state,
            zoneState: {
              type: 'polygon',
              points: [],
            },
          });
        },
      },
    ],
    [
      {
        id: 'unselect-zone',
        icon: TiTimesOutline,
        labelTranslationKey: 'Editor.tools.select-zone.actions.unselect',
        isDisabled({ editorState }) {
          return !editorState.editorZone;
        },
        onClick({ dispatch }) {
          dispatch<ReturnType<typeof selectZone>>(selectZone(null));
        },
      },
    ],
    [
      {
        id: 'validate-polygon',
        icon: AiOutlineCheckCircle,
        labelTranslationKey: 'Editor.tools.select-zone.actions.validate-polygon',
        onClick({ dispatch, setState, state }) {
          if (state.zoneState.type === 'polygon' && state.zoneState.points) {
            dispatch<ReturnType<typeof selectZone>>(
              selectZone({
                type: 'polygon',
                points: state.zoneState.points,
              })
            );
            setState({
              ...state,
              zoneState: {
                ...state.zoneState,
                points: [],
              },
            });
          }
        },
        isDisabled({ state }) {
          return (
            state.zoneState.type === 'polygon' &&
            (!state.zoneState.points || state.zoneState.points.length < 2)
          );
        },
        isHidden({ state }) {
          return state.zoneState.type !== 'polygon';
        },
      },
      {
        id: 'cancel-last-point',
        icon: AiOutlineLeftCircle,
        labelTranslationKey: 'Editor.tools.select-zone.actions.cancel-last-point',
        onClick({ setState, state }) {
          if (state.zoneState.type === 'polygon' && state.zoneState.points) {
            setState({
              ...state,
              zoneState: {
                ...state.zoneState,
                points: state.zoneState.points.slice(0, -1),
              },
            });
          }
        },
        isDisabled({ state }) {
          return (
            state.zoneState.type === 'polygon' &&
            (!state.zoneState.points || !state.zoneState.points.length)
          );
        },
        isHidden({ state }) {
          return state.zoneState.type !== 'polygon';
        },
      },
      {
        id: 'cancel-polygon',
        icon: AiOutlineCloseCircle,
        labelTranslationKey: 'Editor.tools.select-zone.actions.cancel-polygon',
        onClick({ setState, state }) {
          if (state.zoneState.type === 'polygon' && state.zoneState.points) {
            setState({
              ...state,
              zoneState: {
                ...state.zoneState,
                points: [],
              },
            });
          }
        },
        isDisabled({ state }) {
          return (
            state.zoneState.type === 'polygon' &&
            (!state.zoneState.points || !state.zoneState.points.length)
          );
        },
        isHidden({ state }) {
          return state.zoneState.type !== 'polygon';
        },
      },
    ],
  ],

  // Interactions:
  onClickMap(e: MapEvent, { setState, dispatch, state }) {
    const position = e.lngLat;

    if (state.zoneState.type === 'rectangle') {
      if (state.zoneState.topLeft) {
        if (isEqual(state.zoneState.topLeft, position)) {
          setState({ ...state, zoneState: { ...state.zoneState, topLeft: null } });
        } else {
          dispatch<ReturnType<typeof selectZone>>(
            selectZone({
              type: 'rectangle',
              points: [state.zoneState.topLeft, position],
            })
          );
          setState({ ...state, zoneState: { ...state.zoneState, topLeft: null } });
        }
      } else {
        setState({
          ...state,
          zoneState: { ...state.zoneState, topLeft: position },
        });
      }
    } else if (state.zoneState.type === 'polygon') {
      const { points } = state.zoneState;
      const lastPoint = points[points.length - 1];

      if (isEqual(lastPoint, position)) {
        if (points.length >= 3) {
          dispatch<ReturnType<typeof selectZone>>(
            selectZone({
              type: 'polygon',
              points,
            })
          );
          setState({ ...state, zoneState: { ...state.zoneState, points: [] } });
        }
      } else {
        setState({
          ...state,
          zoneState: { ...state.zoneState, points: points.concat([position]) },
        });
      }
    }
  },
  onHover() {
    // Nothing here (to prevent the default Map to update the `hovered` state for no purpose)
  },

  getCursor(_context, { isDragging }) {
    if (isDragging) return 'move';
    return 'crosshair';
  },
  getInteractiveLayers() {
    return [];
  },

  layersComponent: ZoneSelectionLayers,
};

export default ZoneSelectionTool;
