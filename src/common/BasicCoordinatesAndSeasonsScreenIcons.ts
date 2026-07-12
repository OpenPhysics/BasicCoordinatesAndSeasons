/**
 * BasicCoordinatesAndSeasonsScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for the three screens. Each
 * icon is drawn from scenery primitives on the standard PhET 548 × 373 icon
 * canvas and uses BasicCoordinatesAndSeasonsColors so it follows the active
 * (default / projector) color profile.
 *
 *   Terrestrial Coordinates — an Earth globe with a latitude/longitude grid and
 *                             an observer marker.
 *   Celestial Coordinates   — a celestial sphere with the equator, ecliptic, and
 *                             a highlighted star on its RA/Dec guide circles.
 *   Seasons                 — the Sun at the centre of Earth's tilted-axis orbit.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, RadialGradient, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import { getEarthShorePolygons } from "./model/EarthShoreData.js";
import { createStarShape } from "./view/starGraphics.js";

// ── Canvas dimensions (PhET standard icon size) ───────────────────────────────
const W = 548;
const H = 373;
const CX = W / 2;
const CY = H / 2;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: BasicCoordinatesAndSeasonsColors.backgroundColorProperty,
  });
}

function starAt(x: number, y: number, outerRadius: number): Path {
  return new Path(createStarShape(outerRadius), {
    fill: BasicCoordinatesAndSeasonsColors.starColorProperty,
    centerX: x,
    centerY: y,
  });
}

// Orthographic view centred on the prime-meridian region rotated east by this
// longitude, so the visible hemisphere shows Africa, Europe and the Middle East —
// the most recognizable face of the Earth. Viewing latitude is 0 so the globe's
// grid parallels/meridians read as the simple horizontal/vertical ellipses below.
const CONTINENT_VIEW_LON = (20 * Math.PI) / 180;
const CONTINENT_COS_LON = Math.cos(CONTINENT_VIEW_LON);
const CONTINENT_SIN_LON = Math.sin(CONTINENT_VIEW_LON);

/** Depth toward the viewer of a unit-sphere point (positive on the visible hemisphere). */
function continentDepth(x: number, y: number): number {
  return CONTINENT_COS_LON * x + CONTINENT_SIN_LON * y;
}

/**
 * Real coastlines (NAAP low-resolution land polygons on the unit sphere)
 * orthographically projected onto the icon globe, centred on Africa/Europe.
 *
 * Each land polygon is first Sutherland–Hodgman clipped to the visible hemisphere
 * (the half-space facing the viewer), interpolating a point onto the limb wherever an
 * edge crosses behind the globe, so filled land ends cleanly at the horizon instead of
 * folding the far side back over the disc. The result is clipped to the disc by the caller.
 */
function continentsShape(centerX: number, centerY: number, radius: number): Shape {
  const shape = new Shape();

  for (const polygon of getEarthShorePolygons("low")) {
    // Clip the closed polygon to the front hemisphere, collecting visible unit-sphere
    // vertices plus limb crossings where an edge passes behind the globe.
    const clipped: Array<[number, number, number]> = [];
    const crossing = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
      da: number,
      db: number,
    ): [number, number, number] => {
      const t = da / (da - db);
      const cx = a.x + t * (b.x - a.x);
      const cy = a.y + t * (b.y - a.y);
      const cz = a.z + t * (b.z - a.z);
      const len = Math.hypot(cx, cy, cz) || 1;
      return [cx / len, cy / len, cz / len];
    };
    // Walk each edge from the previous vertex, starting with the wrap-around edge
    // from the last vertex, so the closed loop is fully covered.
    let from = polygon[polygon.length - 1];
    if (!from) {
      continue;
    }
    for (const to of polygon) {
      const da = continentDepth(from.x, from.y);
      const db = continentDepth(to.x, to.y);
      if (db >= 0) {
        if (da < 0) {
          clipped.push(crossing(from, to, da, db));
        }
        clipped.push([to.x, to.y, to.z]);
      } else if (da >= 0) {
        clipped.push(crossing(from, to, da, db));
      }
      from = to;
    }
    if (clipped.length < 3) {
      continue;
    }

    clipped.forEach(([x, y, z], i) => {
      const px = centerX + radius * (-CONTINENT_SIN_LON * x + CONTINENT_COS_LON * y);
      const py = centerY - radius * z;
      if (i === 0) {
        shape.moveTo(px, py);
      } else {
        shape.lineTo(px, py);
      }
    });
    shape.close();
  }
  return shape;
}

