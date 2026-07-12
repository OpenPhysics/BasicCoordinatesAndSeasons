/**
 * SeasonsScreenView.ts
 *
 * The Seasons screen, laid out after the NAAP "Seasons and Ecliptic Simulator":
 *
 *   ┌───────────────────────────┬─────────────────────────┐
 *   │  large "stage": orbit view │  Earth close-up (top)   │
 *   │  OR celestial sphere       ├─────────────────────────┤
 *   │  (toggled below)           │  sunbeam angle panel    │
 *   └───────────────────────────┴─────────────────────────┘
 *   [view toggle + subsolar] [ month scrubber + date + ▶ ] [latitude] [Reset]
 *
 * Each visualization sits on a framed near-black "stage" with an italic
 * instruction caption and in-panel readouts, matching the original.
 */

import {
  DerivedProperty,
  Multilink,
  PatternStringProperty,
  type PhetioProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HBox, Node, Rectangle, Text, type TPaint, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, SCREEN_VIEW_MARGIN } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/BasicCoordinatesAndSeasonsButtonOptions.js";
import {
  SIM_CHECKBOX_OPTIONS,
  SIM_NUMBER_CONTROL_OPTIONS,
} from "../../common/BasicCoordinatesAndSeasonsControlOptions.js";
import { BasicCoordinatesAndSeasonsPanel } from "../../common/BasicCoordinatesAndSeasonsPanel.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { EarthViewMode, SeasonsModel, SeasonsViewMode, SunbeamMode } from "../model/SeasonsModel.js";
import { EarthCloseUpNode } from "./EarthCloseUpNode.js";
import { EarthFromSunNode } from "./EarthFromSunNode.js";
import { MonthSelectorNode } from "./MonthSelectorNode.js";
import { OrbitViewNode } from "./OrbitViewNode.js";
import { SeasonsScreenSummaryContent } from "./SeasonsScreenSummaryContent.js";
import { SeasonsSphereNode } from "./SeasonsSphereNode.js";
import { SunbeamSpreadNode } from "./SunbeamSpreadNode.js";
import { SunlightAngleNode } from "./SunlightAngleNode.js";
import { createSeasonsDateProperty } from "./seasonsDate.js";

// ── Stage geometry (layoutBounds 1024 × 618) ──────────────────────────────────
const STAGE_MARGIN = 12;
const LEFT_STAGE = { x: 12, y: 8, w: 576, h: 470 };
const EARTH_STAGE = { x: 596, y: 8, w: 416, h: 232 };
const SUNBEAM_STAGE = { x: 596, y: 248, w: 416, h: 230 };

