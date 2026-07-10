/**
 * SeasonsScreenView.ts
 *
 * The Seasons screen: an orbit view (Sun-centred, draggable Earth with a fixed
 * tilted axis), a celestial sphere with the Sun on the ecliptic, an Earth
 * close-up with the day/night terminator, and a sunbeam angle-of-incidence panel,
 * plus play/pause, a latitude control, live readouts (date, λ☉, δ☉, α☉, noon Sun
 * altitude), and visibility toggles.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed, Vector2 } from "scenerystack/dot";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox } from "scenerystack/sun";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, SCREEN_VIEW_MARGIN, SPHERE_RADIUS } from "../../BasicCoordinatesAndSeasonsConstants.js";
import {
  FLAT_BUTTON_APPEARANCE_OPTIONS,
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/BasicCoordinatesAndSeasonsButtonOptions.js";
import {
  SIM_CHECKBOX_OPTIONS,
  SIM_NUMBER_CONTROL_OPTIONS,
} from "../../common/BasicCoordinatesAndSeasonsControlOptions.js";
import { BasicCoordinatesAndSeasonsPanel } from "../../common/BasicCoordinatesAndSeasonsPanel.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";
import { EarthCloseUpNode } from "./EarthCloseUpNode.js";
import { OrbitViewNode } from "./OrbitViewNode.js";
import { SeasonsScreenSummaryContent } from "./SeasonsScreenSummaryContent.js";
import { SeasonsSphereNode } from "./SeasonsSphereNode.js";
import { SunbeamSpreadNode } from "./SunbeamSpreadNode.js";
import { createSeasonsDateProperty } from "./seasonsDate.js";

export class SeasonsScreenView extends ScreenView {
  public constructor(model: SeasonsModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SeasonsScreenSummaryContent(model),
      ...options,
    });

    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getSeasonsA11yStrings();
    const font = new PhetFont(CONTROL_FONT_SIZE);
    const textColor = BasicCoordinatesAndSeasonsColors.textColorProperty;

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
      }),
    );

    // ── Orbit view (top-left) ────────────────────────────────────────────────
    const orbitView = new OrbitViewNode(model, {
      radius: 128,
      accessibleName: a11y.controls.earthStringProperty,
      accessibleHelpText: a11y.controls.earthHelpStringProperty,
      seasonLabels: {
        marchEquinox: controls.marchEquinoxStringProperty.value,
        juneSolstice: controls.juneSolsticeStringProperty.value,
        septemberEquinox: controls.septemberEquinoxStringProperty.value,
        decemberSolstice: controls.decemberSolsticeStringProperty.value,
      },
    });
    orbitView.center = new Vector2(this.layoutBounds.left + 235, this.layoutBounds.top + 220);
    this.addChild(orbitView);

    // ── Celestial sphere with the Sun on the ecliptic (top-right) ────────────
    const projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.right - 190, this.layoutBounds.top + 170),
      radius: 100,
      elevation: -0.35,
    });
    const cameraTarget = new Rectangle(
      projection.center.x - SPHERE_RADIUS,
      projection.center.y - SPHERE_RADIUS,
      SPHERE_RADIUS * 2,
      SPHERE_RADIUS * 2,
      { fill: "rgba(0,0,0,0)" },
    );
    attachSkyCameraInteraction(cameraTarget, {
      projection,
      accessibleNameProperty: controls.starPositionStringProperty,
    });
    this.addChild(new Node({ children: [cameraTarget, new SeasonsSphereNode(projection, model)] }));

    // ── Earth close-up (middle) ──────────────────────────────────────────────
    const earthCloseUp = new EarthCloseUpNode(model, { radius: 48 });
    earthCloseUp.center = new Vector2(this.layoutBounds.centerX + 30, this.layoutBounds.top + 150);
    this.addChild(earthCloseUp);

    // ── Sunbeam panel (middle-right) ─────────────────────────────────────────
    const sunbeam = new SunbeamSpreadNode(model, { width: 240, height: 130 });
    sunbeam.center = new Vector2(this.layoutBounds.centerX + 40, this.layoutBounds.top + 340);
    this.addChild(sunbeam);

    // ── Readouts + controls panel (bottom-left) ──────────────────────────────
    const dateProperty = createSeasonsDateProperty(model);
    const makeReadout = (labelProperty: TReadOnlyProperty<string>, valueProperty: TReadOnlyProperty<string>): HBox =>
      new HBox({
        spacing: 5,
        align: "center",
        children: [
          new Text(labelProperty, { font, fill: textColor }),
          new Text(valueProperty, { font, fill: textColor, fontWeight: "bold" }),
        ],
      });

    const readouts = new VBox({
      align: "left",
      spacing: 3,
      children: [
        makeReadout(controls.dateStringProperty, dateProperty),
        makeReadout(
          controls.eclipticLongitudeStringProperty,
          new DerivedProperty([model.sunEclipticLongitudeProperty], (v) => `${toFixed(v, 1)}°`),
        ),
        makeReadout(
          controls.sunDeclinationStringProperty,
          new DerivedProperty([model.sunDeclinationProperty], (v) => `${toFixed(v, 1)}°`),
        ),
        makeReadout(
          controls.sunRightAscensionStringProperty,
          new DerivedProperty([model.sunRightAscensionProperty], (v) => `${toFixed(v, 1)} h`),
        ),
        makeReadout(
          controls.noonSunAltitudeStringProperty,
          new DerivedProperty([model.noonSunAltitudeProperty], (v) => `${toFixed(v, 1)}°`),
        ),
      ],
    });

    const latitudeControl = new NumberControl(
      controls.latitudeStringProperty,
      model.latitudeProperty,
      model.latitudeProperty.range,
      {
        ...SIM_NUMBER_CONTROL_OPTIONS,
        delta: 1,
        titleNodeOptions: { font, fill: textColor },
        numberDisplayOptions: {
          decimalPlaces: 0,
          textOptions: { font, fill: BasicCoordinatesAndSeasonsColors.controlSurfaceTextColorProperty },
        },
        accessibleName: controls.latitudeStringProperty,
      },
    );

    const makeCheckbox = (
      property: typeof model.eclipticVisibleProperty,
      labelProperty: TReadOnlyProperty<string>,
    ): Checkbox =>
      new Checkbox(property, new Text(labelProperty, { font, fill: textColor }), {
        ...SIM_CHECKBOX_OPTIONS,
        accessibleName: labelProperty,
      });

    const subsolarCheckbox = makeCheckbox(model.subsolarPointVisibleProperty, controls.showSubsolarPointStringProperty);
    const eclipticCheckbox = makeCheckbox(model.eclipticVisibleProperty, controls.showEclipticStringProperty);
    const equatorCheckbox = makeCheckbox(
      model.celestialEquatorVisibleProperty,
      controls.showCelestialEquatorStringProperty,
    );

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: { ...FLAT_BUTTON_APPEARANCE_OPTIONS, listener: () => model.step(1 / 60) },
      },
    });

    const panel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [timeControl, readouts, latitudeControl, subsolarCheckbox, eclipticCheckbox, equatorCheckbox],
      }),
    );
    panel.left = this.layoutBounds.left + SCREEN_VIEW_MARGIN;
    panel.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
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
          orbitView,
          cameraTarget,
          timeControl,
          latitudeControl,
          subsolarCheckbox,
          eclipticCheckbox,
          equatorCheckbox,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // State lives in the model; the projection is reset by the button listener.
  }

  public override step(_dt: number): void {
    // The framework calls model.step via the Screen; nothing view-side to advance.
  }
}