/** Earth globe: ocean disc, real projected continents clipped to the disc, and an outline. */
function earthGlobe(centerX: number, centerY: number, radius: number): Node {
  const disc = new Circle(radius, {
    fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
    stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
    lineWidth: radius > 60 ? 3 : 1.5,
    centerX,
    centerY,
  });
  const land = new Path(continentsShape(centerX, centerY, radius), {
    fill: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
  });
  land.clipArea = Shape.circle(centerX, centerY, radius);
  return new Node({ children: [disc, land] });
}

/** A latitude/longitude grid on the globe: foreshortened parallels + meridians. */
function globeGrid(centerX: number, centerY: number, radius: number, lineWidth: number): Node {
  const stroke = BasicCoordinatesAndSeasonsColors.gridColorProperty;
  const clip = Shape.circle(centerX, centerY, radius);
  const children: Node[] = [];

  // Parallels (equator + two on each side), drawn as horizontal ellipses.
  for (const frac of [-0.6, -0.3, 0, 0.3, 0.6]) {
    const cy = centerY + radius * frac;
    const rx = radius * Math.sqrt(Math.max(0, 1 - frac * frac));
    const path = new Path(Shape.ellipse(centerX, cy, rx, rx * 0.22, 0), {
      stroke,
      lineWidth: frac === 0 ? lineWidth * 1.4 : lineWidth,
      opacity: 0.85,
    });
    path.clipArea = clip;
    children.push(path);
  }
  // Meridians, drawn as vertical ellipses of varying width.
  for (const frac of [0.35, 0.7, 1]) {
    const path = new Path(Shape.ellipse(centerX, centerY, radius * frac, radius, 0), {
      stroke,
      lineWidth,
      opacity: 0.85,
    });
    path.clipArea = clip;
    children.push(path);
  }
  return new Node({ children });
}

/**
 * A translucent radial-gradient overlay that turns a flat disc into a lit sphere:
 * a highlight offset toward the top-left and a shadow gathering at the lower-right.
 * Neutral black/white so it reads correctly over any ocean/land colour or profile.
 */
function sphereShading(centerX: number, centerY: number, radius: number): Node {
  const gradient = new RadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.35,
    radius * 0.1,
    centerX,
    centerY,
    radius * 1.15,
  )
    .addColorStop(0, "rgba(255,255,255,0.55)")
    .addColorStop(0.45, "rgba(255,255,255,0.0)")
    .addColorStop(0.85, "rgba(0,0,0,0.12)")
    .addColorStop(1, "rgba(0,0,0,0.4)");
  return new Circle(radius, { fill: gradient, centerX, centerY });
}

/** Celestial sphere with equator, ecliptic, meridian, RA/Dec guides and a star. */
function celestialSphereGraphic(centerX: number, centerY: number, radius: number): Node {
  const polarAxis = new Line(centerX, centerY - radius - 18, centerX, centerY + radius + 18, {
    stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
    lineWidth: 3,
    lineCap: "round",
  });
  const outline = new Circle(radius, {
    stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
    lineWidth: 3,
    centerX,
    centerY,
  });
  const equator = new Path(Shape.ellipse(centerX, centerY, radius, radius * 0.32, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
    lineWidth: 3.5,
    lineCap: "round",
  });
  const ecliptic = new Path(Shape.ellipse(centerX, centerY, radius, radius * 0.32, -0.42), {
    stroke: BasicCoordinatesAndSeasonsColors.eclipticColorProperty,
    lineWidth: 3,
    lineCap: "round",
  });

  // Guide star and its RA hour-circle (vertical) + declination-circle (horizontal).
  const starX = centerX + radius * 0.34;
  const starY = centerY - radius * 0.42;
  const decFrac = (starY - centerY) / radius; // vertical position as a fraction of radius
  const decRx = radius * Math.sqrt(Math.max(0, 1 - decFrac * decFrac));
  const decCircle = new Path(Shape.ellipse(centerX, starY, decRx, decRx * 0.24, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.guideDecColorProperty,
    lineWidth: 2.5,
    opacity: 0.9,
  });
  const raCircle = new Path(Shape.ellipse(centerX, centerY, radius * 0.34, radius, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.guideRaColorProperty,
    lineWidth: 2.5,
    opacity: 0.9,
  });
  const selectedStar = new Path(createStarShape(11), {
    fill: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
    centerX: starX,
    centerY: starY,
  });

  const stars = [
    starAt(centerX - radius * 0.62, centerY - radius * 0.5, 6),
    starAt(centerX + radius * 0.66, centerY + radius * 0.28, 5),
    starAt(centerX - radius * 0.28, centerY + radius * 0.62, 5),
  ];
  return new Node({
    children: [polarAxis, outline, equator, ecliptic, raCircle, decCircle, ...stars, selectedStar],
  });
}

