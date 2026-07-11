/**
 * TerrestrialScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * For multi-screen simulations, duplicate this file (e.g. IntroScreen.ts,
 * LabScreen.ts) and add each screen to the screens array in src/main.ts.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import type { EarthMapResolution } from "../BasicCoordinatesAndSeasonsConstants.js";
import { createTerrestrialIcon } from "../common/BasicCoordinatesAndSeasonsScreenIcons.js";
import { TerrestrialModel } from "./model/TerrestrialModel.js";
import { TerrestrialKeyboardHelpContent } from "./view/TerrestrialKeyboardHelpContent.js";
import { TerrestrialScreenView } from "./view/TerrestrialScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
// `earthMapResolutionProperty` supplies the shoreline detail chosen in Preferences.
type TerrestrialScreenOptions = ScreenOptions & {
  tandem: Tandem;
  earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>;
};

export class TerrestrialScreen extends Screen<TerrestrialModel, TerrestrialScreenView> {
  public constructor(options: TerrestrialScreenOptions) {
    const { earthMapResolutionProperty, ...screenOptions } = options;
    super(
      // Model factory — called once when the screen is first shown
      () => new TerrestrialModel(),
      // View factory — receives the model instance
      (model) =>
        new TerrestrialScreenView(model, {
          tandem: options.tandem.createTandem("view"),
          earthMapResolutionProperty,
        }),
      optionize<ScreenOptions & { tandem: Tandem }, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
          homeScreenIcon: createTerrestrialIcon(),
          createKeyboardHelpNode: () => new TerrestrialKeyboardHelpContent(),
        },
        screenOptions,
      ),
    );
  }
}
