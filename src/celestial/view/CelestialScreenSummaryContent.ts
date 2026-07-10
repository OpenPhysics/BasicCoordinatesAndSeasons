/**
 * CelestialScreenSummaryContent.ts
 *
 * The accessible screen summary for the Celestial Coordinates screen. "Current
 * details" is a live sentence giving the star's right ascension (hours) and
 * declination (degrees).
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { CelestialModel } from "../model/CelestialModel.js";

export class CelestialScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: CelestialModel) {
    const a11y = StringManager.getInstance().getCelestialA11yStrings();

    const raReadout = new DerivedProperty([model.starRaProperty], (ra) => toFixed(ra, 1));
    const decReadout = new DerivedProperty([model.starDecProperty], (dec) => toFixed(dec, 1));

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsPatternStringProperty, {
        ra: raReadout,
        dec: decReadout,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
