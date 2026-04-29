import parksData from "../../data/parks.json";
import parksGeoJsonRaw from "../../../data/geojson/parks.geojson?raw";

export type ParkMapFeature = {
  id: string;
  name: string;
  totalWords: number;
  distinctWords?: number;
  categoryWeights: Record<string, number>;
  coordinates: [number, number];
};

type LngLat = [number, number];

type GeoJsonFeature = {
  properties?: {
    name?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

type GeoJsonFeatureCollection = {
  features?: GeoJsonFeature[];
};

const GEOJSON_NAME_TO_PARK_ID: Record<string, string> = {
  "Parco Civico Villa Ciani": "ciani",
  "Parco del Tassino": "tassino",
  "Parco San Michele": "san-michele",
  "Parco Paradiso": "paradiso",
  "Parco Lambertenghi": "lambertenghi",
};

// Fallbacks stay isolated here in case a future GeoJSON file is missing one
// of the five Act I parks.
const FALLBACK_COORDINATES: Record<string, [number, number]> = {
  ciani: [8.9588, 46.0062],
  tassino: [8.9436, 46.0041],
  "san-michele": [8.9722, 46.0038],
  paradiso: [8.9466, 45.9898],
  lambertenghi: [8.9492, 46.0124],
};

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function collectLngLats(value: unknown, points: LngLat[] = []): LngLat[] {
  if (isLngLat(value)) {
    points.push([value[0], value[1]]);
    return points;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLngLats(item, points));
  }

  return points;
}

function centroidFromCoordinates(coordinates: unknown): LngLat | undefined {
  const points = collectLngLats(coordinates);
  if (!points.length) return undefined;

  const total = points.reduce(
    (sum, point) => ({
      lng: sum.lng + point[0],
      lat: sum.lat + point[1],
    }),
    { lng: 0, lat: 0 },
  );

  return [total.lng / points.length, total.lat / points.length];
}

function polygonCentroidFromRing(ring: unknown): {
  area: number;
  coordinates: LngLat;
} | undefined {
  const points = collectLngLats(ring);
  if (points.length < 3) return undefined;

  let twiceArea = 0;
  let lng = 0;
  let lat = 0;

  points.forEach((point, index) => {
    const previous = points[index === 0 ? points.length - 1 : index - 1];
    const cross = previous[0] * point[1] - point[0] * previous[1];
    twiceArea += cross;
    lng += (previous[0] + point[0]) * cross;
    lat += (previous[1] + point[1]) * cross;
  });

  if (Math.abs(twiceArea) < 1e-12) return undefined;

  return {
    area: Math.abs(twiceArea / 2),
    coordinates: [lng / (3 * twiceArea), lat / (3 * twiceArea)],
  };
}

function polygonCentroid(coordinates: unknown): {
  area: number;
  coordinates: LngLat;
} | undefined {
  if (!Array.isArray(coordinates) || !coordinates.length) return undefined;
  return polygonCentroidFromRing(coordinates[0]);
}

function multiPolygonCentroid(coordinates: unknown): LngLat | undefined {
  if (!Array.isArray(coordinates)) return undefined;

  const centroids = coordinates
    .map((polygon) => polygonCentroid(polygon))
    .filter((centroid): centroid is { area: number; coordinates: LngLat } =>
      Boolean(centroid),
    );

  const totalArea = centroids.reduce((sum, centroid) => sum + centroid.area, 0);
  if (!totalArea) return undefined;

  const weighted = centroids.reduce(
    (sum, centroid) => ({
      lng: sum.lng + centroid.coordinates[0] * centroid.area,
      lat: sum.lat + centroid.coordinates[1] * centroid.area,
    }),
    { lng: 0, lat: 0 },
  );

  return [weighted.lng / totalArea, weighted.lat / totalArea];
}

function coordinatesFromFeature(feature: GeoJsonFeature): LngLat | undefined {
  if (!feature.geometry?.coordinates) return undefined;
  if (
    feature.geometry.type === "Point" &&
    isLngLat(feature.geometry.coordinates)
  ) {
    return feature.geometry.coordinates;
  }

  if (feature.geometry.type === "Polygon") {
    return polygonCentroid(feature.geometry.coordinates)?.coordinates;
  }

  if (feature.geometry.type === "MultiPolygon") {
    return multiPolygonCentroid(feature.geometry.coordinates);
  }

  return centroidFromCoordinates(feature.geometry.coordinates);
}

function readGeoJsonCoordinates(): Record<string, LngLat> {
  const geoJson = JSON.parse(parksGeoJsonRaw) as GeoJsonFeatureCollection;

  return Object.fromEntries(
    (geoJson.features ?? [])
      .map((feature) => {
        const name = feature.properties?.name;
        const id = name ? GEOJSON_NAME_TO_PARK_ID[name] : undefined;
        const coordinates = coordinatesFromFeature(feature);
        return id && coordinates ? ([id, coordinates] as const) : undefined;
      })
      .filter((entry): entry is readonly [string, LngLat] => Boolean(entry)),
  );
}

const GEOJSON_COORDINATES = readGeoJsonCoordinates();

export function getParkMapFeatures(): ParkMapFeature[] {
  return parksData.parks.map((park) => {
    const coordinates = GEOJSON_COORDINATES[park.id] ?? FALLBACK_COORDINATES[park.id];
    if (!coordinates) {
      throw new Error(`Missing map coordinates for park id "${park.id}"`);
    }

    return {
      id: park.id,
      name: park.name,
      totalWords: park.totalWords,
      distinctWords: park.distinctWords,
      categoryWeights: park.categoryWeights,
      coordinates,
    };
  });
}
