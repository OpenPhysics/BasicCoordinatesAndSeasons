/**
 * TerrestrialScreenView.ts
 *
 * The Terrestrial Coordinates screen: a draggable flat map (left) and a full-size
 * globe (right) that share one observer location, plus a panel with editable
 * latitude/longitude fields, a hemisphere-letter readout, and a reference-circles
 * toggle. Dragging the map cursor or the globe marker — or typing a coordinate —
 * keeps all three in sync.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox } from "scenerystack/sun";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import {
  CONTROL_FONT_SIZE,
  type EarthMapResolution,
  SCREEN_VIEW_MARGIN,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsButtonOptions.js";
import { SIM_CHECKBOX_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsControlOptions.js";
import { BasicCoordinatesAndSeasonsPanel } from "../../common/BasicCoordinatesAndSeasonsPanel.js";
import { formatLatitude, formatLongitude } from "../../common/formatAngles.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { EditableNumberFieldNode } from "../../common/view/EditableNumberFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { TerrestrialModel } from "../model/TerrestrialModel.js";
import { GlobeObserverDragNode } from "./GlobeObserverDragNode.js";
import { TerrestrialMapNode } from "./TerrestrialMapNode.js";
import { TerrestrialScreenSummaryContent } from "./TerrestrialScreenSummaryContent.js";

const MAP_WIDTH = 440;
const MAP_HEIGHT = 220;
const GLOBE_RADIUS = 150;

type TerrestrialScreenViewOptions = ScreenViewOptions & {
  earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>;
};

export class TerrestrialScreenView extends ScreenView {
  public constructor(model: TerrestrialModel, options: TerrestrialScreenViewOptions) {
    const { earthMapResolutionProperty, ...screenViewOptions } = options;
    super({
      screenSummaryContent: new TerrestrialScreenSummaryContent(model),
      ...screenViewOptions,
    });

    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getTerrestrialA11yStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // Coastline detail comes from Preferences; the globe's sidereal time is fixed
    // at 0, so longitude alone spins the geography.
    const siderealTimeProperty = new NumberProperty(0);

    // ── Flat map (left) ──────────────────────────────────────────────────────
    const mapNode = new TerrestrialMapNode(
      model.latitudeProperty,
      model.longitudeProperty,
      earthMapResolutionProperty,
      model.referenceCirclesVisibleProperty,
      { width: MAP_WIDTH, height: MAP_HEIGHT },
    );
    mapNode.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN + 10;
    mapNode.top = this.layoutBounds.top + 80;
    this.addChild(mapNode);

    // ── Globe (right) ────────────────────────────────────────────────────────
    const projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX + 260, this.layoutBounds.top + 220),
      radius: GLOBE_RADIUS,
      azimuth: Math.PI / 2, // bring the observer's meridian (RA 0h) to the front
      elevation: -0.35,
    });
    const globeNode = new EarthGlobeNode(
      projection,
      model.latitudeProperty,
      model.longitudeProperty,
      siderealTimeProperty,
      earthMapResolutionProperty,
      { radiusRatio: 1 },
    );
    const globeDragNode = new GlobeObserverDragNode(projection, model.latitudeProperty, model.longitudeProperty);
    this.addChild(new Node({ children: [globeNode, globeDragNode] }));

    // ── Readout / control panel ──────────────────────────────────────────────
    const titleText = new Text(controls.observerLocationStringProperty, {
      font: new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" }),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });

    const latitudeField = new EditableNumberFieldNode({
      labelProperty: controls.latitudeStringProperty,
      unit: "°",
      decimalPlaces: 1,
      onCommit: (value) => {
        model.latitudeProperty.value = model.latitudeProperty.range.constrainValue(value);
      },
    });
    model.latitudeProperty.link((value) => latitudeField.setDisplayValue(value));

    const longitudeField = new EditableNumberFieldNode({
      labelProperty: controls.longitudeStringProperty,
      unit: "°",
      decimalPlaces: 1,
      onCommit: (value) => {
        model.longitudeProperty.value = model.longitudeProperty.range.constrainValue(value);
      },
    });
    model.longitudeProperty.link((value) => longitudeField.setDisplayValue(value));

    const latitudeReadout = new DerivedProperty(
      [model.latitudeProperty, controls.northStringProperty, controls.southStringProperty],
      (lat, north, south) => formatLatitude(lat, 1, { north, south, east: "", west: "" }),
    );
    const longitudeReadout = new DerivedProperty(
      [model.longitudeProperty, controls.eastStringProperty, controls.westStringProperty],
      (lon, east, west) => formatLongitude(lon, 1, { north: "", south: "", east, west }),
    );
    const readoutProperty = new DerivedProperty([latitudeReadout, longitudeReadout], (lat, lon) => `${lat}    ${lon}`);
    const readoutText = new Text(readoutProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });

    const referenceCirclesCheckbox = new Checkbox(
      model.referenceCirclesVisibleProperty,
      new Text(controls.referenceCirclesStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
      }),
      {
        ...SIM_CHECKBOX_OPTIONS,
        accessibleName: a11y.controls.referenceCirclesStringProperty,
      },
    );

    const panel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [titleText, latitudeField, longitudeField, readoutText, referenceCirclesCheckbox],
      }),
    );
    panel.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN + 10;
    panel.top = mapNode.bottom + 24;
    this.addChild(panel);

    // ── Reset All ────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── Keyboard / reading traversal order ───────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [mapNode.map, latitudeField, longitudeField, referenceCirclesCheckbox, resetAllButton],
      }),
    );
  }

  public reset(): void {
    // Location lives in the model; nothing view-side to reset.
  }

  public override step(_dt: number): void {
    // Static screen.
  }
}
