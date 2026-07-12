/**
 * CelestialScreenView.ts
 *
 * The Celestial Coordinates screen: a flat RA×Dec sky map (left) and a rotatable
 * celestial sphere (right) that share one star. The sphere carries the star's
 * RA hour-circle and declination-circle guides (CoordinateGuideNode). Two panels
 * hold star-position readout/format and display-option checkboxes. Animated
 * shift-map buttons sit above the flat map and rotate buttons above the sphere,
 * matching the terrestrial screen's layout.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { ArrowButton, Checkbox, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { Animation, Easing } from "scenerystack/twixt";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import {
  CONTROL_FONT_SIZE,
  type CoordinateFormat,
  MAP_PAN_ANIMATION_DURATION,
  SCREEN_VIEW_MARGIN,
  SPHERE_RADIUS,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsButtonOptions.js";
import { SIM_CHECKBOX_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsControlOptions.js";
import { BasicCoordinatesAndSeasonsPanel } from "../../common/BasicCoordinatesAndSeasonsPanel.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { CoordinateGuideNode } from "../../common/view/CoordinateGuideNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { CelestialModel } from "../model/CelestialModel.js";
import { CelestialScreenSummaryContent } from "./CelestialScreenSummaryContent.js";
import { FlatSkyMapNode } from "./FlatSkyMapNode.js";
import { StarFieldNode } from "./StarFieldNode.js";

const MAP_WIDTH = 430;
const MAP_HEIGHT = 300;

/** Radians of sphere rotation per button press. */
const SPHERE_ROTATE_STEP_RADIANS = 0.3;

/** Hours of RA shift per button press. */
const RA_SHIFT_STEP_HOURS = 3;

export class CelestialScreenView extends ScreenView {
  private shiftMapAnimation: Animation | null = null;
  private sphereRotateAnimation: Animation | null = null;
  private readonly projection: SkyProjection;

