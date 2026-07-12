/**
 * CoordinateIndicatorNode.ts
 *
 * The two-segment coordinate indicator shared by the flat Earth map (longitude /
 * latitude) and the flat sky map (right ascension / declination). A horizontal
 * segment runs along the "equator" from a reference column to the marker's column,
 * its length encoding the horizontal coordinate; a vertical segment runs along the
 * marker's meridian from the equator to the marker, its length encoding the vertical
 * coordinate. Each segment carries a value pill at its midpoint.
 *
 * The horizontal segment is tiled at x ∈ {−width, 0, +width} so it stays contiguous
 * across the pan seam even when the reference column is off-screen. Non-interactive:
 * the owning map computes the screen geometry (accounting for its own pan) and pushes
 * it in via update().
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path, type ProfileColorProperty, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";

/** Screen geometry pushed in on every marker/pan change. All values in view px. */
export type CoordinateIndicatorState = {
  /** Screen Y of the horizontal reference axis ("equator"). */
  equatorY: number;
  /** Screen X (may lie outside [0, width]) of the horizontal reference (0° / 0ʰ). */
  referenceScreenX: number;
  /** Signed pixels from the reference to the marker along the horizontal axis. */
  horizontalDeltaX: number;
  /** Screen X of the marker column, wrapped into [0, width). */
  markerScreenX: number;
  /** Screen Y of the marker. */
  markerY: number;
};

export type CoordinateIndicatorNodeOptions = {
  width: number;
  height: number;
  horizontalLabelProperty: TReadOnlyProperty<string>;
  verticalLabelProperty: TReadOnlyProperty<string>;
  horizontalColorProperty: ProfileColorProperty;
  verticalColorProperty: ProfileColorProperty;
};

/** Positive modulo (result always in [0, n)). */
const mod = (value: number, n: number): number => ((value % n) + n) % n;

export class CoordinateIndicatorNode extends Node {
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private readonly horizontalPath: Path;
  private readonly verticalLine: Line;
  private readonly horizontalPill: Node;
  private readonly verticalPill: Node;
  private state: CoordinateIndicatorState = {
    equatorY: 0,
    referenceScreenX: 0,
    horizontalDeltaX: 0,
    markerScreenX: 0,
    markerY: 0,
  };

  public constructor(options: CoordinateIndicatorNodeOptions) {
    const { width, height } = options;
    const labelFont = new PhetFont({ size: 9, weight: "bold" });

    const makePill = (labelProperty: TReadOnlyProperty<string>, colorProperty: ProfileColorProperty): Node => {
      const text = new Text(labelProperty, { font: labelFont, fill: colorProperty, pickable: false });
      const bg = new Rectangle(0, 0, 1, 1, {
        fill: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
        opacity: 0.85,
        cornerRadius: 3,
        pickable: false,
      });
      text.localBoundsProperty.link((bounds) => {
        bg.rectX = bounds.minX - 3;
        bg.rectY = bounds.minY - 2;
        bg.rectWidth = bounds.width + 6;
        bg.rectHeight = bounds.height + 4;
      });
      return new Node({ children: [bg, text], pickable: false });
    };

    // Horizontal segment is a Path so it can be tiled across the ±width seam.
    const horizontalPath = new Path(null, {
      stroke: options.horizontalColorProperty,
      lineWidth: 2,
      pickable: false,
    });
    // Vertical segment lives on the marker's meridian (never wraps vertically).
    const verticalLine = new Line(0, 0, 0, 0, { stroke: options.verticalColorProperty, lineWidth: 2, pickable: false });
    const horizontalPill = makePill(options.horizontalLabelProperty, options.horizontalColorProperty);
    const verticalPill = makePill(options.verticalLabelProperty, options.verticalColorProperty);

    super({ pickable: false, children: [horizontalPath, verticalLine, horizontalPill, verticalPill] });

    this.mapWidth = width;
    this.mapHeight = height;
    this.horizontalPath = horizontalPath;
    this.verticalLine = verticalLine;
    this.horizontalPill = horizontalPill;
    this.verticalPill = verticalPill;

    // The pills' sizes settle asynchronously as their text lays out; re-place then.
    horizontalPill.localBoundsProperty.link(() => this.reposition());
    verticalPill.localBoundsProperty.link(() => this.reposition());
  }

  public update(state: CoordinateIndicatorState): void {
    this.state = state;
    this.reposition();
  }

  private reposition(): void {
    const width = this.mapWidth;
    const height = this.mapHeight;
    const { equatorY, referenceScreenX, horizontalDeltaX, markerScreenX, markerY } = this.state;

    // Horizontal segment from the reference by the signed delta; three tiled copies
    // guarantee a visible, contiguous segment under the clipped viewport at the seam.
    const a = referenceScreenX;
    const b = referenceScreenX + horizontalDeltaX;
    const horizontalShape = new Shape();
    for (const off of [-width, 0, width]) {
      horizontalShape.moveTo(a + off, equatorY).lineTo(b + off, equatorY);
    }
    this.horizontalPath.shape = horizontalShape;
    // Vertical segment along the marker's meridian, equator → marker.
    this.verticalLine.setLine(markerScreenX, equatorY, markerScreenX, markerY);

    // Value labels at each segment's midpoint, clamped inside the map.
    const horizontalMidX = mod(referenceScreenX + horizontalDeltaX / 2, width);
    const horizontalHalfW = this.horizontalPill.width / 2;
    const horizontalHalfH = this.horizontalPill.height / 2;
    this.horizontalPill.center = new Vector2(
      clamp(horizontalMidX, horizontalHalfW, width - horizontalHalfW),
      clamp(equatorY - horizontalHalfH - 3, horizontalHalfH, height - horizontalHalfH),
    );
    const verticalMidY = (equatorY + markerY) / 2;
    const verticalHalfW = this.verticalPill.width / 2;
    const verticalHalfH = this.verticalPill.height / 2;
    this.verticalPill.center = new Vector2(
      clamp(markerScreenX + verticalHalfW + 4, verticalHalfW, width - verticalHalfW),
      clamp(verticalMidY, verticalHalfH, height - verticalHalfH),
    );
  }
}
