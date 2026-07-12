/**
 * TerrestrialMapNode.ts
 *
 * The flat map for the Terrestrial screen: the shared, pannable FlatEarthMapNode
 * plus this screen's geographically-anchored overlays — the reference cities and
 * the "map features" (tropic ±23.4° / polar ±66.6° circles and the International
 * Date Line). The overlays are supplied through FlatEarthMapNode's `overlayFactory`
 * so they are tiled with the map and pan/wrap seamlessly. The equator is already
 * drawn by FlatEarthMapNode.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, type ProfileColorProperty, Text } from "scenerystack/scenery";
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

export type TerrestrialMapNodeOptions = {
  width: number;
  height: number;
  /** Colored lon/lat indicator through the cursor, with value labels. */
  coordinateIndicator?: {
    longitudeLabelProperty: TReadOnlyProperty<string>;
    latitudeLabelProperty: TReadOnlyProperty<string>;
  };
};

const CITY_LABEL_FONT = new PhetFont(9);
const CITY_DOT_RADIUS = 1.75;
const FEATURE_LABEL_FONT = new PhetFont(9);

/**
 * Outlined (halo) text label for a reference feature (equator, tropic, polar
 * circle, date line). The contrasting stroke keeps it readable over land/ocean
 * without needing a background pill.
 */
const makeFeatureLabel = (labelProperty: TReadOnlyProperty<string>, _fillProperty: ProfileColorProperty): Text =>
  new Text(labelProperty, {
    font: FEATURE_LABEL_FONT,
    fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
    pickable: false,
  });

/** Reference circles + International Date Line, tied to `mapFeaturesVisibleProperty`. */
const createMapFeatures = (
  context: FlatMapWorldContext,
  mapFeaturesVisibleProperty: TReadOnlyProperty<boolean>,
): Node => {
  const { width, height, lonToX, latToY } = context;
  const polarCircleLatitude = 90 - OBLIQUITY_DEGREES; // 66.6°
  const controls = StringManager.getInstance().getControls();

  const circles = new Shape();
  for (const lat of [OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLatitude, -polarCircleLatitude]) {
    circles.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
  }
  const circlesPath = new Path(circles, {
    stroke: BasicCoordinatesAndSeasonsColors.accentColorProperty,
    lineWidth: 1,
    lineDash: [4, 3],
    opacity: 0.85,
  });

  // The date line straddles the ±180° seam; unwrap negative longitudes by +360 so
  // the polyline stays horizontally contiguous (the tiling handles the wrap).
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
  const dateLinePath = new Path(dateLine, {
    stroke: BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
    lineWidth: 1.5,
  });

  // Date-line label, tiled with the geography so it tracks the ±180° meridian.
  const dateLineLabel = makeFeatureLabel(
    controls.internationalDateLineStringProperty,
    BasicCoordinatesAndSeasonsColors.dateLineColorProperty,
  );
  dateLineLabel.right = width - 3;
  dateLineLabel.centerY = height / 2;

  const features = new Node({ children: [circlesPath, dateLinePath, dateLineLabel] });
  mapFeaturesVisibleProperty.link((visible) => {
    features.visible = visible;
  });
  return features;
};

/** Reference-city dots + labels, tied to `showCitiesProperty`. */
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

  showCitiesProperty.link((visible) => {
    cities.visible = visible;
  });
  return cities;
};

export class TerrestrialMapNode extends Node {
  /** The wrapped, pannable map (exposed so callers can put it in the pdomOrder). */
  public readonly map: FlatEarthMapNode;

  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    longitudeOffsetProperty: NumberProperty,
    showCitiesProperty: TReadOnlyProperty<boolean>,
    mapFeaturesVisibleProperty: TReadOnlyProperty<boolean>,
    options: TerrestrialMapNodeOptions,
  ) {
    const { width, height, coordinateIndicator } = options;

    const flatMapOptions: FlatEarthMapNodeOptions = {
      width,
      height,
      overlayFactory: (context: FlatMapWorldContext) =>
        new Node({
          children: [createMapFeatures(context, mapFeaturesVisibleProperty), createCities(context, showCitiesProperty)],
        }),
    };
    if (coordinateIndicator) {
      flatMapOptions.coordinateIndicator = coordinateIndicator;
    }

    const map = new FlatEarthMapNode(
      latitudeProperty,
      longitudeProperty,
      earthMapResolutionProperty,
      longitudeOffsetProperty,
      flatMapOptions,
    );

    // Latitude-circle labels (equator + tropics + polar circles) pinned to the
    // left edge. These lines are horizontal, so a fixed x always sits on the line
    // regardless of panning. Toggled with the other map features.
    const controls = StringManager.getInstance().getControls();
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const polarCircleLatitude = 90 - OBLIQUITY_DEGREES;
    const circleLabels = new Node({
      children: [
        makeFeatureLabel(
          controls.equatorStringProperty,
          BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
        ),
        makeFeatureLabel(controls.tropicOfCancerStringProperty, BasicCoordinatesAndSeasonsColors.accentColorProperty),
        makeFeatureLabel(
          controls.tropicOfCapricornStringProperty,
          BasicCoordinatesAndSeasonsColors.accentColorProperty,
        ),
        makeFeatureLabel(controls.arcticCircleStringProperty, BasicCoordinatesAndSeasonsColors.accentColorProperty),
        makeFeatureLabel(controls.antarcticCircleStringProperty, BasicCoordinatesAndSeasonsColors.accentColorProperty),
      ],
    });
    const labelLats = [0, OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLatitude, -polarCircleLatitude];
    circleLabels.children.forEach((label, i) => {
      // Just inside the checkered neatline so the names clear the frame cells.
      label.left = 10;
      label.centerY = latToY(labelLats[i] ?? 0);
    });
    mapFeaturesVisibleProperty.link((visible) => {
      circleLabels.visible = visible;
    });

    super({ children: [map, circleLabels] });

    this.map = map;
  }
}
