/**
 * SeasonsScreenSummaryContent.ts
 *
 * The accessible screen summary for the Seasons screen. "Current details" is a
 * live sentence with the date, the Sun's declination, and the noon Sun altitude
 * at the current observer latitude.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";
import { createSeasonsDateProperty } from "./seasonsDate.js";

export class SeasonsScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SeasonsModel) {
    const a11y = StringManager.getInstance().getSeasonsA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsPatternStringProperty, {
        date: createSeasonsDateProperty(model),
        declination: new DerivedProperty([model.sunDeclinationProperty], (dec) => toFixed(dec, 1)),
        latitude: new DerivedProperty([model.latitudeProperty], (lat) => toFixed(lat, 1)),
        altitude: new DerivedProperty([model.noonSunAltitudeProperty], (alt) => toFixed(alt, 1)),
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
