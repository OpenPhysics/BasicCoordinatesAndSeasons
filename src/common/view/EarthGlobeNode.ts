/**
 * EarthGlobeNode.ts
 *
 * A small filled Earth globe at the centre of the celestial sphere, with its
 * polar axis aligned to the celestial poles. The globe spins with sidereal time
 * and carries an observer marker at the current latitude/longitude-of-date, so
 * you can see where on Earth the observer stands. Because the globe is opaque,
 * only the near-side (front) grid lines are drawn over it.
 */

import { Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, type ProfileColorProperty, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import type { EarthMapResolution } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type EarthShorePoint, getEarthShorePolygons } from "../model/EarthShoreData.js";
import { HOURS_PER_DAY, raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import {
  addFrontHemispherePolyline,
  addFrontHemisphereSmoothPolyline,
  addFrontHemisphereSphericalPolygon,
  smallCirclePoints,
} from "./skyGraphics.js";

const NCP = new Vector3(0, 0, 1);
const DEFAULT_GLOBE_SCALE = 0.28; // fraction of the celestial-sphere radius

// Graticule spacing. Meridians are great circles
const GLOBE_LONGITUDES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]; // degrees, spaced 30°
const GLOBE_LATITUDES = [-60, -30, 30, 60]; // degrees (equator drawn separately)
// Angular step for sampling meridians/parallels; small enough that the projected
// curve stays smooth after the quadratic smoothing pass.
const GLOBE_CURVE_STEP_DEG = 5;

/**
 * Full great-circle meridian (pole-to-pole) at the given longitude, sampled at a
 * fine declination step so the projected arc stays smooth. `raOffsetHours` shifts
 * the meridian in RA (longitude-of-date), accounting for sidereal time.
 */
const meridianPoints = (raOffsetHours: number, longitudeDeg: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let dec = -90; dec <= 90; dec += GLOBE_CURVE_STEP_DEG) {
    points.push(raDecToVector3(raOffsetHours + (longitudeDeg / 360) * HOURS_PER_DAY, dec));
  }
  return points;
};

/** A named point (city) on the globe, in decimal degrees (+N, +E). */
export type GlobeGeoPoint = { readonly name: string; readonly latitude: number; readonly longitude: number };

/** A date-line-style vertex on the globe, in decimal degrees (+N, +E). */
export type GlobeGeoVertex = { readonly latitude: number; readonly longitude: number };

/**
 * Optional geographically-anchored overlays drawn on the globe (Terrestrial screen):
 * reference cities and the "map features" (constant-latitude reference circles plus
 * the International Date Line). Front-hemisphere culled and toggled by the shared
 * model Properties, mirroring the flat map.
 */
export type GlobeOverlays = {
  readonly cities: readonly GlobeGeoPoint[];
  readonly dateLine: readonly GlobeGeoVertex[];
  /** Latitudes (°) of the reference small-circles, e.g. the tropics and polar circles. */
  readonly referenceCircleLatitudes: readonly number[];
  readonly showCitiesProperty: TReadOnlyProperty<boolean>;
  readonly mapFeaturesVisibleProperty: TReadOnlyProperty<boolean>;
  /**
   * Formatted observer-longitude text for the colored meridian indicator label
   * (Terrestrial screen). When present, a colored meridian + parallel are drawn
   * through the observer with these value labels.
   */
  readonly longitudeLabelProperty: TReadOnlyProperty<string>;
  /** Formatted observer-latitude text for the colored parallel indicator label. */
  readonly latitudeLabelProperty: TReadOnlyProperty<string>;
};

export type EarthGlobeNodeOptions = {
  /**
   * Right ascension offset (hours) applied to the globe geography, modelling the
   * precession of the equinoxes. 0 = J2000 epoch. A non-zero value rotates the
   * coastlines and grid about the polar axis relative to the RA coordinate frame,
   * showing how the equinox point drifts over millennia. Defaults to 0.
   */
  precessionAngleProperty?: TReadOnlyProperty<number>;

  /**
   * Fraction of the celestial-sphere projection radius at which to draw the
   * globe. Defaults to 0.28 (a small globe inside a full celestial sphere).
   * The Terrestrial screen passes 1 to render a full-size stand-alone globe.
   */
  radiusRatio?: number;

  /** City / map-feature overlays (Terrestrial screen only). Omitted elsewhere. */
  overlays?: GlobeOverlays;
};

const CITY_LABEL_FONT = new PhetFont(9);

