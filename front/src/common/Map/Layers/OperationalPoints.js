import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Source, Layer } from 'react-map-gl';
import { MAP_URL } from 'common/Map/const';

export default function OperationalPoints(props) {
  const { layersSettings } = useSelector((state) => state.map);
  const { infraID } = useSelector((state) => state.osrdconf);
  const { geomType, colors } = props;
  const layerPoint = {
    type: 'circle',
    'source-layer': 'operational_points',
    paint: {
      'circle-stroke-color': '#82be00',
      'circle-stroke-width': 2,
      'circle-color': 'rgba(255, 255, 255, 0)',
      'circle-radius': 3,
    },
  };

  const layerName = {
    type: 'symbol',
    'source-layer': 'operational_points',
    minzoom: 9,
    layout: {
      'text-field': [
        'concat',
        ['get', 'name'],
        ' / ',
        ['get', 'trigram'],
        [
          'case',
          ['in', ['get', 'ch'], ['literal', ['BV', '00']]],
          '',
          ['concat', '\n', ['get', 'ch_long_label']],
        ],
        // ['concat', '\n', ['get', 'uic']],
      ],
      'text-font': ['Roboto Condensed'],
      'text-size': 12,
      'text-anchor': 'left',
      'text-justify': 'left',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-offset': [0.75, 0.1],
      visibility: 'visible',
    },
    paint: {
      'text-color': colors.op.text,
      'text-halo-width': 2,
      'text-halo-color': colors.op.halo,
      'text-halo-blur': 1,
    },
  };

  const layerNameShort = {
    type: 'symbol',
    'source-layer': 'operational_points',
    maxzoom: 9,
    minzoom: 7,
    layout: {
      'text-field': [
        'concat',
        ['get', 'trigram'],
        ' ',
        ['case', ['in', ['get', 'ch'], ['literal', ['BV', '00']]], '', ['get', 'ch']],
      ],
      'text-font': ['Roboto Condensed'],
      'text-size': 10,
      'text-anchor': 'left',
      'text-allow-overlap': true,
      'text-ignore-placement': false,
      'text-offset': [0.75, 0.1],
      visibility: 'visible',
    },
    paint: {
      'text-color': colors.op.text,
      'text-halo-width': 2,
      'text-halo-color': colors.op.halo,
      'text-halo-blur': 1,
    },
  };

  return (
    layersSettings.operationalpoints && (
      <Source
        id={`osrd_operational_point_${geomType}`}
        type="vector"
        url={`${MAP_URL}/layer/operational_points/mvt/${geomType}/?infra=${infraID}`}
      >
        <Layer {...layerPoint} id={`chartis/osrd_operational_point/${geomType}`} />
        <Layer {...layerNameShort} id={`chartis/osrd_operational_point_name_short/${geomType}`} />
        <Layer {...layerName} id={`chartis/osrd_operational_point_name/${geomType}`} />
      </Source>
    )
  );
}

OperationalPoints.propTypes = {
  geomType: PropTypes.string.isRequired,
  colors: PropTypes.object.isRequired,
};