  public constructor(model: CelestialModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new CelestialScreenSummaryContent(model),
      ...options,
    });

    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getCelestialA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
      }),
    );

    // ── Flat sky map (left) ──────────────────────────────────────────────────
    const flatMap = new FlatSkyMapNode(
      model.starRaProperty,
      model.starDecProperty,
      model.constellationsVisibleProperty,
      model.raOffsetProperty,
      model.celestialEquatorVisibleProperty,
      model.eclipticVisibleProperty,
      model.galacticEquatorVisibleProperty,
      model.equinoxesAndSolsticesVisibleProperty,
      model.coordinateFormatProperty,
      {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        accessibleName: a11y.controls.flatSkyMapStarStringProperty,
        accessibleHelpText: a11y.controls.flatSkyMapStarHelpStringProperty,
      },
    );
    flatMap.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN + 10;
    flatMap.top = this.layoutBounds.top + 70;
    this.addChild(flatMap);

    // ── Shift-map buttons above the flat sky map ────────────────────────────
    // Like the terrestrial map's pan buttons, these scroll the whole sky map
    // (animating the RA offset); FlatSkyMapNode tiles/wraps the content and keeps
    // the star marker anchored to its coordinate as the map pans beneath it.
    const shiftMapBy = (deltaHours: number): void => {
      this.shiftMapAnimation?.stop();
      const from = model.raOffsetProperty.value;
      this.shiftMapAnimation = new Animation({
        duration: MAP_PAN_ANIMATION_DURATION,
        easing: Easing.CUBIC_OUT,
        setValue: (value: number) => {
          model.raOffsetProperty.value = value;
        },
        from,
        to: from + deltaHours,
      });
      this.shiftMapAnimation.start();
    };
    const shiftWestButton = new ArrowButton("left", () => shiftMapBy(RA_SHIFT_STEP_HOURS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.shiftMapLeftStringProperty,
    });
    const shiftEastButton = new ArrowButton("right", () => shiftMapBy(-RA_SHIFT_STEP_HOURS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.shiftMapRightStringProperty,
    });
    const shiftMapButtons = new HBox({ spacing: 60, children: [shiftWestButton, shiftEastButton] });
    shiftMapButtons.centerX = flatMap.centerX;
    shiftMapButtons.top = flatMap.top - 26;
    this.addChild(shiftMapButtons);

    // ── Celestial sphere (right) ─────────────────────────────────────────────
    this.projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX + 250, this.layoutBounds.top + 230),
      radius: SPHERE_RADIUS,
      elevation: -0.35,
    });
    const projection = this.projection;
    const sphereNode = new CelestialSphereNode(projection, {
      gridVisibleProperty: model.gridVisibleProperty,
      celestialEquatorVisibleProperty: model.celestialEquatorVisibleProperty,
      eclipticVisibleProperty: model.eclipticVisibleProperty,
      galacticEquatorVisibleProperty: model.galacticEquatorVisibleProperty,
      equinoxesAndSolsticesVisibleProperty: model.equinoxesAndSolsticesVisibleProperty,
      celestialPolesVisibleProperty: model.celestialPolesVisibleProperty,
    });
    const starField = new StarFieldNode(projection);
    const guideNode = new CoordinateGuideNode(projection, {
      guideRaProperty: model.starRaProperty,
      guideDecProperty: model.starDecProperty,
      visibleProperty: new BooleanProperty(true),
      accessibleNameProperty: a11y.controls.guideStarStringProperty,
      accessibleHelpTextProperty: a11y.controls.guideStarHelpStringProperty,
    });

    // Transparent hit target behind the sphere content: drags here rotate the
    // camera; drags on the guide star (on top) move the star.
    const cameraTarget = new Rectangle(
      projection.center.x - SPHERE_RADIUS,
      projection.center.y - SPHERE_RADIUS,
      SPHERE_RADIUS * 2,
      SPHERE_RADIUS * 2,
    );
    attachSkyCameraInteraction(cameraTarget, {
      projection,
      accessibleNameProperty: a11y.controls.celestialSphereStringProperty,
      accessibleHelpTextProperty: a11y.controls.celestialSphereHelpStringProperty,
    });

    // Paint order: hit target → dashed far side → dim back stars → solid near
    // side → solid front stars → guide star (on top).
    this.addChild(
      new Node({
        children: [
          cameraTarget,
          sphereNode.backLayer,
          starField.backLayer,
          guideNode.backLayer,
          sphereNode.frontLayer,
          starField.frontLayer,
          guideNode.frontLayer,
        ],
      }),
    );

    // ── Rotate-sphere buttons above the sphere ──────────────────────────────
    const rotateSphereBy = (deltaRadians: number): void => {
      this.sphereRotateAnimation?.stop();
      const from = this.projection.azimuthProperty.value;
      this.sphereRotateAnimation = new Animation({
        duration: MAP_PAN_ANIMATION_DURATION,
        easing: Easing.CUBIC_OUT,
        setValue: (value: number) => {
          this.projection.azimuthProperty.value = value;
        },
        from,
        to: from + deltaRadians,
      });
      this.sphereRotateAnimation.start();
    };
    const rotateWestButton = new ArrowButton("left", () => rotateSphereBy(-SPHERE_ROTATE_STEP_RADIANS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.rotateSphereLeftStringProperty,
    });
    const rotateEastButton = new ArrowButton("right", () => rotateSphereBy(SPHERE_ROTATE_STEP_RADIANS), {
      arrowWidth: 12,
      arrowHeight: 12,
      accessibleName: a11y.controls.rotateSphereRightStringProperty,
    });
    const sphereRotateButtons = new HBox({ spacing: 60, children: [rotateWestButton, rotateEastButton] });
    sphereRotateButtons.centerX = this.projection.center.x;
    sphereRotateButtons.top = this.layoutBounds.top + 70 - 26;
    this.addChild(sphereRotateButtons);

    // ── Star Position panel (left) ──────────────────────────────────────────
    const titleText = new Text(controls.starPositionStringProperty, {
      font: new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" }),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });
    const readoutNode = new SkyReadoutNode({ raProperty: model.starRaProperty, decProperty: model.starDecProperty });

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

    const starPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [titleText, readoutNode, formatRadioGroup],
      }),
    );
    starPanel.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN + 10;
    starPanel.top = flatMap.bottom + 20;
    this.addChild(starPanel);

    // ── Display Options panel (right) ───────────────────────────────────────
    const displayTitleText = new Text(controls.displayOptionsStringProperty, {
      font: new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" }),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });

    const makeCheckbox = (property: BooleanProperty, labelProperty: TReadOnlyProperty<string>): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, {
          font: new PhetFont(CONTROL_FONT_SIZE),
          fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
        }),
        { ...SIM_CHECKBOX_OPTIONS, accessibleName: labelProperty },
      );

    const gridCheckbox = makeCheckbox(model.gridVisibleProperty, controls.showGridStringProperty);
    const equatorCheckbox = makeCheckbox(
      model.celestialEquatorVisibleProperty,
      controls.showCelestialEquatorStringProperty,
    );
    const eclipticCheckbox = makeCheckbox(model.eclipticVisibleProperty, controls.showEclipticStringProperty);
    const galacticCheckbox = makeCheckbox(
      model.galacticEquatorVisibleProperty,
      controls.showGalacticEquatorStringProperty,
    );
    const equinoxSolsticeCheckbox = makeCheckbox(
      model.equinoxesAndSolsticesVisibleProperty,
      controls.showEquinoxesAndSolsticesStringProperty,
    );
    const polesCheckbox = makeCheckbox(model.celestialPolesVisibleProperty, controls.showCelestialPolesStringProperty);
    const constellationsCheckbox = makeCheckbox(
      model.constellationsVisibleProperty,
      controls.showConstellationsStringProperty,
    );

    const displayPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          displayTitleText,
          gridCheckbox,
          equatorCheckbox,
          eclipticCheckbox,
          galacticCheckbox,
          equinoxSolsticeCheckbox,
          polesCheckbox,
          constellationsCheckbox,
        ],
      }),
    );
    displayPanel.left = starPanel.right + 10;
    displayPanel.top = starPanel.top;
    this.addChild(displayPanel);

    // ── Reset All ────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
        projection.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── Keyboard / reading traversal order ───────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          flatMap,
          shiftWestButton,
          shiftEastButton,
          cameraTarget,
          rotateWestButton,
          rotateEastButton,
          guideNode.frontLayer,
          readoutNode,
          formatRadioGroup,
          starPanel,
          gridCheckbox,
          equatorCheckbox,
          eclipticCheckbox,
          galacticCheckbox,
          equinoxSolsticeCheckbox,
          polesCheckbox,
          constellationsCheckbox,
          displayPanel,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    this.shiftMapAnimation?.stop();
    this.shiftMapAnimation = null;
    this.sphereRotateAnimation?.stop();
    this.sphereRotateAnimation = null;
  }

  public override step(_dt: number): void {
    // Static screen.
  }
}