export function createTerrestrialIcon(): ScreenIcon {
  const radius = 138;
  const globe = earthGlobe(CX, CY, radius);
  const grid = globeGrid(CX, CY, radius, 2);
  const shading = sphereShading(CX, CY, radius);
  const clip = Shape.circle(CX, CY, radius);

  // The observer's location, and the latitude parallel + longitude meridian that
  // pass through it — the two coordinates the screen is about — drawn as bright
  // guide lines over the faint grid (mirroring the Celestial icon's RA/Dec guides).
  const obsFrac = -0.3; // vertical position as a fraction of the radius
  const obsX = CX + radius * 0.28;
  const obsY = CY + radius * obsFrac;
  const parallelRx = radius * Math.sqrt(Math.max(0, 1 - obsFrac * obsFrac));
  const latitudeGuide = new Path(Shape.ellipse(CX, obsY, parallelRx, parallelRx * 0.22, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.latitudeIndicatorColorProperty,
    lineWidth: 4,
    lineCap: "round",
  });
  latitudeGuide.clipArea = clip;
  const meridianFrac = (radius * 0.28) / parallelRx; // meridian half-width hitting the observer
  const longitudeGuide = new Path(Shape.ellipse(CX, CY, radius * meridianFrac, radius, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.longitudeIndicatorColorProperty,
    lineWidth: 4,
    lineCap: "round",
  });
  longitudeGuide.clipArea = clip;

  const observer = new Circle(10, {
    fill: BasicCoordinatesAndSeasonsColors.observerColorProperty,
    stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
    lineWidth: 2,
    centerX: obsX,
    centerY: obsY,
  });
  return iconFrom(
    new Node({
      children: [background(), globe, grid, shading, latitudeGuide, longitudeGuide, observer],
    }),
  );
}

export function createCelestialIcon(): ScreenIcon {
  return iconFrom(new Node({ children: [background(), celestialSphereGraphic(CX, CY, 138)] }));
}

export function createSeasonsIcon(): ScreenIcon {
  const orbitRx = 210;
  const orbitRy = 78;
  const orbit = new Path(Shape.ellipse(CX, CY, orbitRx, orbitRy, 0), {
    stroke: BasicCoordinatesAndSeasonsColors.orbitPathColorProperty,
    lineWidth: 3,
    lineDash: [10, 8],
  });

  // The Sun at the centre, with a soft glow.
  const sunGlow = new Circle(52, {
    fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
    opacity: 0.25,
    centerX: CX,
    centerY: CY,
  });
  const sun = new Circle(34, {
    fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
    stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
    lineWidth: 1.5,
    centerX: CX,
    centerY: CY,
  });

  // Earth on the near side of the orbit, with its fixed tilted rotation axis.
  const earthX = CX + orbitRx * 0.62;
  const earthY = CY + orbitRy * 0.62;
  const earthRadius = 34;
  const earth = new Node({
    children: [earthGlobe(earthX, earthY, earthRadius), globeGrid(earthX, earthY, earthRadius, 1.2)],
  });
  const tilt = (23.4 * Math.PI) / 180;
  const axisDx = Math.sin(tilt) * (earthRadius + 16);
  const axisDy = Math.cos(tilt) * (earthRadius + 16);
  const axis = new Line(earthX + axisDx, earthY - axisDy, earthX - axisDx, earthY + axisDy, {
    stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
    lineWidth: 2.5,
    lineCap: "round",
  });

  // The four cardinal orbit positions (equinoxes / solstices).
  const marks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map(
    (a) =>
      new Circle(4, {
        fill: BasicCoordinatesAndSeasonsColors.orbitPathColorProperty,
        centerX: CX + orbitRx * Math.cos(a),
        centerY: CY + orbitRy * Math.sin(a),
      }),
  );

  return iconFrom(new Node({ children: [background(), orbit, ...marks, sunGlow, sun, earth, axis] }));
}