export class EarthGlobeNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    longitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    options?: EarthGlobeNodeOptions,
  ) {
    super();

    const precessionAngleProperty = options?.precessionAngleProperty ?? new Property(0);

    const globeScale = options?.radiusRatio ?? DEFAULT_GLOBE_SCALE;
    const globeRadius = projection.radius * globeScale;

    const disc = new Circle(globeRadius, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 1,
      center: projection.center,
    });
    const landPath = new Path(null, {
      fill: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
    });
    const gridPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
      lineWidth: 1,
      opacity: 0.8,
    });
    const observerDot = new Circle(5, {
      fill: BasicCoordinatesAndSeasonsColors.observerColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    // ── Optional Terrestrial overlays: reference circles + date line + cities ──
    const overlays = options?.overlays;
    const cityLabelColor = BasicCoordinatesAndSeasonsColors.cityLabelColorProperty;

    const featureCirclesPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.accentColorProperty,
      lineWidth: 1,
      lineDash: [4, 3],
      opacity: 0.85,
    });
    const dateLinePath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
      lineWidth: 1.5,
    });
    const featuresLayer = new Node({ children: [featureCirclesPath, dateLinePath] });

    const cityNodes = (overlays?.cities ?? []).map((city) => {
      const dot = new Circle(2, { fill: cityLabelColor });
      const label = new Text(city.name, { font: CITY_LABEL_FONT, fill: cityLabelColor });
      const container = new Node({ children: [dot, label] });
      return { city, dot, label, container };
    });
    const citiesLayer = new Node({ children: cityNodes.map((c) => c.container) });

    // ── Coordinate indicator (Terrestrial only): arcs + labels ──────────────────
    //   - longitude arc: along the EQUATOR from Greenwich (0°) to the observer's
    //     longitude (its length encodes the longitude value)
    //   - latitude arc:  along the observer's MERIDIAN from the equator (0°) to the
    //     observer's latitude (its length encodes the latitude value)
    const longitudeArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.longitudeIndicatorColorProperty,
      lineWidth: 2,
    });
    const latitudeArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.latitudeIndicatorColorProperty,
      lineWidth: 2,
    });
    const indicatorLabelFont = new PhetFont({ size: 10, weight: "bold" });
    const makeIndicatorPill = (labelProperty: TReadOnlyProperty<string>, colorProperty: ProfileColorProperty): Node => {
      const text = new Text(labelProperty, {
        font: indicatorLabelFont,
        fill: colorProperty,
        pickable: false,
      });
      const bg = new Rectangle(0, 0, 1, 1, {
        fill: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
        opacity: 0.85,
        cornerRadius: 3,
        pickable: false,
      });
      text.localBoundsProperty.link((bounds) => {
        bg.rectX = bounds.minX - 3;
        bg.rectY = bounds.minY - 2;
        bg.rectWidth = bounds.width + 6;
        bg.rectHeight = bounds.height + 4;
      });
      return new Node({ children: [bg, text], pickable: false });
    };
    const lonIndicatorLabel = overlays
      ? makeIndicatorPill(
          overlays.longitudeLabelProperty,
          BasicCoordinatesAndSeasonsColors.longitudeIndicatorColorProperty,
        )
      : new Node();
    const latIndicatorLabel = overlays
      ? makeIndicatorPill(
          overlays.latitudeLabelProperty,
          BasicCoordinatesAndSeasonsColors.latitudeIndicatorColorProperty,
        )
      : new Node();
    const indicatorLayer = new Node({
      children: [longitudeArcPath, latitudeArcPath, lonIndicatorLabel, latIndicatorLabel],
    });

    // ── Feature labels (Terrestrial only): equator, tropics, polar, date line ──
    // Pinned to the front-facing point of each reference circle / the date line so
    // they ride on the feature as the globe turns. Toggled with the map features.
    const featureLabelFont = new PhetFont(9);
    const makeGlobeFeatureLabel = (
      labelProperty: TReadOnlyProperty<string>,
      _fillProperty: ProfileColorProperty,
    ): Text =>
      new Text(labelProperty, {
        font: featureLabelFont,
        fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      });

    const controls = StringManager.getInstance().getControls();
    const polarCircleLat = 90 - OBLIQUITY_DEGREES;
    const circleFeatureLabels: { label: Text; lat: number }[] = overlays
      ? [
          {
            label: makeGlobeFeatureLabel(
              controls.equatorStringProperty,
              BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
            ),
            lat: 0,
          },
          {
            label: makeGlobeFeatureLabel(
              controls.tropicOfCancerStringProperty,
              BasicCoordinatesAndSeasonsColors.accentColorProperty,
            ),
            lat: OBLIQUITY_DEGREES,
          },
          {
            label: makeGlobeFeatureLabel(
              controls.tropicOfCapricornStringProperty,
              BasicCoordinatesAndSeasonsColors.accentColorProperty,
            ),
            lat: -OBLIQUITY_DEGREES,
          },
          {
            label: makeGlobeFeatureLabel(
              controls.arcticCircleStringProperty,
              BasicCoordinatesAndSeasonsColors.accentColorProperty,
            ),
            lat: polarCircleLat,
          },
          {
            label: makeGlobeFeatureLabel(
              controls.antarcticCircleStringProperty,
              BasicCoordinatesAndSeasonsColors.accentColorProperty,
            ),
            lat: -polarCircleLat,
          },
        ]
      : [];
    const dateLineLabel = overlays
      ? makeGlobeFeatureLabel(
          controls.internationalDateLineStringProperty,
          BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
        )
      : null;
    const featureLabelsLayer = new Node({
      children: [...circleFeatureLabels.map((c) => c.label), ...(dateLineLabel ? [dateLineLabel] : [])],
    });

    this.children = overlays
      ? [disc, landPath, gridPath, featuresLayer, citiesLayer, indicatorLayer, featureLabelsLayer, observerDot]
      : [disc, landPath, gridPath, observerDot];

    if (overlays) {
      overlays.mapFeaturesVisibleProperty.link((visible) => {
        featuresLayer.visible = visible;
        featureLabelsLayer.visible = visible;
      });
      overlays.showCitiesProperty.link((visible) => {
        citiesLayer.visible = visible;
      });
    }

    const shorePointToVector = (point: EarthShorePoint, gst: number): Vector3 => {
      const lonHours = (Math.atan2(point.y, point.x) / (2 * Math.PI)) * 24;
      const latDeg = Math.asin(point.z) * (180 / Math.PI);
      return raDecToVector3(gst + lonHours, latDeg);
    };

    // Project a unit vector onto the (smaller) globe; report front-facing.
    const toGlobe = (v: Vector3): { point: Vector2; front: boolean } => {
      const { point, depth } = projection.projectWithDepth(v);
      return {
        point: projection.center.plus(point.minus(projection.center).timesScalar(globeScale)),
        front: depth >= 0,
      };
    };

    const mapGlobePoint = (v: Vector3): Vector2 => toGlobe(v).point;

    /**
     * Places a label at the most front-facing point of a small circle (constant
     * latitude), hiding it when the whole circle is on the far side. The Terrestrial
     * globe uses radiusRatio 1, so the raw projection equals the scaled globe point.
     */
    const placeOnCircle = (label: Text, axis: Vector3, polarAngleDeg: number): void => {
      let bestPoint: Vector2 | null = null;
      let bestDepth = -Infinity;
      for (const v of smallCirclePoints(axis, polarAngleDeg)) {
        const { point, depth } = projection.projectWithDepth(v);
        if (depth > 0 && depth > bestDepth) {
          bestDepth = depth;
          bestPoint = point;
        }
      }
      if (bestPoint) {
        label.visible = true;
        label.center = bestPoint;
      } else {
        label.visible = false;
      }
    };

    /** Places a label at the most front-facing vertex of a polyline, hiding it otherwise. */
    const placeOnVertices = (label: Text, points: readonly Vector3[]): void => {
      let bestPoint: Vector2 | null = null;
      let bestDepth = -Infinity;
      for (const v of points) {
        const { point, depth } = projection.projectWithDepth(v);
        if (depth > 0 && depth > bestDepth) {
          bestDepth = depth;
          bestPoint = point;
        }
      }
      if (bestPoint) {
        label.visible = true;
        label.center = bestPoint;
      } else {
        label.visible = false;
      }
    };

    /** Samples a great/small-circle arc from 0 to `target` (signed) for projection. */
    const arcSamples = (target: number, fn: (v: number) => Vector3): Vector3[] => {
      const steps = Math.max(8, Math.ceil(Math.abs(target) / 3));
      const pts: Vector3[] = [];
      for (let i = 0; i <= steps; i++) {
        pts.push(fn((target * i) / steps));
      }
      return pts;
    };

    /** Builds the graticule shape (equator + parallels + meridians) at a given GST. */
    const buildGridShape = (gst: number): Shape => {
      const shape = new Shape();
      // Equator (small circle 90° from the NCP), a closed ring.
      addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90), shape, mapGlobePoint, true);
      // Parallels (constant-latitude small circles), evenly spaced either side of the equator.
      for (const lat of GLOBE_LATITUDES) {
        addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - lat), shape, mapGlobePoint, true);
      }
      // Meridians (full great circles); the front-hemisphere clip always shows the near-side arc.
      for (const lon of GLOBE_LONGITUDES) {
        addFrontHemisphereSmoothPolyline(projection, meridianPoints(gst, lon), shape, mapGlobePoint);
      }
      return shape;
    };

    const applyGlobeClip = (): void => {
      const clip = Shape.circle(projection.center.x, projection.center.y, globeRadius);
      landPath.clipArea = clip;
      gridPath.clipArea = clip;
      // Reference circles / date line hug the surface too; city labels stay
      // unclipped so names near the limb remain readable.
      featureCirclesPath.clipArea = clip;
      dateLinePath.clipArea = clip;
      // Coordinate-indicator arcs hug the surface as well.
      longitudeArcPath.clipArea = clip;
      latitudeArcPath.clipArea = clip;
    };

    const addFrontLandPolygon = (shape: Shape, polygon: readonly EarthShorePoint[], gst: number): void => {
      const vertices = polygon.map((point) => shorePointToVector(point, gst));
      addFrontHemisphereSphericalPolygon(projection, vertices, shape, mapGlobePoint, projection.center, globeRadius);
    };

    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        latitudeProperty,
        longitudeProperty,
        siderealTimeProperty,
        earthMapResolutionProperty,
        precessionAngleProperty,
      ],
      (_m, latitude, longitude, lst, resolution, precessionHours) => {
        disc.center = projection.center;
        applyGlobeClip();

        // The sidereal time is *local* to the observer, so the prime meridian sits at the
        // Greenwich sidereal time, GST = LST − longitude. Anchoring the geography to GST keeps
        // the observer's own city beneath the dot (which stays at RA = LST) rather than always
        // drawing the 0° meridian under it. The precession angle shifts the geography in RA,
        // modelling the slow westward drift of the equinox point.
        const gst = lst - (longitude / 360) * HOURS_PER_DAY + precessionHours;

        const landShape = new Shape();
        for (const polygon of getEarthShorePolygons(resolution)) {
          addFrontLandPolygon(landShape, polygon, gst);
        }
        landPath.shape = landShape;

        const shape = buildGridShape(gst);
        gridPath.shape = shape;

        // Observer stands where their zenith points: RA = LST, Dec = latitude.
        const observer = toGlobe(raDecToVector3(lst, latitude));
        observerDot.center = observer.point;
        observerDot.visible = observer.front;

        // Terrestrial overlays: reference circles + date line + cities, anchored to
        // the same GST frame as the geography and front-hemisphere culled so they
        // turn with the globe.
        if (overlays) {
          const geoToVector = (lat: number, lon: number): Vector3 =>
            raDecToVector3(gst + (lon / 360) * HOURS_PER_DAY, lat);

          const circles = new Shape();
          for (const lat of overlays.referenceCircleLatitudes) {
            addFrontHemisphereSmoothPolyline(
              projection,
              smallCirclePoints(NCP, 90 - lat),
              circles,
              mapGlobePoint,
              true,
            );
          }
          featureCirclesPath.shape = circles;

          const idl = new Shape();
          const idlPoints = overlays.dateLine.map((v) => geoToVector(v.latitude, v.longitude));
          addFrontHemispherePolyline(projection, idlPoints, idl, mapGlobePoint);
          dateLinePath.shape = idl;

          for (const cityNode of cityNodes) {
            const projected = toGlobe(geoToVector(cityNode.city.latitude, cityNode.city.longitude));
            cityNode.dot.center = projected.point;
            cityNode.label.left = projected.point.x + 4;
            cityNode.label.centerY = projected.point.y;
            cityNode.container.visible = projected.front;
          }

          // Coordinate indicator: two arcs whose lengths encode the values.
          //   longitude arc — along the equator from Greenwich (0°) to the
          //     observer's longitude (the arc runs east for +, west for −)
          //   latitude arc  — along the observer's meridian from the equator (0°)
          //     to the observer's latitude (north for +, south for −)
          // Both are front-culled so they turn with the globe. They meet at the
          // equator point of the observer's meridian.
          const lonShape = new Shape();
          addFrontHemisphereSmoothPolyline(
            projection,
            arcSamples(longitude, (lon) => geoToVector(0, lon)),
            lonShape,
            mapGlobePoint,
          );
          longitudeArcPath.shape = lonShape;

          const latShape = new Shape();
          addFrontHemisphereSmoothPolyline(
            projection,
            arcSamples(latitude, (lat) => geoToVector(lat, longitude)),
            latShape,
            mapGlobePoint,
          );
          latitudeArcPath.shape = latShape;

          // Longitude label sits at the corner (equator ∩ observer's meridian);
          // latitude label sits at the observer. Each shows only when front-facing.
          const corner = toGlobe(geoToVector(0, longitude));
          lonIndicatorLabel.visible = corner.front;
          if (corner.front) {
            lonIndicatorLabel.left = corner.point.x + 5;
            lonIndicatorLabel.centerY = corner.point.y;
          }
          latIndicatorLabel.visible = observer.front;
          if (observer.front) {
            latIndicatorLabel.left = observer.point.x + 7;
            latIndicatorLabel.top = observer.point.y + 2;
          }

          // Feature labels ride on the front-facing point of each reference circle
          // (equator + tropics + polar) and the date line.
          for (const { label, lat } of circleFeatureLabels) {
            placeOnCircle(label, NCP, 90 - lat);
          }
          if (dateLineLabel) {
            placeOnVertices(dateLineLabel, idlPoints);
          }
        }
      },
    );
  }
}
