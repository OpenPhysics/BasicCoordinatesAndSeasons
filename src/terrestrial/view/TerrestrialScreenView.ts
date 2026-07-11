/**
 * TerrestrialScreenView.ts
 *
 * The Terrestrial Coordinates screen: a draggable, pannable flat map (left) and a
 * full-size globe (right) that share one observer location, plus a panel with
 * editable latitude/longitude fields, a coordinate readout, a decimal/sexagesimal
 * format toggle, and "show cities" / "show map features" toggles. Two arrow buttons
 * under the map pan it east/west. Dragging the map cursor or the globe marker — or
 * typing a coordinate — keeps all three in sync.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { ArrowButton, Checkbox, RectangularPushButton, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { Animation, Easing } from "scenerystack/twixt";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import {
  CONTROL_FONT_SIZE,
  type CoordinateFormat,
  type EarthMapResolution,
  MAP_PAN_ANIMATION_DURATION,
  MAP_PAN_STEP_DEGREES,
  OBLIQUITY_DEGREES,
  SCREEN_VIEW_MARGIN,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/BasicCoordinatesAndSeasonsButtonOptions.js";
import { SIM_CHECKBOX_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsControlOptions.js";
import { BasicCoordinatesAndSeasonsPanel } from "../../common/BasicCoordinatesAndSeasonsPanel.js";
import { formatLatitude, formatLatitudeDMS, formatLongitude, formatLongitudeDMS } from "../../common/formatAngles.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { EditableNumberFieldNode } from "../../common/view/EditableNumberFieldNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CITIES } from "../model/CityData.js";
import { DATE_LINE } from "../model/DateLineData.js";
import type { TerrestrialModel } from "../model/TerrestrialModel.js";
import { GlobeObserverDragNode } from "./GlobeObserverDragNode.js";
import { TerrestrialMapNode } from "./TerrestrialMapNode.js";
import { TerrestrialScreenSummaryContent } from "./TerrestrialScreenSummaryContent.js";

const MAP_WIDTH = 500;
const MAP_HEIGHT = 250;
const GLOBE_RADIUS = 180;
const GLOBE_ROTATE_STEP_RADIANS = 0.3;

type TerrestrialScreenViewOptions = ScreenViewOptions & {
  earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>;
};

export class TerrestrialScreenView extends ScreenView {
  private panAnimation: Animation | null = null;
  private globeRotateAnimation: Animation | null = null;
  private readonly projection: SkyProjection;

  public constructor(model: TerrestrialModel, options: TerrestrialScreenViewOptions) {
    const { earthMapResolutionProperty, ...screenViewOptions } = options;
    super({
      screenSummaryContent: new TerrestrialScreenSummaryContent(model),
      ...screenViewOptions,
    });

    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getTerrestrialA11yStrings();

    // Colored, on-map indicator labels (longitude = east/west, latitude = north/south).
    // They honor the decimal/sexagesimal format toggle, like the readout.
    const latitudeLabelProperty = new DerivedProperty(
      [
        model.latitudeProperty,
        model.coordinateFormatProperty,
        controls.northStringProperty,
        controls.southStringProperty,
        controls.eastStringProperty,
        controls.westStringProperty,
      ],
      (lat, format, north, south, east, west) =>
        format === "sexagesimal"
          ? formatLatitudeDMS(lat, { north, south, east, west })
          : formatLatitude(lat, 1, { north, south, east, west }),
    );
    const longitudeLabelProperty = new DerivedProperty(
      [
        model.longitudeProperty,
        model.coordinateFormatProperty,
        controls.northStringProperty,
        controls.southStringProperty,
        controls.eastStringProperty,
        controls.westStringProperty,
      ],
      (lon, format, north, south, east, west) =>
        format === "sexagesimal"
          ? formatLongitudeDMS(lon, { north, south, east, west })
          : formatLongitude(lon, 1, { north, south, east, west }),
    );

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
      model.mapCenterLongitudeProperty,
      model.showCitiesProperty,
      model.mapFeaturesVisibleProperty,
      {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        coordinateIndicator: {
          longitudeLabelProperty,
          latitudeLabelProperty,
        },
      },
    );
    mapNode.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN;
    mapNode.top = this.layoutBounds.top + 62;
    this.addChild(mapNode);

    const buttonY = mapNode.top - 26;

    // Map pan buttons (animated ±45° like NAAP): ◀ pans west, ▶ pans east.
    const panBy = (deltaDegrees: number): void => {
      this.panAnimation?.stop();
      const from = model.mapCenterLongitudeProperty.value;
      this.panAnimation = new Animation({
        duration: MAP_PAN_ANIMATION_DURATION,
        easing: Easing.CUBIC_OUT,
        setValue: (value: number) => {
          model.mapCenterLongitudeProperty.value = value;
        },
        from,
        to: from + deltaDegrees,
      });
      this.panAnimation.start();
    };
    const panWestButton = new ArrowButton("left", () => panBy(-MAP_PAN_STEP_DEGREES), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.panWestStringProperty,
    });
    const panEastButton = new ArrowButton("right", () => panBy(MAP_PAN_STEP_DEGREES), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.panEastStringProperty,
    });
    const panButtons = new HBox({ spacing: 60, children: [panWestButton, panEastButton] });
    panButtons.centerX = mapNode.centerX;
    panButtons.top = buttonY;
    this.addChild(panButtons);

    // ── Globe (right) ────────────────────────────────────────────────────────
    this.projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX + 240, this.layoutBounds.top + 242),
      radius: GLOBE_RADIUS,
      azimuth: Math.PI / 2, // bring the observer's meridian (RA 0h) to the front
      elevation: -0.35,
    });
    const projection = this.projection;
    const polarCircleLatitude = 90 - OBLIQUITY_DEGREES; // 66.6°
    const globeNode = new EarthGlobeNode(
      projection,
      model.latitudeProperty,
      model.longitudeProperty,
      siderealTimeProperty,
      earthMapResolutionProperty,
      {
        radiusRatio: 1,
        overlays: {
          cities: CITIES,
          dateLine: DATE_LINE,
          referenceCircleLatitudes: [OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLatitude, -polarCircleLatitude],
          showCitiesProperty: model.showCitiesProperty,
          mapFeaturesVisibleProperty: model.mapFeaturesVisibleProperty,
          longitudeLabelProperty,
          latitudeLabelProperty,
        },
      },
    );
    const globeDragNode = new GlobeObserverDragNode(projection, model.latitudeProperty, model.longitudeProperty);
    this.addChild(new Node({ children: [globeNode, globeDragNode] }));

    // Globe rotate buttons: ◀ rotates west, ▶ rotates east (same y as map pan buttons).
    const rotateGlobeBy = (deltaRadians: number): void => {
      this.globeRotateAnimation?.stop();
      const from = this.projection.azimuthProperty.value;
      this.globeRotateAnimation = new Animation({
        duration: MAP_PAN_ANIMATION_DURATION,
        easing: Easing.CUBIC_OUT,
        setValue: (value: number) => {
          this.projection.azimuthProperty.value = value;
        },
        from,
        to: from + deltaRadians,
      });
      this.globeRotateAnimation.start();
    };
    const globeWestButton = new ArrowButton("left", () => rotateGlobeBy(-GLOBE_ROTATE_STEP_RADIANS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.panWestStringProperty,
    });
    const globeEastButton = new ArrowButton("right", () => rotateGlobeBy(GLOBE_ROTATE_STEP_RADIANS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.panEastStringProperty,
    });
    const globeButtons = new HBox({ spacing: 60, children: [globeWestButton, globeEastButton] });
    globeButtons.centerX = this.projection.center.x;
    globeButtons.top = buttonY;
    this.addChild(globeButtons);

    // ── Observer location panel (left) ────────────────────────────────────────
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

    // Readout honors the decimal/sexagesimal toggle; the editable fields above stay
    // decimal input.
    const readoutProperty = new DerivedProperty(
      [
        model.latitudeProperty,
        model.longitudeProperty,
        model.coordinateFormatProperty,
        controls.northStringProperty,
        controls.southStringProperty,
        controls.eastStringProperty,
        controls.westStringProperty,
      ],
      (lat, lon, format, north, south, east, west) => {
        const letters = { north, south, east, west };
        const latStr = format === "sexagesimal" ? formatLatitudeDMS(lat, letters) : formatLatitude(lat, 1, letters);
        const lonStr = format === "sexagesimal" ? formatLongitudeDMS(lon, letters) : formatLongitude(lon, 1, letters);
        return `${latStr}    ${lonStr}`;
      },
    );
    const readoutText = new Text(readoutProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });

    // Opens Google Maps at the observer's latitude/longitude, like NAAP's openGoogle().
    const googleMapsButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.openInGoogleMapsStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 190,
      }),
      listener: () => {
        const lat = model.latitudeProperty.value;
        const lon = model.longitudeProperty.value;
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, "_blank", "noopener,noreferrer");
      },
      accessibleName: a11y.controls.googleMapsStringProperty,
    });

    const useMyLocationButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.useMyLocationStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 190,
      }),
      listener: () => {
        useMyLocationButton.enabled = false;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            model.latitudeProperty.value = position.coords.latitude;
            model.longitudeProperty.value = position.coords.longitude;
            useMyLocationButton.enabled = true;
          },
          () => {
            useMyLocationButton.enabled = true;
          },
        );
      },
      accessibleName: a11y.controls.useMyLocationStringProperty,
    });

    const formatRadioGroup = new VerticalAquaRadioButtonGroup<CoordinateFormat>(
      model.coordinateFormatProperty,
      [
        {
          value: "decimal",
          createNode: () =>
            new Text(controls.decimalStringProperty, {
              font: new PhetFont(CONTROL_FONT_SIZE),
              fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
            }),
          options: { accessibleName: controls.decimalStringProperty },
        },
        {
          value: "sexagesimal",
          createNode: () =>
            new Text(controls.sexagesimalStringProperty, {
              font: new PhetFont(CONTROL_FONT_SIZE),
              fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
            }),
          options: { accessibleName: controls.sexagesimalStringProperty },
        },
      ],
      { spacing: 5, radioButtonOptions: { radius: 7 } },
    );

    const observerPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 3,
        children: [
          titleText,
          new HBox({ spacing: 5, children: [latitudeField, longitudeField] }),
          readoutText,
          new HBox({ spacing: 8, align: "top", children: [googleMapsButton, formatRadioGroup] }),
          useMyLocationButton,
        ],
      }),
    );
    observerPanel.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN;
    observerPanel.top = mapNode.bottom + 4;
    this.addChild(observerPanel);

    // ── Display-options panel (right) ────────────────────────────────────────
    const showCitiesCheckbox = new Checkbox(
      model.showCitiesProperty,
      new Text(controls.showCitiesStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
      }),
      {
        ...SIM_CHECKBOX_OPTIONS,
        accessibleName: a11y.controls.showCitiesStringProperty,
      },
    );

    const mapFeaturesCheckbox = new Checkbox(
      model.mapFeaturesVisibleProperty,
      new Text(controls.mapFeaturesStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
      }),
      {
        ...SIM_CHECKBOX_OPTIONS,
        accessibleName: a11y.controls.mapFeaturesStringProperty,
      },
    );

    const displayPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [showCitiesCheckbox, mapFeaturesCheckbox],
      }),
    );
    displayPanel.left = observerPanel.right + 10;
    displayPanel.top = observerPanel.top;
    this.addChild(displayPanel);

    // ── Reset All ────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.reset();
        model.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── Keyboard / reading traversal order ───────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          mapNode.map,
          globeDragNode,
          panWestButton,
          panEastButton,
          globeWestButton,
          globeEastButton,
          observerPanel,
          useMyLocationButton,
          displayPanel,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // Stop any in-flight animations so they do not overwrite the model reset.
    this.panAnimation?.stop();
    this.panAnimation = null;
    this.globeRotateAnimation?.stop();
    this.globeRotateAnimation = null;
    // Restore the globe's camera orientation (Shift-drag can spin/tilt it).
    this.projection.reset();
  }

  public override step(_dt: number): void {
    // Static screen.
  }
}
