import 'common/Map/Map.scss';

import React, { useCallback, useEffect, useState } from 'react';
import ReactMapGL, {
  AttributionControl,
  FlyToInterpolator,
  ScaleControl,
  WebMercatorViewport,
} from 'react-map-gl';
import {
  getDirection,
  interpolateOnPosition,
  interpolateOnTime,
} from 'applications/osrd/components/Helpers/ChartHelpers';
import { lineString, point } from '@turf/helpers';
import { useDispatch, useSelector } from 'react-redux';

/* Main data & layers */
import Background from 'common/Map/Layers/Background';
import BufferStops from 'common/Map/Layers/BufferStops.tsx';
/* Settings & Buttons */
import MapButtons from 'common/Map/Buttons/MapButtons';
import Detectors from 'common/Map/Layers/Detectors.tsx';
import Catenaries from 'common/Map/Layers/Catenaries';
import Hillshade from 'common/Map/Layers/Hillshade';
import OSM from 'common/Map/Layers/OSM';
import OperationalPoints from 'common/Map/Layers/OperationalPoints';
import Platform from 'common/Map/Layers/Platform';
import PropTypes from 'prop-types';
import RenderItinerary from 'applications/osrd/components/SimulationMap/RenderItinerary';
import Routes from 'common/Map/Layers/Routes';
import SearchMarker from 'common/Map/Layers/SearchMarker';
import SignalingType from 'common/Map/Layers/SignalingType';
import Signals from 'common/Map/Layers/Signals';
import SpeedLimits from 'common/Map/Layers/SpeedLimits';
import Switches from 'common/Map/Layers/Switches';
/* Objects & various */
import TVDs from 'common/Map/Layers/TVDs';
import TracksGeographic from 'common/Map/Layers/TracksGeographic';
import TracksOSM from 'common/Map/Layers/TracksOSM';
import TracksSchematic from 'common/Map/Layers/TracksSchematic';
/* Interactions */
import TrainHoverPosition from 'applications/osrd/components/SimulationMap/TrainHoverPosition';
import TrainHoverPositionOthers from 'applications/osrd/components/SimulationMap/TrainHoverPositionOthers';
import along from '@turf/along';
import bbox from '@turf/bbox';
import bearing from '@turf/bearing';
import colors from 'common/Map/Consts/colors.ts';
import { datetime2sec } from 'utils/timeManipulation';
import { get } from 'common/requests';
import lineLength from '@turf/length';
import lineSlice from '@turf/line-slice';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import osmBlankStyle from 'common/Map/Layers/osmBlankStyle';
import { updateTimePositionValues } from 'reducers/osrdsimulation';
import { updateViewport } from 'reducers/map';
import { useParams } from 'react-router-dom';

const PATHFINDING_URI = '/pathfinding/';
const INTERMEDIATE_MARKERS_QTY = 8;

