/**
 * BasicCoordinatesAndSeasonsColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import BasicCoordinatesAndSeasonsColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the BasicCoordinatesAndSeasonsColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsNamespace from "./BasicCoordinatesAndSeasonsNamespace.js";

const BasicCoordinatesAndSeasonsColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(
    BasicCoordinatesAndSeasonsNamespace,
    "controlSurfaceDisabled",
    {
      default: "#cccccc",
      projector: "#cccccc",
    },
  ),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Sky-engine colors (ported from the sibling motion2 sim) ──────────────────────────────
  // Used by the celestial-sphere / Earth-globe / flat-map view stack copied from
  // the sibling motion2 sim. Values kept identical so the two sims read alike.

  /** Outline of the celestial-sphere / globe silhouette. */
  sphereOutlineColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sphereOutline", {
    default: "#9fb3c8",
    projector: "#555555",
  }),

  /** RA/Dec (and lat/long) grid lines on the sphere and maps. */
  gridColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "grid", {
    default: "#4a6078",
    projector: "#bbbbbb",
  }),

  /** The celestial equator great circle. */
  celestialEquatorColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "celestialEquator", {
    default: "#ff8a65",
    projector: "#d84315",
  }),

  /** The ecliptic great circle. */
  eclipticColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "ecliptic", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /**
   * The celestial equator on the Seasons celestial sphere. NAAP draws it a neutral
   * light grey there (0xA0A0A0), reserving the warm equator color for the Celestial
   * Coordinates screen.
   */
  seasonsCelestialEquatorColorProperty: new ProfileColorProperty(
    BasicCoordinatesAndSeasonsNamespace,
    "seasonsCelestialEquator",
    {
      default: "#c4ccd4",
      projector: "#6b7278",
    },
  ),

  /** The ecliptic on the Seasons celestial sphere (NAAP green, 0x478930). */
  seasonsEclipticColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "seasonsEcliptic", {
    default: "#5fbf46",
    projector: "#2e7d32",
  }),

  /** The galactic-equator great circle (pink, matching NAAP). */
  galacticEquatorColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "galacticEquator", {
    default: "#ff9fff",
    projector: "#ad3dad",
  }),

  /** Cardinal-direction / axis text labels drawn over the sky views. */
  cardinalLabelColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "cardinalLabel", {
    default: "#ffffff",
    projector: "#1a1a1a",
  }),

  /** Fill of ordinary (catalog / pattern) stars. */
  starColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "star", {
    default: "#fff59d",
    projector: "#f9a825",
  }),

  /** Fill of the selected / draggable star. */
  selectedStarColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "selectedStar", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /** The RA hour-circle guide arc through the selected star. */
  guideRaColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "guideRa", {
    default: "#5dade2",
    projector: "#2471a3",
  }),

  /** The declination-circle guide arc through the selected star. */
  guideDecColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "guideDec", {
    default: "#ec7063",
    projector: "#b03a2e",
  }),

  /** Land fill of the Earth globe / flat map. */
  earthLandColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "earthLand", {
    default: "#6d8c5a",
    projector: "#7cb342",
  }),

  /** Ocean fill of the Earth globe / flat map. */
  earthOceanColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "earthOcean", {
    default: "#2a4d69",
    projector: "#4a90c2",
  }),

  /** The observer marker (cursor) on the globe / flat map. */
  observerColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "observer", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /**
   * The longitude indicator line (the observer's meridian) drawn across the
   * flat map and globe. Salmon-red, matching NAAP's mapExplorer `moveCursor`
   * longitude segment (0xFE4B4B).
   */
  longitudeIndicatorColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "longitudeIndicator", {
    default: "#fe4b4b",
    projector: "#c62828",
  }),

  /**
   * The latitude indicator line (the observer's parallel) drawn across the flat
   * map and globe. Blue-violet, matching NAAP's mapExplorer `moveCursor`
   * latitude segment (0x4B4BFE).
   */
  latitudeIndicatorColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "latitudeIndicator", {
    default: "#4b6bff",
    projector: "#1565c0",
  }),

  /** The International Date Line drawn over the flat map ("map features"). */
  dateLineColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "dateLine", {
    default: "#ffb74d",
    projector: "#ef6c00",
  }),

  /** Reference-city dot + label text on the flat map ("show cities"). */
  cityLabelColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "cityLabel", {
    default: "#ffffff",
    projector: "#1a1a1a",
  }),

  // ── Sim-specific colors (new for Basic Coordinates and Seasons) ──────────────

  /** Fill of the framed "view stage" panels (orbit/sphere, Earth close-up). Near-black like the NAAP original. */
  viewFrameFillColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "viewFrameFill", {
    default: "#05060d",
    projector: "#f0f4fa",
  }),

  /** Border of the framed view-stage panels. */
  viewFrameStrokeColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "viewFrameStroke", {
    default: "#2b3752",
    projector: "#b8c4d4",
  }),

  /** Muted italic caption text drawn inside the view panels ("click and drag …"). */
  viewCaptionColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "viewCaption", {
    default: "#9aa6bd",
    projector: "#5a6472",
  }),

  /** Sky fill of the sunbeam angle-of-incidence panel. */
  sunbeamSkyColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunbeamSky", {
    default: "#5b83c0",
    projector: "#9fc0ea",
  }),

  /** Ground fill of the sunbeam angle-of-incidence panel. */
  sunbeamGroundColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunbeamGround", {
    default: "#4f7a3a",
    projector: "#7cb342",
  }),

  /** The Sun disk (orbit view, ecliptic marker, close-up subsolar point). */
  sunColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sun", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** Earth's circular orbit path in the Seasons orbit view. */
  orbitPathColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "orbitPath", {
    default: "#8aa0b8",
    projector: "#90a4ae",
  }),

  /** Night-side (day/night terminator) shading on the Seasons close-up globe. */
  terminatorShadeColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "terminatorShade", {
    default: "rgba(6,8,20,0.55)",
    projector: "rgba(40,52,64,0.40)",
  }),

  /** Incoming Sun rays in the angle-of-incidence / sunbeam-spread panel. */
  sunbeamColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunbeam", {
    default: "#fff59d",
    projector: "#fbc02d",
  }),

  /** Reference grid overlaid on the top-down sunbeam-spread ground. */
  sunbeamGridColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunbeamGrid", {
    default: "rgba(255,255,255,0.18)",
    projector: "rgba(0,0,0,0.15)",
  }),

  /** Elliptical beam footprint painted on the sunbeam-spread ground. */
  sunbeamFootprintColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunbeamFootprint", {
    default: "rgba(255,245,157,0.5)",
    projector: "rgba(251,192,45,0.45)",
  }),

  /** Gold Sun-direction arrow on the Seasons celestial sphere (Earth → Sun). */
  sunRayArrowColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "sunRayArrow", {
    default: "#d8c99b",
    projector: "#8d7a45",
  }),

  /** North half of Earth's rotation axis (red) in Seasons Earth views. */
  earthNorthAxisColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "earthNorthAxis", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /** South half of Earth's rotation axis (blue) in Seasons Earth views. */
  earthSouthAxisColorProperty: new ProfileColorProperty(BasicCoordinatesAndSeasonsNamespace, "earthSouthAxis", {
    default: "#5b8dd6",
    projector: "#1565c0",
  }),
};

export default BasicCoordinatesAndSeasonsColors;
