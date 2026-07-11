/**
 * SunlightAngleNode.ts
 *
 * The "sunlight angle" sunbeam panel (NAAP's side-view sunbeam), styled after the
 * original: a bundle of parallel Sun rays strikes the ground at the observer's
 * noon Sun altitude h. The Sun sits toward the horizon on the side the noon Sun
 * lies (S when the observer is poleward of the subsolar latitude, otherwise N),
 * so at low Sun angles the rays arrive nearly grazing and spread the same energy
 * over more ground. A readout box shows the Sun's altitude and observer latitude;
 * the horizon is marked N (left) and S (right). Rays vanish during polar night.
 */

import { DerivedProperty, Multilink } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { degToRad } from "../../common/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type SunlightAngleNodeOptions = { width: number; height: number };

const RAY_COUNT = 7;

export class SunlightAngleNode extends Node {
  public constructor(model: SeasonsModel, options: SunlightAngleNodeOptions) {
    const { width, height } = options;
    const controls = StringManager.getInstance().getControls();
    const font = new PhetFont(CONTROL_FONT_SIZE);

    const groundLevel = Math.round(height * 0.72);
    const rayLength = height * 0.9;

    const sky = new Rectangle(0, 0, width, groundLevel, {
      fill: BasicCoordinatesAndSeasonsColors.sunbeamSkyColorProperty,
    });
    const ground = new Rectangle(0, groundLevel, width, height - groundLevel, {
      fill: BasicCoordinatesAndSeasonsColors.sunbeamGroundColorProperty,
    });

    // Parallel Sun rays: fixed count, tail/tip updated as the altitude changes.
    const rays: ArrowNode[] = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      rays.push(
        new ArrowNode(0, 0, 0, 0, {
          fill: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty,
          stroke: null,
          headWidth: 11,
          headHeight: 12,
          tailWidth: 4,
        }),
      );
    }
    const rayLayer = new Node({ children: rays });

    // Cardinal markers on the horizon: N to the left, S to the right.
    const cardinalFont = new PhetFont({ size: CONTROL_FONT_SIZE + 1, weight: "bold" });
    const cardinalFill = BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty;
    const northLabel = new Text(controls.northStringProperty, { font: cardinalFont, fill: cardinalFill });
    const southLabel = new Text(controls.southStringProperty, { font: cardinalFont, fill: cardinalFill });
    const arrowY = (groundLevel + height) / 2;
    const northArrow = new ArrowNode(24, arrowY, 6, arrowY, {
      fill: cardinalFill,
      headHeight: 8,
      headWidth: 8,
      tailWidth: 2,
    });
    const southArrow = new ArrowNode(width - 24, arrowY, width - 6, arrowY, {
      fill: cardinalFill,
      headHeight: 8,
      headWidth: 8,
      tailWidth: 2,
    });
    northLabel.left = northArrow.right + 4;
    northLabel.centerY = arrowY;
    southLabel.right = southArrow.left - 4;
    southLabel.centerY = arrowY;

    // Readout box (top-right): Sun's altitude + observer latitude.
    const readoutTextFill = BasicCoordinatesAndSeasonsColors.controlSurfaceTextColorProperty;
    const altitudeText = new Text("", { font, fill: readoutTextFill });
    const latitudeText = new Text("", { font, fill: readoutTextFill });
    const readoutContent = new VBox({ align: "left", spacing: 2, children: [altitudeText, latitudeText] });
    const readoutBox = new Rectangle(0, 0, 0, 0, {
      fill: BasicCoordinatesAndSeasonsColors.controlSurfaceColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.panelBorderColorProperty,
      cornerRadius: 4,
    });
    const readout = new Node({ children: [readoutBox, readoutContent] });

    super({ children: [sky, ground, rayLayer, northArrow, southArrow, northLabel, southLabel, readout] });

    const altitudeStringProperty = new DerivedProperty(
      [controls.sunAltitudeStringProperty, model.noonSunAltitudeProperty],
      (label, altitude) => `${label}: ${toFixed(altitude, 1)}°`,
    );
    const latitudeStringProperty = new DerivedProperty(
      [
        controls.observerLatitudeStringProperty,
        controls.northStringProperty,
        controls.southStringProperty,
        model.latitudeProperty,
      ],
      (label, north, south, lat) => `${label}: ${toFixed(Math.abs(lat), 1)}° ${lat >= 0 ? north : south}`,
    );
    altitudeStringProperty.link((s) => {
      altitudeText.string = s;
    });
    latitudeStringProperty.link((s) => {
      latitudeText.string = s;
    });

    // Keep the readout box sized to its text and pinned to the top-right corner.
    readoutContent.boundsProperty.link(() => {
      const pad = 6;
      readoutBox.setRect(0, 0, readoutContent.width + pad * 2, readoutContent.height + pad * 2);
      readoutContent.left = pad;
      readoutContent.top = pad;
      readout.right = width - 8;
      readout.top = 8;
    });

    Multilink.multilink(
      [model.noonSunAltitudeProperty, model.sunDeclinationProperty, model.latitudeProperty],
      (altitude, declination, latitude) => {
        const lit = altitude > 0;
        rayLayer.visible = lit;
        if (!lit) {
          return;
        }
        const h = degToRad(altitude);
        // The noon Sun is to the N when the Sun is declined north of the observer.
        const sunToNorth = declination > latitude;
        const travelX = (sunToNorth ? 1 : -1) * Math.cos(h);
        const travelY = Math.sin(h);
        const marginX = width * 0.14;
        for (let i = 0; i < RAY_COUNT; i++) {
          const t = i / (RAY_COUNT - 1);
          const tipX = marginX + t * (width - 2 * marginX);
          const tipY = groundLevel;
          rays[i]?.setTailAndTip(tipX - travelX * rayLength, tipY - travelY * rayLength, tipX, tipY);
        }
      },
    );
  }
}
