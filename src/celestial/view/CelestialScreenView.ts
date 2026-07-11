/**
 * CelestialScreenView.ts
 *
 * The Celestial Coordinates screen: a flat RA×Dec sky map (left) and a rotatable
 * celestial sphere (right) that share one star. The sphere carries the star's
 * RA hour-circle and declination-circle guides (CoordinateGuideNode). A panel
 * has editable RA/Dec fields and toggles for the grid, celestial equator,
 * ecliptic, and zodiac constellations.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { BooleanProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox } from "scenerystack/sun";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, SCREEN_VIEW_MARGIN, SPHERE_RADIUS } from "../../BasicCoordinatesAndSeasonsConstants.js";
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

export class CelestialScreenView extends ScreenView {
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

    // ── Celestial sphere (right) ─────────────────────────────────────────────
    const projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX + 250, this.layoutBounds.top + 230),
      radius: SPHERE_RADIUS,
      elevation: -0.35,
    });
    const sphereNode = new CelestialSphereNode(projection, {
      gridVisibleProperty: model.gridVisibleProperty,
      celestialEquatorVisibleProperty: model.celestialEquatorVisibleProperty,
      eclipticVisibleProperty: model.eclipticVisibleProperty,
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
      { fill: "rgba(0,0,0,0)" },
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

    // ── Readout / control panel ──────────────────────────────────────────────
    const titleText = new Text(controls.starPositionStringProperty, {
      font: new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" }),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });
    const readoutNode = new SkyReadoutNode({ raProperty: model.starRaProperty, decProperty: model.starDecProperty });

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
    const constellationsCheckbox = makeCheckbox(
      model.constellationsVisibleProperty,
      controls.showConstellationsStringProperty,
    );

    const panel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [titleText, readoutNode, gridCheckbox, equatorCheckbox, eclipticCheckbox, constellationsCheckbox],
      }),
    );
    panel.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN + 10;
    panel.top = flatMap.bottom + 20;
    this.addChild(panel);

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

    this.addChild(
      new Node({
        pdomOrder: [
          flatMap,
          cameraTarget,
          guideNode.frontLayer,
          readoutNode,
          gridCheckbox,
          equatorCheckbox,
          eclipticCheckbox,
          constellationsCheckbox,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // Star and toggles live in the model; the projection is reset by the button listener.
  }

  public override step(_dt: number): void {
    // Static screen.
  }
}
