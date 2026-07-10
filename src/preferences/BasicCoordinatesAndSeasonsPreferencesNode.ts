/**
 * BasicCoordinatesAndSeasonsPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to BasicCoordinatesAndSeasonsPreferencesModel Properties (whose initial values come from
 * basicCoordinatesAndSeasonsQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import BasicCoordinatesAndSeasonsNamespace from "../BasicCoordinatesAndSeasonsNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { BasicCoordinatesAndSeasonsPreferencesModel } from "./BasicCoordinatesAndSeasonsPreferencesModel.js";

export class BasicCoordinatesAndSeasonsPreferencesNode extends VBox {
  public constructor(preferencesModel: BasicCoordinatesAndSeasonsPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
    });

    const exampleToggleCheckbox = new Checkbox(
      preferencesModel.exampleToggleProperty,
      new Text(prefStrings.exampleToggleStringProperty, {
        font: new PhetFont(14),
        fill: BasicCoordinatesAndSeasonsColors.textColorProperty,
      }),
      {
        checkboxColor: BasicCoordinatesAndSeasonsColors.textColorProperty,
        checkboxColorBackground: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("exampleToggleCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, exampleToggleCheckbox],
    });
  }
}

BasicCoordinatesAndSeasonsNamespace.register(
  "BasicCoordinatesAndSeasonsPreferencesNode",
  BasicCoordinatesAndSeasonsPreferencesNode,
);
