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
  nightShadeShape,
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

// Visibility helpers: `gateOn` tracks one Property; `gateBoth` requires two (a
// feature AND the labels toggle).
const gateOn = (node: Node, property: TReadOnlyProperty<boolean>): void => {
  property.link((visible) => {
    node.visible = visible;
  });
};
const gateBoth = (node: Node, a: TReadOnlyProperty<boolean>, b: TReadOnlyProperty<boolean>): void => {
  Multilink.multilink([a, b], (x, y) => {
    node.visible = x && y;
  });
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
  /** Latitudes (°) of the "geographical" reference small-circles: the tropics and polar circles. */
  readonly referenceCircleLatitudes: readonly number[];
  readonly showCitiesProperty: TReadOnlyProperty<boolean>;
  // ── Granular feature toggles (mirror the flat map) ──
  /** The prime meridian (0° longitude) great circle. */
  readonly primeMeridianVisibleProperty: TReadOnlyProperty<boolean>;
  /** A series of meridians (constant longitude), every 30°. */
  readonly meridiansVisibleProperty: TReadOnlyProperty<boolean>;
  /** A series of parallels of latitude (constant latitude), every 30°. */
  readonly parallelsVisibleProperty: TReadOnlyProperty<boolean>;
  /** The International Date Line. */
  readonly dateLineVisibleProperty: TReadOnlyProperty<boolean>;
  /** The equator + tropics + polar circles + poles. */
  readonly geographicalLinesVisibleProperty: TReadOnlyProperty<boolean>;
  /** Whether the visible features are annotated with their names. */
  readonly labelsVisibleProperty: TReadOnlyProperty<boolean>;
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

  /**
   * How the geography is anchored to the RA frame. Defaults to `true`.
   *
   * `true` (observer-anchored) — the geography rotates so the observer's own meridian
   * always faces the camera: the observer marker stays centered while the earth spins
   * beneath it (the NAAP longLatDemo behavior, and how the small globe on the
   * Celestial / Seasons screens turns with sidereal time).
   *
   * `false` (fixed geography) — the prime meridian is pinned at RA = sidereal time and
   * does not depend on the observer's longitude; instead the observer marker rides at
   * its true latitude/longitude. Dragging the marker then slides it freely across a
   * stationary globe, matching the celestial-sphere guide star.
   */
  observerAnchored?: boolean;

  /**
   * Direction to the Sun as a unit vector in the equatorial (RA/Dec) frame. When
   * provided, the globe's night hemisphere (the half facing away from the Sun) is
   * shaded, showing which face is lit — the Seasons screen passes this. Omitted
   * elsewhere, leaving the globe uniformly lit.
   */
  sunDirectionProperty?: TReadOnlyProperty<Vector3>;
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
    const observerAnchored = options?.observerAnchored ?? true;

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

    // Day/night shade: the hemisphere facing away from the Sun (Seasons screen only,
    // when a Sun direction is supplied). A translucent dark tint so land and grid
    // still read faintly on the night side. Clipped to the globe disc.
    const sunDirectionProperty = options?.sunDirectionProperty;
    const shadePath = new Path(null, {
      fill: BasicCoordinatesAndSeasonsColors.terminatorShadeColorProperty,
      pickable: false,
      visible: !!sunDirectionProperty,
    });

    // ── Optional Terrestrial overlays: reference circles + date line + cities ──
    const overlays = options?.overlays;
    const cityLabelColor = BasicCoordinatesAndSeasonsColors.cityLabelColorProperty;

    // Geographical lines: the tropic/polar reference small-circles (dashed accent)
    // plus the equator (solid) and north/south pole markers.
    const featureCirclesPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.accentColorProperty,
      lineWidth: 1,
      lineDash: [4, 3],
      opacity: 0.85,
    });
    const equatorArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
      lineWidth: 1,
    });
    const northPoleDot = new Circle(2.5, { fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty });
    const southPoleDot = new Circle(2.5, { fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty });
    const geographicalLinesLayer = new Node({
      children: [equatorArcPath, featureCirclesPath, northPoleDot, southPoleDot],
    });

    // A series of meridians (constant longitude) and the single prime meridian.
    const meridiansArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.8,
      opacity: 0.85,
    });
    const primeMeridianArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.primeMeridianColorProperty,
      lineWidth: 1.5,
    });
    // A series of parallels of latitude (constant latitude).
    const parallelsArcPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.8,
      opacity: 0.85,
    });

    const dateLinePath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
      lineWidth: 1.5,
    });

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
    const makeGlobeFeatureLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, {
        font: featureLabelFont,
        fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      });

    const controls = StringManager.getInstance().getControls();
    const polarCircleLat = 90 - OBLIQUITY_DEGREES;
    // Geographical-line labels: equator, tropics, and polar circles, each riding on
    // the front-facing point of its small circle.
    // The poles are handled as circle labels too: placeOnCircle with a polar angle of
    // 0° (north) or 180° (south) collapses the small circle to the pole point.
    const circleFeatureLabels: { label: Text; lat: number }[] = overlays
      ? [
          { label: makeGlobeFeatureLabel(controls.equatorStringProperty), lat: 0 },
          { label: makeGlobeFeatureLabel(controls.tropicOfCancerStringProperty), lat: OBLIQUITY_DEGREES },
          { label: makeGlobeFeatureLabel(controls.tropicOfCapricornStringProperty), lat: -OBLIQUITY_DEGREES },
          { label: makeGlobeFeatureLabel(controls.arcticCircleStringProperty), lat: polarCircleLat },
          { label: makeGlobeFeatureLabel(controls.antarcticCircleStringProperty), lat: -polarCircleLat },
          { label: makeGlobeFeatureLabel(controls.northPoleStringProperty), lat: 90 },
          { label: makeGlobeFeatureLabel(controls.southPoleStringProperty), lat: -90 },
        ]
      : [];
    // Group the geographical labels so a single toggle (geographical lines + labels)
    // governs them all.
    const geoLabelsLayer = new Node({ children: circleFeatureLabels.map((c) => c.label) });
    const dateLineLabel = overlays ? makeGlobeFeatureLabel(controls.internationalDateLineStringProperty) : null;
    const primeMeridianGlobeLabel = overlays ? makeGlobeFeatureLabel(controls.primeMeridianStringProperty) : null;
    // Wrap each label in its own layer: the per-frame redraw sets the label's own
    // `.visible` for front-hemisphere culling, so the checkbox gate must live on the
    // parent (otherwise the redraw would override the gate on first render).
    const dateLineLabelLayer = dateLineLabel ? new Node({ children: [dateLineLabel] }) : null;
    const primeMeridianLabelLayer = primeMeridianGlobeLabel ? new Node({ children: [primeMeridianGlobeLabel] }) : null;

    this.children = overlays
      ? [
          disc,
          landPath,
          parallelsArcPath,
          meridiansArcPath,
          primeMeridianArcPath,
          geographicalLinesLayer,
          dateLinePath,
          citiesLayer,
          indicatorLayer,
          geoLabelsLayer,
          ...(dateLineLabelLayer ? [dateLineLabelLayer] : []),
          ...(primeMeridianLabelLayer ? [primeMeridianLabelLayer] : []),
          observerDot,
        ]
      : [disc, landPath, gridPath, shadePath, observerDot];

    if (overlays) {
      gateOn(parallelsArcPath, overlays.parallelsVisibleProperty);
      gateOn(meridiansArcPath, overlays.meridiansVisibleProperty);
      gateOn(primeMeridianArcPath, overlays.primeMeridianVisibleProperty);
      gateOn(geographicalLinesLayer, overlays.geographicalLinesVisibleProperty);
      gateOn(dateLinePath, overlays.dateLineVisibleProperty);
      gateBoth(geoLabelsLayer, overlays.geographicalLinesVisibleProperty, overlays.labelsVisibleProperty);
      if (dateLineLabelLayer) {
        gateBoth(dateLineLabelLayer, overlays.dateLineVisibleProperty, overlays.labelsVisibleProperty);
      }
      if (primeMeridianLabelLayer) {
        gateBoth(primeMeridianLabelLayer, overlays.primeMeridianVisibleProperty, overlays.labelsVisibleProperty);
      }
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

    // ── Granular graticule builders (Terrestrial overlays) ──────────────────────
    /** Meridians at the given longitudes (great circles) at a given GST. */
    const buildMeridiansShape = (gst: number, longitudes: readonly number[]): Shape => {
      const shape = new Shape();
      for (const lon of longitudes) {
        addFrontHemisphereSmoothPolyline(projection, meridianPoints(gst, lon), shape, mapGlobePoint);
      }
      return shape;
    };
    /** Parallels at the given latitudes (constant-latitude small circles). */
    const buildParallelsShape = (latitudes: readonly number[]): Shape => {
      const shape = new Shape();
      for (const lat of latitudes) {
        addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - lat), shape, mapGlobePoint, true);
      }
      return shape;
    };
    // Meridians every 30°, excluding the prime meridian (drawn separately).
    const meridianLongitudesNoPrime = GLOBE_LONGITUDES.filter((lon) => lon !== 0);

    const applyGlobeClip = (): void => {
      const clip = Shape.circle(projection.center.x, projection.center.y, globeRadius);
      landPath.clipArea = clip;
      gridPath.clipArea = clip;
      shadePath.clipArea = clip;
      // Reference circles / date line / graticule hug the surface too; city labels
      // stay unclipped so names near the limb remain readable.
      featureCirclesPath.clipArea = clip;
      equatorArcPath.clipArea = clip;
      meridiansArcPath.clipArea = clip;
      primeMeridianArcPath.clipArea = clip;
      parallelsArcPath.clipArea = clip;
      dateLinePath.clipArea = clip;
      // Coordinate-indicator arcs hug the surface as well.
      longitudeArcPath.clipArea = clip;
      latitudeArcPath.clipArea = clip;
    };

    const addFrontLandPolygon = (shape: Shape, polygon: readonly EarthShorePoint[], gst: number): void => {
      const vertices = polygon.map((point) => shorePointToVector(point, gst));
      addFrontHemisphereSphericalPolygon(projection, vertices, shape, mapGlobePoint, projection.center, globeRadius);
    };

    const shadeSunProperty: TReadOnlyProperty<Vector3> = sunDirectionProperty ?? new Property(new Vector3(0, 0, 1));

    // `observerAnchored` is a fixed mode, so resolve its two branches once here rather
    // than per redraw: the Greenwich sidereal time the geography is drawn at, and the RA
    // the observer marker sits at (see the `gst` comment inside the multilink).
    const gstFor = observerAnchored
      ? (lst: number, lonHours: number, prec: number): number => lst - lonHours + prec
      : (lst: number, _lonHours: number, prec: number): number => lst + prec;
    const observerRaFor = observerAnchored
      ? (lst: number, _lonHours: number): number => lst
      : (lst: number, lonHours: number): number => lst + lonHours;

    // Draws the Terrestrial overlays (reference circles, graticule, date line, cities,
    // indicator arcs, and feature labels) into their Paths, all anchored to the same
    // GST frame as the geography and front-hemisphere culled so they turn with the globe.
    const drawOverlays = (
      activeOverlays: GlobeOverlays,
      gst: number,
      latitude: number,
      longitude: number,
      observer: { point: Vector2; front: boolean },
    ): void => {
      const geoToVector = (lat: number, lon: number): Vector3 => raDecToVector3(gst + (lon / 360) * HOURS_PER_DAY, lat);

      // Geographical lines: tropic/polar reference circles + equator + poles.
      const circles = new Shape();
      for (const lat of activeOverlays.referenceCircleLatitudes) {
        addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - lat), circles, mapGlobePoint, true);
      }
      featureCirclesPath.shape = circles;
      // The equator is just the parallel at latitude 0.
      equatorArcPath.shape = buildParallelsShape([0]);

      const northPole = toGlobe(NCP);
      northPoleDot.center = northPole.point;
      northPoleDot.visible = northPole.front;
      const southPole = toGlobe(new Vector3(0, 0, -1));
      southPoleDot.center = southPole.point;
      southPoleDot.visible = southPole.front;

      // Meridians (series + prime) and parallels of latitude.
      meridiansArcPath.shape = buildMeridiansShape(gst, meridianLongitudesNoPrime);
      primeMeridianArcPath.shape = buildMeridiansShape(gst, [0]);
      parallelsArcPath.shape = buildParallelsShape(GLOBE_LATITUDES);

      const idl = new Shape();
      const idlPoints = activeOverlays.dateLine.map((v) => geoToVector(v.latitude, v.longitude));
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
      //   longitude arc — along the equator from Greenwich (0°) to the observer's
      //     longitude (east for +, west for −)
      //   latitude arc  — along the observer's meridian from the equator (0°) to the
      //     observer's latitude (north for +, south for −)
      // Both are front-culled; they meet at the equator point of the observer's meridian.
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

      // Longitude label sits at the corner (equator ∩ observer's meridian); latitude
      // label sits at the observer. Each shows only when front-facing.
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
      // (equator + tropics + polar + poles), the prime meridian, and the date line.
      for (const { label, lat } of circleFeatureLabels) {
        placeOnCircle(label, NCP, 90 - lat);
      }
      if (primeMeridianGlobeLabel) {
        // Sample only mid-latitudes (drop the ±~60°+ polar ends) so the label rides on
        // the middle of the meridian rather than colliding with the north-pole label.
        placeOnVertices(primeMeridianGlobeLabel, meridianPoints(gst, 0).slice(6, -6));
      }
      if (dateLineLabel) {
        placeOnVertices(dateLineLabel, idlPoints);
      }
    };

    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        latitudeProperty,
        longitudeProperty,
        siderealTimeProperty,
        earthMapResolutionProperty,
        precessionAngleProperty,
        shadeSunProperty,
      ],
      (_m, latitude, longitude, lst, resolution, precessionHours, sunDirection) => {
        disc.center = projection.center;
        applyGlobeClip();

        // Day/night terminator: shade the hemisphere facing away from the Sun.
        if (sunDirectionProperty) {
          shadePath.shape = nightShadeShape(projection, sunDirection, mapGlobePoint, projection.center, globeRadius);
        }

        // The sidereal time is *local* to the observer, so the prime meridian sits at the
        // Greenwich sidereal time, GST = LST − longitude. Anchoring the geography to GST keeps
        // the observer's own city beneath the dot (which stays at RA = LST) rather than always
        // drawing the 0° meridian under it. The precession angle shifts the geography in RA,
        // modelling the slow westward drift of the equinox point.
        //
        // With fixed geography (observerAnchored === false) the longitude term is dropped, so
        // the earth stands still and the observer marker instead rides at its true longitude.
        const longitudeHours = (longitude / 360) * HOURS_PER_DAY;
        const gst = gstFor(lst, longitudeHours, precessionHours);

        const landShape = new Shape();
        for (const polygon of getEarthShorePolygons(resolution)) {
          addFrontLandPolygon(landShape, polygon, gst);
        }
        landPath.shape = landShape;

        // The always-on combined graticule is only used when there are no overlays;
        // the Terrestrial screen draws its meridians/parallels via the toggled paths.
        if (!overlays) {
          gridPath.shape = buildGridShape(gst);
        }

        // Observer stands where their zenith points: Dec = latitude. When the geography is
        // observer-anchored the meridian is always centered (RA = LST); with fixed geography
        // the marker rides at its true longitude (RA = LST + longitude), so it moves across
        // the stationary globe as the observer's location changes.
        const observer = toGlobe(raDecToVector3(observerRaFor(lst, longitudeHours), latitude));
        observerDot.center = observer.point;
        observerDot.visible = observer.front;

        // Terrestrial overlays: reference circles + graticule + date line + cities +
        // indicator arcs + labels (all drawn together in drawOverlays).
        if (overlays) {
          drawOverlays(overlays, gst, latitude, longitude, observer);
        }
      },
    );
  }
}
