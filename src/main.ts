/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. It triggers the full bootstrap chain:
 *
 *   brand.ts → splash.ts → assert.ts → init.ts
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first — triggers: init.ts → assert.ts → splash.ts → brand.ts
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import BasicCoordinatesAndSeasonsColors from "./BasicCoordinatesAndSeasonsColors.js";
import { CelestialScreen } from "./celestial/CelestialScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { BasicCoordinatesAndSeasonsPreferencesModel } from "./preferences/BasicCoordinatesAndSeasonsPreferencesModel.js";
import { BasicCoordinatesAndSeasonsPreferencesNode } from "./preferences/BasicCoordinatesAndSeasonsPreferencesNode.js";
import { SeasonsScreen } from "./seasons/SeasonsScreen.js";
import { TerrestrialScreen } from "./terrestrial/TerrestrialScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const screenNames = stringManager.getScreenNames();

  // Simulation-specific preferences; initial values come from basicCoordinatesAndSeasonsQueryParameters.
  const simPreferences = new BasicCoordinatesAndSeasonsPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  // Screen name Properties update automatically when the locale changes.
  const screens = [
    new TerrestrialScreen({
      name: screenNames.terrestrialStringProperty,
      tandem: Tandem.ROOT.createTandem("terrestrialScreen"),
      backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
    }),
    new CelestialScreen({
      name: screenNames.celestialStringProperty,
      tandem: Tandem.ROOT.createTandem("celestialScreen"),
      backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
    }),
    new SeasonsScreen({
      name: screenNames.seasonsStringProperty,
      tandem: Tandem.ROOT.createTandem("seasonsScreen"),
      backgroundColorProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new BasicCoordinatesAndSeasonsPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    credits: {
      leadDesign: "NAAP / OpenPhysics",
      softwareDevelopment: "OpenPhysics",
      team: "OpenPhysics",
      qualityAssurance: "OpenPhysics",
    },
  });

  sim.start();
});
