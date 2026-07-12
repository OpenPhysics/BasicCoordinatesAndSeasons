/**
 * TerrestrialMapNode.ts
 *
 * The flat map for the Terrestrial screen: the shared, pannable FlatEarthMapNode
 * plus this screen's geographically-anchored overlays. Each family of reference
 * geometry is an independently-toggled layer:
 *
 *   - Prime Meridian        — the single meridian at 0° longitude
 *   - Meridians             — a series of meridians (constant longitude), every 30°
 *   - Parallels of latitude — a series of parallels (constant latitude), every 30°
 *   - International Date Line
 *   - Geographical Lines    — equator, tropics (±23.4°), arctic/antarctic circles
 *                             (±66.6°), and the north/south poles
 *
 * A separate "Labels" toggle annotates whichever of those are visible with their
 * names. The line/point geometry is supplied through FlatEarthMapNode's
 * `overlayFactory` so it tiles with the map and pans/wraps seamlessly; the fixed
 * name labels (horizontal-line names pinned to the left edge, pole names at the
 * top/bottom) live in this node directly. The base map's own graticule and equator
 * are disabled so these toggles fully own that geometry.
 */

import { Multilink, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import type { EarthMapResolution } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import {
  FlatEarthMapNode,
  type FlatEarthMapNodeOptions,
  type FlatMapWorldContext,
} from "../../common/view/FlatEarthMapNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CITIES } from "../model/CityData.js";
import { DATE_LINE } from "../model/DateLineData.js";

/** The set of independently-toggled feature layers on the Terrestrial map. */
export type TerrestrialFeatureVisibility = {
  readonly primeMeridian: TReadOnlyProperty<boolean>;
  readonly meridians: TReadOnlyProperty<boolean>;
  readonly parallels: TReadOnlyProperty<boolean>;
  readonly dateLine: TReadOnlyProperty<boolean>;
  readonly geographicalLines: TReadOnlyProperty<boolean>;
  readonly labels: TReadOnlyProperty<boolean>;
  readonly cities: TReadOnlyProperty<boolean>;
};

export type TerrestrialMapNodeOptions = {
  width: number;
  height: number;
  /** Colored lon/lat indicator through the cursor, with value labels. */
  coordinateIndicator?: {
    longitudeLabelProperty: TReadOnlyProperty<string>;
    latitudeLabelProperty: TReadOnlyProperty<string>;
  };
  /** Spoken on focus of the map (accessible object response), forwarded to the base map. */
  accessibleObjectResponseProperty?: TReadOnlyProperty<string>;
};

const CITY_LABEL_FONT = new PhetFont(9);
const CITY_DOT_RADIUS = 1.75;
const FEATURE_LABEL_FONT = new PhetFont(9);

/** Meridians (constant-longitude lines), every 30°, excluding the prime meridian (0°). */
const MERIDIAN_LONGITUDES = [-150, -120, -90, -60, -30, 30, 60, 90, 120, 150, 180];
/** Parallels (constant-latitude lines), every 30°, excluding the equator (0°). */
const PARALLEL_LATITUDES = [-60, -30, 30, 60];

/** Node whose visibility tracks a single boolean Property. */
const gate = (node: Node, property: TReadOnlyProperty<boolean>): Node => {
  property.link((visible) => {
    node.visible = visible;
  });
  return node;
};

/** Node visible only when BOTH properties are true (e.g. a feature AND its labels). */
const gateBoth = (node: Node, a: TReadOnlyProperty<boolean>, b: TReadOnlyProperty<boolean>): Node => {
  Multilink.multilink([a, b], (x, y) => {
    node.visible = x && y;
  });
  return node;
};

/**
 * Text label for a reference feature, drawn in the cardinal-label color so it stays
 * readable over land/ocean without a background pill.
 */
const makeFeatureLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
  new Text(labelProperty, {
    font: FEATURE_LABEL_FONT,
    fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
    pickable: false,
  });

/**
 * The geographically-anchored, tiled feature geometry (everything that pans with
 * the map): meridians, parallels, the prime meridian, the geographical lines, the
 * date line, plus the two vertical-line name labels.
 */
const createFeatureGeometry = (context: FlatMapWorldContext, vis: TerrestrialFeatureVisibility): Node => {
  const { width, height, lonToX, latToY } = context;
  const polarCircleLatitude = 90 - OBLIQUITY_DEGREES; // 66.6°
  const controls = StringManager.getInstance().getControls();

  // ── Meridians (constant longitude), a vertical grid ──
  const meridians = new Shape();
  for (const lon of MERIDIAN_LONGITUDES) {
    meridians.moveTo(lonToX(lon), 0).lineTo(lonToX(lon), height);
  }
  const meridiansPath = gate(
    new Path(meridians, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.6,
      opacity: 0.8,
    }),
    vis.meridians,
  );

  // ── Parallels of latitude (constant latitude), a horizontal grid ──
  const parallels = new Shape();
  for (const lat of PARALLEL_LATITUDES) {
    parallels.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
  }
  const parallelsPath = gate(
    new Path(parallels, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.6,
      opacity: 0.8,
    }),
    vis.parallels,
  );

  // ── Prime meridian (0° longitude) ──
  const primeMeridian = new Shape().moveTo(lonToX(0), 0).lineTo(lonToX(0), height);
  const primeMeridianPath = gate(
    new Path(primeMeridian, {
      stroke: BasicCoordinatesAndSeasonsColors.primeMeridianColorProperty,
      lineWidth: 1.5,
    }),
    vis.primeMeridian,
  );

  // ── Geographical lines: equator + tropics + polar circles ──
  const equator = new Shape().moveTo(0, latToY(0)).lineTo(width, latToY(0));
  const equatorPath = new Path(equator, {
    stroke: BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
    lineWidth: 1,
  });
  const referenceCircles = new Shape();
  for (const lat of [OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLatitude, -polarCircleLatitude]) {
    referenceCircles.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
  }
  const referenceCirclesPath = new Path(referenceCircles, {
    stroke: BasicCoordinatesAndSeasonsColors.accentColorProperty,
    lineWidth: 1,
    lineDash: [4, 3],
    opacity: 0.85,
  });
  const geographicalLinesNode = gate(
    new Node({ children: [equatorPath, referenceCirclesPath] }),
    vis.geographicalLines,
  );

  // ── International Date Line ──
  // The polyline straddles the ±180° seam; unwrap negative longitudes by +360 so it
  // stays horizontally contiguous (the tiling handles the wrap).
  const dateLine = new Shape();
  DATE_LINE.forEach((vertex, index) => {
    const unwrappedLon = vertex.longitude < 0 ? vertex.longitude + 360 : vertex.longitude;
    const x = lonToX(unwrappedLon);
    const y = latToY(vertex.latitude);
    if (index === 0) {
      dateLine.moveTo(x, y);
    } else {
      dateLine.lineTo(x, y);
    }
  });
  const dateLinePath = gate(
    new Path(dateLine, {
      stroke: BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
      lineWidth: 1.5,
    }),
    vis.dateLine,
  );

  // ── Vertical-line name labels (pan with the geography) ──
  // Prime-meridian name, on the 0° line but below the top edge so it clears the
  // north-pole marker/label (which also sits at the top center).
  const primeMeridianLabel = makeFeatureLabel(controls.primeMeridianStringProperty);
  primeMeridianLabel.centerX = lonToX(0);
  primeMeridianLabel.top = 20;
  gateBoth(primeMeridianLabel, vis.primeMeridian, vis.labels);

  // Date-line name, pinned to the ±180° meridian at the map edge.
  const dateLineLabel = makeFeatureLabel(controls.internationalDateLineStringProperty);
  dateLineLabel.right = width - 3;
  dateLineLabel.centerY = height / 2;
  gateBoth(dateLineLabel, vis.dateLine, vis.labels);

  return new Node({
    children: [
      meridiansPath,
      parallelsPath,
      primeMeridianPath,
      geographicalLinesNode,
      dateLinePath,
      primeMeridianLabel,
      dateLineLabel,
    ],
  });
};