export class SeasonsScreenView extends ScreenView {
  public constructor(model: SeasonsModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SeasonsScreenSummaryContent(model),
      ...options,
    });

    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getSeasonsA11yStrings();
    const font = new PhetFont(CONTROL_FONT_SIZE);
    const captionFont = new PhetFont({ size: CONTROL_FONT_SIZE - 1, style: "italic" });
    const textColor = BasicCoordinatesAndSeasonsColors.textColorProperty;
    const captionColor = BasicCoordinatesAndSeasonsColors.viewCaptionColorProperty;

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
      }),
    );

    // A framed near-black "stage" at (x,y) with clipped local content 0..w × 0..h.
    const makeStage = (rect: { x: number; y: number; w: number; h: number }): { stage: Node; border: Rectangle } => {
      const stage = new Node({
        x: rect.x,
        y: rect.y,
        clipArea: Shape.rect(0, 0, rect.w, rect.h),
        children: [
          new Rectangle(0, 0, rect.w, rect.h, { fill: BasicCoordinatesAndSeasonsColors.viewFrameFillColorProperty }),
        ],
      });
      const border = new Rectangle(rect.x, rect.y, rect.w, rect.h, {
        stroke: BasicCoordinatesAndSeasonsColors.viewFrameStrokeColorProperty,
        lineWidth: 1.5,
      });
      return { stage, border };
    };

    const caption = (string: TReadOnlyProperty<string>): Text =>
      new Text(string, { font: captionFont, fill: captionColor, maxWidth: 260 });

    const makeReadout = (labelProperty: TReadOnlyProperty<string>, valueProperty: TReadOnlyProperty<string>): HBox =>
      new HBox({
        spacing: 5,
        align: "center",
        children: [
          new Text(labelProperty, { font, fill: textColor }),
          new Text(valueProperty, { font, fill: textColor, fontWeight: "bold" }),
        ],
      });

    const radioLabel = (string: TReadOnlyProperty<string>, fill: TPaint = textColor): Text =>
      new Text(string, { font, fill });

    // A compact radio group in its own small panel (used for the in-stage view toggles).
    const makeRadioPanel = <T extends string>(
      property: PhetioProperty<T>,
      items: readonly { value: T; label: TReadOnlyProperty<string> }[],
    ): { group: VerticalAquaRadioButtonGroup<T>; panel: BasicCoordinatesAndSeasonsPanel } => {
      const group = new VerticalAquaRadioButtonGroup<T>(
        property,
        items.map((it) => ({ value: it.value, createNode: () => radioLabel(it.label) })),
        { spacing: 5, radioButtonOptions: { radius: 7 } },
      );
      return { group, panel: new BasicCoordinatesAndSeasonsPanel(group, { xMargin: 8, yMargin: 6 }) };
    };

    const dateProperty = createSeasonsDateProperty(model);

    // Live spoken responses so keyboard users hear the result of dragging Earth
    // around its orbit / scrubbing the date, and of moving the observer's latitude.
    const dateResponseProperty = new PatternStringProperty(a11y.dateResponsePatternStringProperty, {
      date: dateProperty,
    });
    const latitudeResponseProperty = new PatternStringProperty(a11y.latitudeResponsePatternStringProperty, {
      latitude: new DerivedProperty(
        [controls.northStringProperty, controls.southStringProperty, model.latitudeProperty],
        (north, south, lat) => `${toFixed(Math.abs(lat), 1)}° ${lat >= 0 ? north : south}`,
      ),
    });

    // ── Left stage: orbit view ⇄ celestial sphere ────────────────────────────
    const left = makeStage(LEFT_STAGE);

    const orbitView = new OrbitViewNode(model, {
      radius: 172,
      accessibleName: a11y.controls.earthStringProperty,
      accessibleHelpText: a11y.controls.earthHelpStringProperty,
      accessibleObjectResponseProperty: dateResponseProperty,
      seasonLabels: {
        marchEquinox: controls.marchEquinoxStringProperty.value,
        juneSolstice: controls.juneSolsticeStringProperty.value,
        septemberEquinox: controls.septemberEquinoxStringProperty.value,
        decemberSolstice: controls.decemberSolsticeStringProperty.value,
      },
    });
    orbitView.center = new Vector2(LEFT_STAGE.w / 2, LEFT_STAGE.h / 2 - 5);

    const sphereRadius = 150;
    const projection = new SkyProjection({
      center: new Vector2(LEFT_STAGE.w / 2, LEFT_STAGE.h / 2 - 15),
      radius: sphereRadius,
      // Spin so the vernal equinox (RA 0ʰ) faces the viewer, putting the Sun near the
      // front for dates around the NAAP reset (February), matching the Flash view.
      azimuth: Math.PI / 2,
      // Tilt further above the equatorial plane (~30°, matching NAAP's viewerAltitude)
      // so the equator and ecliptic open into readable ellipses and their labels /
      // equinox-solstice markers separate vertically instead of stacking on the rim.
      elevation: -0.52,
    });
    const cameraTarget = new Rectangle(
      projection.center.x - sphereRadius,
      projection.center.y - sphereRadius,
      sphereRadius * 2,
      sphereRadius * 2,
      { fill: "rgba(0,0,0,0)" },
    );
    attachSkyCameraInteraction(cameraTarget, {
      projection,
      accessibleNameProperty: controls.starPositionStringProperty,
    });
    const sphereGroup = new Node({ children: [cameraTarget, new SeasonsSphereNode(projection, model)] });

    const perspectiveCaption = caption(controls.dragPerspectiveHintStringProperty);
    perspectiveCaption.leftTop = new Vector2(10, 8);
    const dragEarthCaption = caption(controls.dragEarthHintStringProperty);
    dragEarthCaption.rightTop = new Vector2(LEFT_STAGE.w - 10, 8);

    const leftReadouts = new VBox({
      align: "left",
      spacing: 3,
      children: [
        makeReadout(
          controls.sunDeclinationStringProperty,
          new DerivedProperty([model.sunDeclinationProperty], (v) => `${toFixed(v, 1)}°`),
        ),
        makeReadout(
          controls.sunRightAscensionStringProperty,
          new DerivedProperty([model.sunRightAscensionProperty], (v) => `${toFixed(v, 1)} h`),
        ),
      ],
    });
    leftReadouts.leftBottom = new Vector2(10, LEFT_STAGE.h - 10);

    // Sphere "labels" toggle: NAAP's single checkbox that reveals the pole /
    // equator / ecliptic / equinox-solstice text annotations.
    const makeCheckbox = (
      property: typeof model.sphereLabelsVisibleProperty,
      labelProperty: TReadOnlyProperty<string>,
    ): Checkbox =>
      new Checkbox(property, new Text(labelProperty, { font, fill: textColor }), {
        ...SIM_CHECKBOX_OPTIONS,
        accessibleName: labelProperty,
      });
    const labelsCheckbox = makeCheckbox(model.sphereLabelsVisibleProperty, controls.labelsStringProperty);
    const sphereLabels = new VBox({ align: "right", spacing: 4, children: [labelsCheckbox] });
    sphereLabels.rightBottom = new Vector2(LEFT_STAGE.w - 10, LEFT_STAGE.h - 10);

    left.stage.addChild(
      new Node({
        children: [orbitView, sphereGroup, perspectiveCaption, dragEarthCaption, leftReadouts, sphereLabels],
      }),
    );
    this.addChild(left.stage);
    this.addChild(left.border);

    // Toggle what fills the left stage.
    Multilink.multilink([model.viewModeProperty], (mode: SeasonsViewMode) => {
      const orbit = mode === "orbit";
      orbitView.visible = orbit;
      dragEarthCaption.visible = orbit;
      sphereGroup.visible = !orbit;
      perspectiveCaption.visible = !orbit;
      sphereLabels.visible = !orbit;
    });

    // ── Earth close-up stage: side view ⇄ view from Sun ──────────────────────
    const earth = makeStage(EARTH_STAGE);
    const earthCenter = new Vector2(EARTH_STAGE.w * 0.46, EARTH_STAGE.h / 2 + 4);
    const earthCloseUp = new EarthCloseUpNode(model, {
      radius: 80,
      accessibleName: controls.observerLatitudeStringProperty,
      accessibleHelpText: controls.dragLatitudeHintStringProperty,
      accessibleObjectResponseProperty: latitudeResponseProperty,
    });
    earthCloseUp.center = earthCenter;
    const earthFromSun = new EarthFromSunNode(model, {
      radius: 82,
      accessibleName: controls.observerLatitudeStringProperty,
      accessibleHelpText: controls.dragLatitudeHintStringProperty,
      accessibleObjectResponseProperty: latitudeResponseProperty,
    });
    earthFromSun.center = earthCenter;

    const latitudeCaption = caption(controls.dragLatitudeHintStringProperty);
    latitudeCaption.leftTop = new Vector2(10, 8);

    const observerLatitudeReadout = makeReadout(
      controls.observerLatitudeStringProperty,
      new DerivedProperty(
        [controls.northStringProperty, controls.southStringProperty, model.latitudeProperty],
        (north, south, lat) => `${toFixed(Math.abs(lat), 1)}° ${lat >= 0 ? north : south}`,
      ),
    );
    observerLatitudeReadout.leftBottom = new Vector2(10, EARTH_STAGE.h - 8);

    // Earth-view reference-circle labels toggle (NAAP's per-view "labels" checkbox).
    const earthLabelsCheckbox = makeCheckbox(model.earthLabelsVisibleProperty, controls.labelsStringProperty);
    earthLabelsCheckbox.rightBottom = new Vector2(EARTH_STAGE.w - 10, EARTH_STAGE.h - 8);

    earth.stage.addChild(
      new Node({
        children: [earthCloseUp, earthFromSun, latitudeCaption, observerLatitudeReadout, earthLabelsCheckbox],
      }),
    );
    this.addChild(earth.stage);
    this.addChild(earth.border);

    const earthViewRadio = makeRadioPanel<EarthViewMode>(model.earthViewModeProperty, [
      { value: "side", label: controls.viewFromSideStringProperty },
      { value: "sun", label: controls.viewFromSunStringProperty },
    ]);
    earthViewRadio.panel.right = EARTH_STAGE.x + EARTH_STAGE.w - 8;
    earthViewRadio.panel.top = EARTH_STAGE.y + 8;
    this.addChild(earthViewRadio.panel);

    Multilink.multilink([model.earthViewModeProperty], (mode: EarthViewMode) => {
      earthCloseUp.visible = mode === "side";
      earthFromSun.visible = mode === "sun";
    });

    // ── Sunbeam stage: sunlight angle ⇄ sunbeam spread ───────────────────────
    const sunbeam = makeStage(SUNBEAM_STAGE);
    const sunlightAngle = new SunlightAngleNode(model, { width: SUNBEAM_STAGE.w, height: SUNBEAM_STAGE.h });
    const sunbeamSpread = new SunbeamSpreadNode(model, { width: SUNBEAM_STAGE.w, height: SUNBEAM_STAGE.h });
    sunbeam.stage.addChild(new Node({ children: [sunlightAngle, sunbeamSpread] }));
    this.addChild(sunbeam.stage);
    this.addChild(sunbeam.border);

    const sunbeamRadio = makeRadioPanel<SunbeamMode>(model.sunbeamModeProperty, [
      { value: "angle", label: controls.sunlightAngleStringProperty },
      { value: "spread", label: controls.sunbeamSpreadStringProperty },
    ]);
    sunbeamRadio.panel.left = SUNBEAM_STAGE.x + 8;
    sunbeamRadio.panel.top = SUNBEAM_STAGE.y + 8;
    this.addChild(sunbeamRadio.panel);

    Multilink.multilink([model.sunbeamModeProperty], (mode: SunbeamMode) => {
      sunlightAngle.visible = mode === "angle";
      sunbeamSpread.visible = mode === "spread";
    });

    // ── Bottom band: view toggle + subsolar ──────────────────────────────────
    const viewRadioGroup = new VerticalAquaRadioButtonGroup<SeasonsViewMode>(
      model.viewModeProperty,
      [
        { value: "orbit", createNode: () => radioLabel(controls.orbitViewStringProperty) },
        { value: "sphere", createNode: () => radioLabel(controls.celestialSphereStringProperty) },
      ],
      { spacing: 5, radioButtonOptions: { radius: 7 } },
    );
    const subsolarCheckbox = makeCheckbox(model.subsolarPointVisibleProperty, controls.showSubsolarPointStringProperty);
    const viewControlPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({ align: "left", spacing: 8, children: [viewRadioGroup, subsolarCheckbox] }),
    );
    viewControlPanel.left = STAGE_MARGIN;
    viewControlPanel.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN + 6;

    // ── Bottom band: month scrubber + date + play/pause with speed ───────────
    const monthSelector = new MonthSelectorNode(model, dateResponseProperty);
    const dateText = new Text(dateProperty, { font: new PhetFont(CONTROL_FONT_SIZE + 1), fill: textColor });
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      flowBoxSpacing: 14,
      playPauseStepButtonOptions: {
        stepForwardButtonOptions: {
          listener: () => model.step(1 / 60),
        },
      },
      speedRadioButtonGroupOptions: {
        labelOptions: { font, fill: textColor },
      },
    });
    const monthPanel = new BasicCoordinatesAndSeasonsPanel(
      new VBox({
        align: "center",
        spacing: 8,
        children: [monthSelector, new HBox({ spacing: 18, align: "center", children: [dateText, timeControl] })],
      }),
    );

    // ── Bottom band: latitude control ────────────────────────────────────────
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
    const latitudePanel = new BasicCoordinatesAndSeasonsPanel(latitudeControl);

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

    // Position the remaining bottom-band panels between the view controls and Reset All.
    latitudePanel.right = resetAllButton.left - 14;
    latitudePanel.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN + 6;
    monthPanel.centerX = (viewControlPanel.right + latitudePanel.left) / 2;
    monthPanel.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN + 6;

    this.addChild(viewControlPanel);
    this.addChild(monthPanel);
    this.addChild(latitudePanel);
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [
          orbitView,
          cameraTarget,
          viewRadioGroup,
          subsolarCheckbox,
          labelsCheckbox,
          earthViewRadio.group,
          earthLabelsCheckbox,
          earthCloseUp,
          earthFromSun,
          sunbeamRadio.group,
          monthSelector,
          timeControl,
          latitudeControl,
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
