/**
 * BasicCoordinatesAndSeasonsPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Lets the user choose
 * the shoreline detail of the Terrestrial screen's flat map and globe. Controls
 * are bound to BasicCoordinatesAndSeasonsPreferencesModel Properties, whose
 * initial values come from basicCoordinatesAndSeasonsQueryParameters.
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import type { EarthMapResolution } from "../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsNamespace from "../BasicCoordinatesAndSeasonsNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { BasicCoordinatesAndSeasonsPreferencesModel } from "./BasicCoordinatesAndSeasonsPreferencesModel.js";

/** Preferences dialog content sits on a light background regardless of color profile. */
const PREFERENCES_TEXT_FILL = BasicCoordinatesAndSeasonsColors.controlSurfaceTextColorProperty;

export class BasicCoordinatesAndSeasonsPreferencesNode extends VBox {
  public constructor(preferencesModel: BasicCoordinatesAndSeasonsPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: PREFERENCES_TEXT_FILL,
    });

    const resolutionLabel = new Text(prefStrings.earthMapResolutionStringProperty, {
      font: new PhetFont(14),
      fill: PREFERENCES_TEXT_FILL,
      maxWidth: 220,
    });

    const resolutionRadioButtons = new VerticalAquaRadioButtonGroup<EarthMapResolution>(
      preferencesModel.earthMapResolutionProperty,
      [
        {
          value: "low",
          createNode: () =>
            new Text(prefStrings.earthMapResolutionLowStringProperty, {
              font: new PhetFont(14),
              fill: PREFERENCES_TEXT_FILL,
            }),
          options: { accessibleName: prefStrings.earthMapResolutionLowStringProperty },
        },
        {
          value: "high",
          createNode: () =>
            new Text(prefStrings.earthMapResolutionHighStringProperty, {
              font: new PhetFont(14),
              fill: PREFERENCES_TEXT_FILL,
            }),
          options: { accessibleName: prefStrings.earthMapResolutionHighStringProperty },
        },
      ],
      {
        spacing: 4,
        radioButtonOptions: { radius: 6 },
        ...(tandem && { tandem: tandem.createTandem("earthMapResolutionRadioButtonGroup") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, resolutionLabel, resolutionRadioButtons],
    });
  }
}

BasicCoordinatesAndSeasonsNamespace.register(
  "BasicCoordinatesAndSeasonsPreferencesNode",
  BasicCoordinatesAndSeasonsPreferencesNode,
);
