/**
 * SeasonsScreen.ts
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
import { createSeasonsIcon } from "../common/BasicCoordinatesAndSeasonsScreenIcons.js";
import { SeasonsModel } from "./model/SeasonsModel.js";
import { SeasonsKeyboardHelpContent } from "./view/SeasonsKeyboardHelpContent.js";
import { SeasonsScreenView } from "./view/SeasonsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SeasonsScreenOptions = ScreenOptions & { tandem: Tandem };

export class SeasonsScreen extends Screen<SeasonsModel, SeasonsScreenView> {
  public constructor(options: SeasonsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new SeasonsModel(),
      // View factory — receives the model instance
      (model) =>
        new SeasonsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SeasonsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
          homeScreenIcon: createSeasonsIcon(),
          createKeyboardHelpNode: () => new SeasonsKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
