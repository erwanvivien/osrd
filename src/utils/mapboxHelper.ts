import bboxClip from '@turf/bbox-clip';
import { flatten } from 'lodash';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';

/* Types */
import { MapController } from 'react-map-gl';
import { MjolnirEvent } from 'react-map-gl/dist/es5/utils/map-controller';
import { BBox } from '@turf/helpers';
import {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  MultiPoint,
  Position,
  Polygon,
  GeoJSON,
} from 'geojson';
import { Item, Zone } from '../types';
import bbox from '@turf/bbox';

/**
 * This class allows binding keyboard events to react-map-gl. Since those events are not supported
 * by the lib, you can instantiate this KeyDownMapController and give it to your ReactMapGL
 * component as the `controller` prop, and keep its handler function up to date with an effect.
 */
type MjolnirHandler = (event: MjolnirEvent) => boolean;
export class KeyDownMapController extends MapController {
  handler: MjolnirHandler | undefined;

  constructor(handler: MjolnirHandler) {
    super();
    this.setHandler(handler);
  }

  setHandler(handler: MjolnirHandler) {
    this.handler = handler;
  }

  handleEvent(event: MjolnirEvent): boolean {
    if (this.handler && event.type === 'keydown') {
      this.handler(event);
    }

    return super.handleEvent(event);
  }
}

/**
 * This helper takes a Feature *or* a FeatureCollection and a bounding zone, and returns the input
 * Feature or FeatureCollection, but clipped inside the bounding zone. It filters out Points and
 * MultiPoints, and clips LineStrings and MultiLineStrings using @turf/bboxClip (when possible).
 */
export function clip<T extends Feature | FeatureCollection>(tree: T, zone: Zone): T | null {
  if (tree.type === 'FeatureCollection') {
    return {
      ...tree,
      features: (tree as FeatureCollection).features.flatMap((f) => {
        const res = clip(f, zone);
        if (!res) return [];
        return [res];
      }),
    };
  }

  if (tree.type === 'Feature') {
    const feature = tree as Feature;

    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      // TODO
      // Find how to clip lines / multilines to a polygon
      if (zone.type !== 'rectangle') return feature as T;

      const clipped = bboxClip(
        feature as Feature<LineString | MultiLineString>,
        zoneToBBox(zone)
      ) as Feature<LineString | MultiLineString>;
      return clipped.geometry.coordinates.length ? (clipped as T) : null;
    }

    const polygon = zoneToFeature(zone, true).geometry as Polygon;

    if (feature.geometry.type === 'Point') {
      return booleanPointInPolygon((feature as Feature<Point>).geometry.coordinates, polygon)
        ? tree
        : null;
    }

    if (feature.geometry.type === 'MultiPoint') {
      const res: Feature<MultiPoint> = {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: feature.geometry.coordinates.filter((position) =>
            booleanPointInPolygon(position, polygon)
          ),
        },
      };

      return res.geometry.coordinates.length ? (res as T) : null;
    }
  }

  return tree;
}

/**
 * This helper takes a Feature or a FeatureCollection as input, and extracts all positions from each
 * LineString and MultiLineString in it, and return them as a Point Features array.
 */
export function extractPoints<T extends Feature | FeatureCollection>(tree: T): Feature<Point>[] {
  if (tree.type === 'FeatureCollection') {
    return (tree as FeatureCollection).features.flatMap((f) => extractPoints(f));
  }

  let positions: Position[] = [];
  let parentID: string = '';
  if (tree.type === 'Feature') {
    const feature = tree as Feature;

    if (feature.geometry.type === 'LineString') {
      parentID = feature.properties?.OP_id;
      positions = feature.geometry.coordinates;
    }

    if (feature.geometry.type === 'MultiLineString') {
      parentID = feature.properties?.OP_id;
      positions = flatten(feature.geometry.coordinates);
    }
  }

  return parentID
    ? positions.map((position, i) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: position,
        },
        properties: {
          index: i,
          lng: position[0],
          lat: position[1],
          parentID: parentID,
          OP_id: `${parentID}/${i}`,
        },
      }))
    : [];
}

/**
 * This helpers transforms a given Zone object to the related Feature object (mainly to use with
 * Turf).
 */
export function zoneToFeature(zone: Zone, close = false): Feature {
  switch (zone.type) {
    case 'rectangle': {
      const [[lat1, lon1], [lat2, lon2]] = zone.points;

      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lat1, lon1],
              [lat2, lon1],
              [lat2, lon2],
              [lat1, lon2],
              [lat1, lon1],
            ],
          ],
        },
      };
    }
    case 'polygon': {
      return {
        type: 'Feature',
        properties: {},
        geometry: close
          ? {
              type: 'Polygon',
              coordinates: [[...zone.points, zone.points[0]]],
            }
          : {
              type: 'LineString',
              coordinates: zone.points,
            },
      };
    }
  }
}

/**
 * Returns the BBox containing a given zone.
 */
export function zoneToBBox(zone: Zone): BBox {
  if (zone.type === 'rectangle') {
    const [[x1, y1], [x2, y2]] = zone.points;
    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
  }

  return bbox(zoneToFeature(zone, true));
}

/**
 * This helpers takes an array of GeoJSON objects (as the editor data we use) and a zone, and
 * returns a selection of all items in the given dataset intersecting with the given zone. If no
 * zone is given, selects everything instead.
 */
export function selectInZone(data: GeoJSON[], zone?: Zone): Item[] {
  const items: Item[] = [];
  const zoneFeature = zone && zoneToFeature(zone);

  data.forEach((geojson) => {
    if (geojson.type === 'FeatureCollection') {
      geojson.features.forEach((feature) => {
        if (!zoneFeature || booleanIntersects(feature, zoneFeature)) {
          items.push({ id: feature.properties?.OP_id, layer: feature.properties?.layer });
        }
      });
    } else if (geojson.type === 'Feature') {
      if (!zoneFeature || booleanIntersects(geojson, zoneFeature)) {
        items.push({ id: geojson.properties?.OP_id, layer: geojson.properties?.layer });
      }
    }
  });

  return items;
}

/**
 * Given a list of points (as [lng, lat] point coordinates), returns the proper GeoJSON object to
 * draw a line joining them
 */
export function getLineGeoJSON(points: Position[]): Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points,
    },
  };
}
