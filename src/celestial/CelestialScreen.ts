/**
 * CelestialScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * For multi-screen simulations, duplicate this file (e.g. IntroScreen.ts,
 * LabScreen.ts) and add each screen to the screens array in src/main.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import { createCelestialIcon } from "../common/BasicCoordinatesAndSeasonsScreenIcons.js";
import { CelestialModel } from "./model/CelestialModel.js";
import { CelestialKeyboardHelpContent } from "./view/CelestialKeyboardHelpContent.js";
import { CelestialScreenView } from "./view/CelestialScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type CelestialScreenOptions = ScreenOptions & { tandem: Tandem };

export class CelestialScreen extends Screen<CelestialModel, CelestialScreenView> {
  public constructor(options: CelestialScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new CelestialModel(),
      // View factory — receives the model instance
      (model) =>
        new CelestialScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<CelestialScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
          homeScreenIcon: createCelestialIcon(),
          createKeyboardHelpNode: () => new CelestialKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