/** Reference-city dots + labels, tied to the cities toggle. */
const createCities = (context: FlatMapWorldContext, showCitiesProperty: TReadOnlyProperty<boolean>): Node => {
  const { lonToX, latToY } = context;
  const cities = new Node();

  for (const city of CITIES) {
    const dotX = lonToX(city.longitude);
    const dotY = latToY(city.latitude);
    const dot = new Circle(CITY_DOT_RADIUS, {
      fill: BasicCoordinatesAndSeasonsColors.cityLabelColorProperty,
      centerX: dotX,
      centerY: dotY,
    });
    const label = new Text(city.name, {
      font: CITY_LABEL_FONT,
      fill: BasicCoordinatesAndSeasonsColors.cityLabelColorProperty,
    });
    const gap = CITY_DOT_RADIUS + 2;
    switch (city.side) {
      case "left":
        label.right = dotX - gap;
        label.centerY = dotY;
        break;
      case "top":
        label.centerX = dotX;
        label.bottom = dotY - gap;
        break;
      case "bottom":
        label.centerX = dotX;
        label.top = dotY + gap;
        break;
      default:
        label.left = dotX + gap;
        label.centerY = dotY;
        break;
    }
    cities.addChild(new Node({ children: [dot, label] }));
  }

  return gate(cities, showCitiesProperty);
};

