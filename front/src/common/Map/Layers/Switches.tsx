import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { Source, Layer, LayerProps } from 'react-map-gl';
import { MAP_URL } from 'common/Map/const';

import { Theme } from '../../../types';

export function getSwitchesLayerProps(params: { colors: Theme; sourceTable?: string }): LayerProps {
  const res: LayerProps = {
    type: 'circle',
    paint: {
      'circle-stroke-color': params.colors.switches.circle,
      'circle-stroke-width': 2,
      'circle-color': 'rgba(255, 255, 255, 0)',
      'circle-radius': 3,
    },
  };

  if (typeof params.sourceTable === 'string') res['source-layer'] = params.sourceTable;
  return res;
}

export function getSwitchesNameLayerProps(params: {
  colors: Theme;
  sourceTable?: string;
}): LayerProps {
  const res: LayerProps = {
    type: 'symbol',
    layout: {
      'text-field': '{label}',
      'text-font': ['Roboto Condensed'],
      'text-size': 12,
      'text-anchor': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.75, 0.1],
      visibility: 'visible',
    },
    paint: {
      'text-color': params.colors.switches.text,
      'text-halo-width': 2,
      'text-halo-color': params.colors.switches.halo,
      'text-halo-blur': 1,
    },
  };

  if (typeof params.sourceTable === 'string') res['source-layer'] = params.sourceTable;
  return res;
}

const Switches: FC<{ geomType: string; colors: Theme }> = (props) => {
  const { layersSettings } = useSelector(
    (state: { map: { layersSettings: { switches?: boolean } } }) => state.map
  );
  const { infraID } = useSelector((state: { osrdconf: { infraID: string } }) => state.osrdconf);
  const { geomType, colors } = props;

  const layerPoint: LayerProps = getSwitchesLayerProps({ colors, sourceTable: 'switches' });
  const layerName: LayerProps = getSwitchesNameLayerProps({ colors, sourceTable: 'switches' });

  return layersSettings.switches ? (
    <Source
      id={`osrd_switches_${geomType}`}
      type="vector"
      url={`${MAP_URL}/layer/switches/mvt/${geomType}/?infra=${infraID}`}
    >
      <Layer {...layerPoint} id={`chartis/osrd_switches/${geomType}`} />
      <Layer {...layerName} id={`chartis/osrd_switches_name/${geomType}`} />
    </Source>
  ) : null;
};

export default Switches;