function Map(props) {
  const { setExtViewport } = props;
  const { viewport, mapSearchMarker, mapStyle, mapTrackSources, showOSM, layersSettings, zoom } =
    useSelector((state) => state.map);
  const { isPlaying, selectedTrain, positionValues, timePosition, allowancesSettings } =
    useSelector((state) => state.osrdsimulation);
  const simulation = useSelector((state) => state.osrdsimulation.simulation.present);
  const [geojsonPath, setGeojsonPath] = useState(undefined);
  const [trainHoverPositionOthers, setTrainHoverPositionOthers] = useState(undefined);
  const [trainHoverPosition, setTrainHoverPosition] = useState(undefined);
  const [idHover, setIdHover] = useState(undefined);
  const { urlLat, urlLon, urlZoom, urlBearing, urlPitch } = useParams();
  const dispatch = useDispatch();
  const updateViewportChange = useCallback(
    (value) => dispatch(updateViewport(value, undefined)),
    [dispatch]
  );
  const mapRef = React.useRef();

  /**
   *
   * @param {int} trainId
   * @returns correct key (eco or base) to get positions in a train simulation
   */
  const getRegimeKey = (trainId) =>
    allowancesSettings && allowancesSettings[trainId]?.ecoBlocks ? 'eco' : 'base';

  const createOtherPoints = () => {
    const actualTime = datetime2sec(timePosition);
    // First find trains where actual time from position is between start & stop
    const concernedTrains = [];
    simulation.trains.forEach((train, idx) => {
      const key = getRegimeKey(train.id);
      if (
        actualTime >= train[key].head_positions[0][0].time &&
        actualTime <=
          train[key].head_positions[train[key].head_positions.length - 1][
            train[key].head_positions[train[key].head_positions.length - 1].length - 1
          ].time &&
        idx !== selectedTrain
      ) {
        const interpolation = interpolateOnTime(
          train[key],
          ['time', 'position'],
          ['head_positions', 'tail_positions', 'speeds'],
          actualTime
        );
        if (interpolation.head_positions && interpolation.speeds) {
          concernedTrains.push({
            ...interpolation,
            name: train.name,
            id: idx,
          });
        }
      }
    });
    return concernedTrains;
  };

  const getSimulationPositions = () => {
    const line = lineString(geojsonPath.geometry.coordinates);
    const id = simulation.trains[selectedTrain]?.id;
    const headKey =
      allowancesSettings && id && allowancesSettings[id]?.ecoBlocks
        ? 'eco_headPosition'
        : 'headPosition';
    const tailKey =
      allowancesSettings && id && allowancesSettings[id]?.ecoBlocks
        ? 'eco_tailPosition'
        : 'tailPosition';
    if (positionValues[headKey]) {
      const position = along(line, positionValues[headKey].position / 1000, {
        units: 'kilometers',
      });
      const tailPosition = positionValues[tailKey]
        ? along(line, positionValues[tailKey].position / 1000, { units: 'kilometers' })
        : position;

      const intermediaterMarkersPoints = [];

      // Representing the wagons is useless at outer zooms
      if (viewport?.zoom > 13) {
        // To do: get this data from rollingstock, stored
        const trainLength = positionValues[headKey].position - positionValues[tailKey].position;
        for (let i = 0; i < INTERMEDIATE_MARKERS_QTY; i++) {
          const intermediatePosition = along(
            line,
            (positionValues[headKey].position - (trainLength / INTERMEDIATE_MARKERS_QTY) * i) /
              1000,
            { units: 'kilometers' }
          );
          intermediaterMarkersPoints.push(intermediatePosition);
        }
        intermediaterMarkersPoints.push(tailPosition);
      }

      setTrainHoverPosition({
        ...position,
        properties: {
          speedTime: positionValues.speed,
          intermediaterMarkersPoints,
        },
      });
    }

    // Found trains including timePosition, and organize them with geojson collection of points
    setTrainHoverPositionOthers(
      createOtherPoints().map((train) => {
        const position = along(line, train.head_positions.position / 1000, { units: 'kilometers' });
        const tailPosition = train.tail_position
          ? along(line, train.tail_position.position / 1000, { units: 'kilometers' })
          : position;

        const intermediaterMarkersPoints = [];
        // Representing the wagons is useless at outer zooms
        if (viewport?.zoom > 13) {
          // To do: get this data from rollingstock, stored
          const trainLength = train.head_positions.position - train.tail_positions.position;
          for (let i = 0; i < INTERMEDIATE_MARKERS_QTY; i++) {
            const intermediatePosition = along(
              line,
              (train.head_positions.position - (trainLength / INTERMEDIATE_MARKERS_QTY) * i) / 1000,
              { units: 'kilometers' }
            );
            intermediaterMarkersPoints.push(intermediatePosition);
          }
          intermediaterMarkersPoints.push(tailPosition);
        }

        return {
          ...position,
          properties: {
            speed: train.speeds.speed,
            intermediaterMarkersPoints,
          },
        };
      })
    );
  };

  const zoomToFeature = (boundingBox) => {
    const [minLng, minLat, maxLng, maxLat] = boundingBox;
    const viewportTemp = new WebMercatorViewport({ ...viewport, width: 600, height: 400 });
    const { longitude, latitude, zoom } = viewportTemp.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 40 }
    );
    setExtViewport({
      ...viewport,
      longitude,
      latitude,
      zoom,
    });
  };

  const getGeoJSONPath = async (pathID) => {
    try {
      const path = await get(`${PATHFINDING_URI}${pathID}/`);
      const features = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: path.geographic.coordinates,
        },
        properties: {},
      };
      setGeojsonPath(features);
      zoomToFeature(bbox(features));
    } catch (e) {
      console.log('ERROR', e);
    }
  };

  const scaleControlStyle = {
    left: 20,
    bottom: 20,
  };

  const resetPitchBearing = () => {
    updateViewportChange({
      ...viewport,
      bearing: parseFloat(0),
      pitch: parseFloat(0),
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    });
  };

  const onFeatureHover = (e) => {
    if (!isPlaying && e) {
      const line = lineString(geojsonPath.geometry.coordinates);
      const cursorPoint = point(e.lngLat);
      const key = getRegimeKey(simulation.trains[selectedTrain].id);
      const startCoordinates = getDirection(simulation.trains[selectedTrain][key].head_positions)
        ? [geojsonPath.geometry.coordinates[0][0], geojsonPath.geometry.coordinates[0][1]]
        : [
            geojsonPath.geometry.coordinates[geojsonPath.geometry.coordinates.length - 1][0],
            geojsonPath.geometry.coordinates[geojsonPath.geometry.coordinates.length - 1][1],
          ];
      const start = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: startCoordinates,
        },
      };
      const sliced = lineSlice(start, cursorPoint, line);
      const positionLocal = lineLength(sliced, { units: 'kilometers' }) * 1000;
      const timePositionLocal = interpolateOnPosition(
        { speed: simulation.trains[selectedTrain][key].speeds },
        ['position', 'speed'],
        positionLocal
      );
      dispatch(updateTimePositionValues(timePositionLocal));
    }
    if (e.features[0]) {
      setIdHover(e.features[0].properties.id);
    } else {
      setIdHover(undefined);
    }
  };

  const onClick = (e) => {
    console.log('Click on map');
    console.log(mapRef.current.queryRenderedFeatures(e.point));
  };

  const displayPath = () => {
    if (simulation.trains.length > 0) {
      getGeoJSONPath(simulation.trains[selectedTrain].path);
    }
  };

  const defineInteractiveLayers = () => {
    const interactiveLayersLocal = [];
    if (geojsonPath) {
      interactiveLayersLocal.push('geojsonPath');
    }
    if (layersSettings.tvds) {
      interactiveLayersLocal.push('chartis/osrd_tvd_section/geo');
    }
    return interactiveLayersLocal;
  };

  useEffect(() => {
    mapRef.current.getMap().on('click', (e) => {});

    if (urlLat) {
      updateViewportChange({
        ...viewport,
        latitude: parseFloat(urlLat),
        longitude: parseFloat(urlLon),
        zoom: parseFloat(urlZoom),
        bearing: parseFloat(urlBearing),
        pitch: parseFloat(urlPitch),
      });
    }
  }, []);

  useEffect(() => {
    displayPath();
  }, [selectedTrain]);

  useEffect(() => {
    if (timePosition && geojsonPath) {
      getSimulationPositions();
    }
  }, [timePosition]);

  return (
    <>
      <MapButtons resetPitchBearing={resetPitchBearing} />
      <ReactMapGL
        {...viewport}
        style={{ cursor: 'pointer' }}
        ref={mapRef}
        width="100%"
        height="100%"
        mapStyle={osmBlankStyle}
        onViewportChange={updateViewportChange}
        clickRadius={10}
        attributionControl={false} // Defined below
        onHover={onFeatureHover}
        onClick={onClick}
        interactiveLayerIds={defineInteractiveLayers()}
        touchRotate
        asyncRender
      >
        <AttributionControl
          className="attribution-control"
          customAttribution="©SNCF/DGEX Solutions"
        />
        <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />

        <Background colors={colors[mapStyle]} />

        {!showOSM ? null : (
          <>
            <OSM mapStyle={mapStyle} />
            <Hillshade mapStyle={mapStyle} />
          </>
        )}

        {/* Have to  duplicate objects with sourceLayer to avoid cache problems in mapbox */}
        {mapTrackSources === 'geographic' ? (
          <>
            <Catenaries geomType="geo" colors={colors[mapStyle]} />
            <TVDs geomType="geo" colors={colors[mapStyle]} idHover={idHover} />
            <Platform colors={colors[mapStyle]} />
            <TracksGeographic colors={colors[mapStyle]} />
            <TracksOSM colors={colors[mapStyle]} />
            <OperationalPoints geomType="geo" colors={colors[mapStyle]} />
            <SignalingType geomType="geo" />
            <Routes geomType="geo" colors={colors[mapStyle]} />
            <SpeedLimits geomType="geo" colors={colors[mapStyle]} />
            <Signals
              mapRef={mapRef}
              sourceTable="signals"
              colors={colors[mapStyle]}
              sourceLayer="geo"
            />
            <BufferStops geomType="geo" colors={colors[mapStyle]} />
            <Detectors geomType="geo" colors={colors[mapStyle]} />
            <Switches geomType="geo" colors={colors[mapStyle]} />
          </>
        ) : (
          <>
            <TracksSchematic colors={colors[mapStyle]} idHover={idHover} />
            <OperationalPoints geomType="sch" colors={colors[mapStyle]} />
            <Routes geomType="sch" colors={colors[mapStyle]} />
            <Signals
              mapRef={mapRef}
              sourceTable="signals"
              colors={colors[mapStyle]}
              sourceLayer="sch"
            />
            <SpeedLimits geomType="sch" colors={colors[mapStyle]} />
            <BufferStops geomType="sch" colors={colors[mapStyle]} />
            <Detectors geomType="sch" colors={colors[mapStyle]} />
            <Switches geomType="sch" colors={colors[mapStyle]} />
          </>
        )}

        {mapSearchMarker !== undefined ? (
          <SearchMarker data={mapSearchMarker} colors={colors[mapStyle]} />
        ) : null}

        {geojsonPath !== undefined ? <RenderItinerary geojsonPath={geojsonPath} /> : null}

        {trainHoverPosition !== undefined ? (
          <TrainHoverPosition point={trainHoverPosition} />
        ) : null}
        {trainHoverPositionOthers !== undefined ? (
          <TrainHoverPositionOthers trainHoverPositionOthers={trainHoverPositionOthers} />
        ) : null}
      </ReactMapGL>
    </>
  );
}

Map.propTypes = {
  setExtViewport: PropTypes.func.isRequired,
};

export default Map;