export class TerrestrialMapNode extends Node {
  /** The wrapped, pannable map (exposed so callers can put it in the pdomOrder). */
  public readonly map: FlatEarthMapNode;

  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    longitudeOffsetProperty: NumberProperty,
    featureVisibility: TerrestrialFeatureVisibility,
    options: TerrestrialMapNodeOptions,
  ) {
    const { width, height, coordinateIndicator, accessibleObjectResponseProperty } = options;

    const flatMapOptions: FlatEarthMapNodeOptions = {
      width,
      height,
      // The feature toggles own the graticule and the equator, so suppress the
      // base map's always-on versions.
      includeBaseGraticule: false,
      includeBaseEquator: false,
      overlayFactory: (context: FlatMapWorldContext) =>
        new Node({
          children: [
            createFeatureGeometry(context, featureVisibility),
            createCities(context, featureVisibility.cities),
          ],
        }),
    };
    if (coordinateIndicator) {
      flatMapOptions.coordinateIndicator = coordinateIndicator;
    }
    if (accessibleObjectResponseProperty) {
      flatMapOptions.accessibleObjectResponseProperty = accessibleObjectResponseProperty;
    }

    const map = new FlatEarthMapNode(
      latitudeProperty,
      longitudeProperty,
      earthMapResolutionProperty,
      longitudeOffsetProperty,
      flatMapOptions,
    );

    // ── Fixed name labels (do not pan) ────────────────────────────────────────
    const controls = StringManager.getInstance().getControls();
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const polarCircleLatitude = 90 - OBLIQUITY_DEGREES;

    // Horizontal-line names, pinned just inside the left neatline. These lines are
    // horizontal, so a fixed x always sits on the line regardless of panning.
    const horizontalLabelSpecs: { property: TReadOnlyProperty<string>; lat: number }[] = [
      { property: controls.equatorStringProperty, lat: 0 },
      { property: controls.tropicOfCancerStringProperty, lat: OBLIQUITY_DEGREES },
      { property: controls.tropicOfCapricornStringProperty, lat: -OBLIQUITY_DEGREES },
      { property: controls.arcticCircleStringProperty, lat: polarCircleLatitude },
      { property: controls.antarcticCircleStringProperty, lat: -polarCircleLatitude },
    ];
    const horizontalLabels = new Node({
      children: horizontalLabelSpecs.map(({ property, lat }) => {
        const label = makeFeatureLabel(property);
        label.left = 10;
        label.centerY = latToY(lat);
        return label;
      }),
    });
    gateBoth(horizontalLabels, featureVisibility.geographicalLines, featureVisibility.labels);

    // North/south poles: a token dot at the top/bottom center, with a name when
    // labels are on. On this equirectangular projection a pole is really the whole
    // top/bottom edge, so the dot is only a marker — it is not tied to a longitude
    // and therefore does not pan.
    const northPoleDot = new Circle(2.5, {
      fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      centerX: width / 2,
      centerY: 4,
    });
    const southPoleDot = new Circle(2.5, {
      fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      centerX: width / 2,
      centerY: height - 4,
    });
    const poleDots = gate(new Node({ children: [northPoleDot, southPoleDot] }), featureVisibility.geographicalLines);

    const northPoleLabel = makeFeatureLabel(controls.northPoleStringProperty);
    northPoleLabel.centerX = width / 2;
    northPoleLabel.top = northPoleDot.bottom + 1;
    const southPoleLabel = makeFeatureLabel(controls.southPoleStringProperty);
    southPoleLabel.centerX = width / 2;
    southPoleLabel.bottom = southPoleDot.top - 1;
    const poleLabels = gateBoth(
      new Node({ children: [northPoleLabel, southPoleLabel] }),
      featureVisibility.geographicalLines,
      featureVisibility.labels,
    );

    super({ children: [map, horizontalLabels, poleDots, poleLabels] });

    this.map = map;
  }
}
