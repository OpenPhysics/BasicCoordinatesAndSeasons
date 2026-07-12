/**
 * SeasonsSphereNode.ts
 *
 * The celestial sphere for the Seasons screen, matching the NAAP "Seasons and
 * Ecliptic Simulator" earth-centered view: a transparent sphere carrying the
 * celestial equator (neutral grey) and the ecliptic (green), a small reference
 * Earth at the geocentric centre, the Sun riding the ecliptic, and a gold arrow
 * from the Earth toward the Sun. A single "labels" toggle reveals the full-word
 * annotations — north/south celestial pole, celestial equator, ecliptic, and the
 * "to VE / AE / SS / WS" direction markers on the celestial equator.
 *
 * The dense RA/Dec graticule, 0ʰ hour circle, galactic equator and the terse
 * NCP/SCP/VE… markers built into the shared {@link CelestialSphereNode} are all
 * suppressed here; this node draws its own NAAP-style annotations instead.
 */

import { DerivedProperty, Multilink, Property } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Node, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { DEFAULT_EARTH_MAP_RESOLUTION, OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { raDecToVector3 } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { smallCirclePoints } from "../../common/view/skyGraphics.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";
import { SunMarkerNode } from "./SunMarkerNode.js";

const NCP = new Vector3(0, 0, 1);
const SCP = new Vector3(0, 0, -1);
const ECLIPTIC_POLE = raDecToVector3(18, 90 - OBLIQUITY_DEGREES);
const LABEL_OFFSET = 12;
const SUN_ARROW_LENGTH_RATIO = 0.62;

export class SeasonsSphereNode extends Node {
  public constructor(projection: SkyProjection, model: SeasonsModel) {
    const controls = StringManager.getInstance().getControls();
    const off = new Property(false);

    // Shared sphere, configured for the Seasons look: only the equator (grey) and
    // ecliptic (green) great circles; no graticule, hour circle, galactic equator,
    // or terse built-in labels (this node supplies its own full-word annotations).
    const sphere = new CelestialSphereNode(projection, {
      celestialEquatorColor: BasicCoordinatesAndSeasonsColors.seasonsCelestialEquatorColorProperty,
      eclipticColor: BasicCoordinatesAndSeasonsColors.seasonsEclipticColorProperty,
      gridVisibleProperty: off,
      hourCircleVisibleProperty: off,
      galacticEquatorVisibleProperty: off,
      labelsVisibleProperty: off,
      equinoxesAndSolsticesVisibleProperty: off,
    });

    // Small reference Earth at the centre, sandwiched between the dashed (far) and
    // solid (near) sphere strokes. Sidereal time and longitude are fixed at 0, so
    // the globe simply sits at the geocentric origin with its axis on the poles.
    const earthGlobe = new EarthGlobeNode(
      projection,
      model.latitudeProperty,
      new Property(0),
      new Property(0),
      new Property(DEFAULT_EARTH_MAP_RESOLUTION),
      // A small reference Earth (~⅓ the previous size), matching the NAAP view where
      // the geocentric Earth is a tiny globe inside a large celestial sphere. The Sun
      // direction shades the globe's night hemisphere (which face is lit).
      {
        radiusRatio: 0.1,
        sunDirectionProperty: new DerivedProperty(
          [model.sunRightAscensionProperty, model.sunDeclinationProperty],
          (ra, dec) => raDecToVector3(ra, dec),
        ),
      },
    );

    const sunMarker = new SunMarkerNode(projection, model.sunRightAscensionProperty, model.sunDeclinationProperty);

    // Gold arrow from the Earth toward the Sun (NAAP's "ray"), always shown.
    const sunArrow = new ArrowNode(0, 0, 0, 0, {
      fill: "#d8c99b",
      stroke: null,
      headWidth: 16,
      headHeight: 16,
      tailWidth: 6,
    });

    // ── Full-word label overlay, toggled by the single "labels" checkbox ─────────
    const labelFont = new PhetFont(11);
    const labelColor = BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty;
    const makeLabel = (property: typeof controls.eclipticLabelStringProperty): Text =>
      new Text(property, { font: labelFont, fill: labelColor, maxWidth: 130 });

    const ncpLabel = makeLabel(controls.northCelestialPoleStringProperty);
    const scpLabel = makeLabel(controls.southCelestialPoleStringProperty);
    const equatorLabel = makeLabel(controls.celestialEquatorLabelStringProperty);
    const eclipticLabel = makeLabel(controls.eclipticLabelStringProperty);

    // Direction markers on the celestial equator: a short outward arrow + label.
    const directionArrow = (): ArrowNode =>
      new ArrowNode(0, 0, 0, 0, { fill: labelColor, stroke: null, headWidth: 7, headHeight: 8, tailWidth: 1.5 });
    const makeDirection = (property: typeof controls.toVernalEquinoxStringProperty, raHours: number) => ({
      raHours,
      arrow: directionArrow(),
      text: makeLabel(property),
    });
    const directions = [
      makeDirection(controls.toVernalEquinoxStringProperty, 0), // VE — RA 0ʰ
      makeDirection(controls.toSummerSolsticeStringProperty, 6), // SS — RA 6ʰ
      makeDirection(controls.toAutumnalEquinoxStringProperty, 12), // AE — RA 12ʰ
      makeDirection(controls.toWinterSolsticeStringProperty, 18), // WS — RA 18ʰ
    ];

    const labelLayer = new Node({
      children: [...directions.flatMap((d) => [d.arrow, d.text]), ncpLabel, scpLabel, equatorLabel, eclipticLabel],
    });
    model.sphereLabelsVisibleProperty.link((visible) => {
      labelLayer.visible = visible;
    });

    super({ children: [sphere.backLayer, earthGlobe, sphere.frontLayer, sunArrow, sunMarker, labelLayer] });

    const center = projection.center;

    // Places a pole label just outside the pole marker; hidden on the far side.
    const placePoleLabel = (label: Text, pole: Vector3): void => {
      label.visible = projection.isFrontFacing(pole);
      const p = projection.project(pole);
      const away = p.minus(center);
      label.center = p.plus(
        away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : new Vector2(0, -LABEL_OFFSET),
      );
    };

    // Places a great-circle label at the front-facing sample point whose projected
    // position lands nearest `target` (a screen point relative to the sphere
    // centre). Anchoring to an interior target — rather than a circle extreme —
    // keeps the label off the rim, so the ecliptic label stays clear of the
    // autumnal-equinox marker it would otherwise sit on top of.
    const placeCircleLabel = (label: Text, axis: Vector3, target: Vector2): void => {
      let best: Vector2 | null = null;
      let bestDist = Infinity;
      for (const v of smallCirclePoints(axis, 90)) {
        if (!projection.isFrontFacing(v)) {
          continue;
        }
        const p = projection.project(v);
        const d = p.distanceSquared(target);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      label.visible = best !== null;
      if (best) {
        const away = best.minus(center);
        label.center = best.plus(away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : Vector2.ZERO);
      }
    };

    Multilink.multilink(
      [projection.viewMatrixProperty, model.sunRightAscensionProperty, model.sunDeclinationProperty],
      (_matrix, sunRa, sunDec) => {
        // Sun-direction arrow: from the Earth centre toward the projected Sun.
        const sunPoint = projection.project(raDecToVector3(sunRa, sunDec));
        const toSun = sunPoint.minus(center);
        if (toSun.magnitude > 1e-3) {
          const tip = center.plus(toSun.normalized().timesScalar(projection.radius * SUN_ARROW_LENGTH_RATIO));
          sunArrow.setTailAndTip(center.x, center.y, tip.x, tip.y);
        }

        placePoleLabel(ncpLabel, NCP);
        placePoleLabel(scpLabel, SCP);
        // Anchor the two great-circle labels to interior screen targets on opposite
        // sides so they stay legible and clear of each other and of the rim markers.
        const r = projection.radius;
        placeCircleLabel(equatorLabel, NCP, center.plusXY(-0.5 * r, 0.5 * r)); // lower-left
        placeCircleLabel(eclipticLabel, ECLIPTIC_POLE, center.plusXY(0.45 * r, -0.5 * r)); // upper-right

        for (const d of directions) {
          const v = raDecToVector3(d.raHours, 0);
          const front = projection.isFrontFacing(v);
          d.arrow.visible = front;
          d.text.visible = front;
          if (!front) {
            continue;
          }
          const p = projection.project(v);
          const away = p.minus(center);
          const dir = away.magnitude > 0 ? away.normalized() : new Vector2(0, -1);
          const tip = p.plus(dir.timesScalar(13));
          d.arrow.setTailAndTip(p.x, p.y, tip.x, tip.y);
          d.text.center = p.plus(dir.timesScalar(26));
        }
      },
    );
  }
}
