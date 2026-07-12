/**
 * MonthSelectorNode.ts
 *
 * A linear year slider (0–365 days) with the twelve month segments marked by tick
 * lines and centred abbreviations (Jan … Dec), following the NAAP original's date
 * scrubber. A red marker rides the current date and can be dragged (or nudged with
 * the arrow keys) to scrub the Sun's ecliptic longitude — moving time directly.
 * Clicking a month jumps the Sun to the first of that month.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import {
  DragListener,
  FireListener,
  type Font,
  KeyboardListener,
  Line,
  Node,
  Path,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { eclipticLongitudeForDayOfYear, firstDayOfYearForMonth } from "../../common/SunPosition.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

// Cumulative day-of-year at the start of each month (non-leap), plus the year end.
const MONTH_START_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const DAYS_PER_YEAR = 365;
const STRIP_WIDTH = 330;
const STRIP_HEIGHT = CONTROL_FONT_SIZE + 6;
const DAY_STEP = 1;

export class MonthSelectorNode extends Node {
  public constructor(model: SeasonsModel) {
    const controls = StringManager.getInstance().getControls();
    const months = controls.months;
    const monthProps: TReadOnlyProperty<string>[] = [
      months.januaryStringProperty,
      months.februaryStringProperty,
      months.marchStringProperty,
      months.aprilStringProperty,
      months.mayStringProperty,
      months.juneStringProperty,
      months.julyStringProperty,
      months.augustStringProperty,
      months.septemberStringProperty,
      months.octoberStringProperty,
      months.novemberStringProperty,
      months.decemberStringProperty,
    ];

    const font: Font = new PhetFont(CONTROL_FONT_SIZE);
    const textColor = BasicCoordinatesAndSeasonsColors.textColorProperty;
    const highlightColor = BasicCoordinatesAndSeasonsColors.observerColorProperty;
    const gridColor = BasicCoordinatesAndSeasonsColors.gridColorProperty;

    const dayToX = (day: number): number => (Math.max(0, Math.min(DAYS_PER_YEAR, day)) / DAYS_PER_YEAR) * STRIP_WIDTH;

    // Tick lines at every month boundary (and both ends).
    const ticks = new Node({
      children: MONTH_START_DAYS.map(
        (day) => new Line(dayToX(day), 0, dayToX(day), STRIP_HEIGHT, { stroke: gridColor, lineWidth: 1 }),
      ),
    });

    // Month abbreviations, centred within each segment; clicking jumps to the 1st.
    const labels: Text[] = monthProps.map((prop, monthIndex) => {
      const abbrevProperty = new DerivedProperty([prop], (name) => name.substring(0, 3));
      const label = new Text(abbrevProperty, { font, fill: textColor, cursor: "pointer" });
      const segmentStart = MONTH_START_DAYS[monthIndex] ?? 0;
      const segmentEnd = MONTH_START_DAYS[monthIndex + 1] ?? DAYS_PER_YEAR;
      label.centerX = (dayToX(segmentStart) + dayToX(segmentEnd)) / 2;
      label.centerY = STRIP_HEIGHT / 2;
      label.addInputListener(
        new FireListener({
          fire: () => {
            model.sunEclipticLongitudeProperty.value = eclipticLongitudeForDayOfYear(
              firstDayOfYearForMonth(monthIndex),
            );
          },
        }),
      );
      return label;
    });
    const labelsRow = new Node({ children: labels });

    // Red marker: a caret above the strip plus a vertical line through it.
    const caret = new Path(new Shape().moveTo(-5, 0).lineTo(5, 0).lineTo(0, 7).close(), { fill: highlightColor });
    caret.bottom = 0;
    const markerLine = new Line(0, 2, 0, STRIP_HEIGHT - 1, { stroke: highlightColor, lineWidth: 1.5 });
    const marker = new Node({
      children: [markerLine, caret],
      cursor: "ew-resize",
      tagName: "div",
      focusable: true,
      accessibleName: controls.dateStringProperty,
    });

    // A transparent hit strip so the date can also be set by clicking/dragging anywhere.
    const hitStrip = new Rectangle(0, 0, STRIP_WIDTH, STRIP_HEIGHT, { fill: "rgba(0,0,0,0)", cursor: "ew-resize" });

    super({ children: [hitStrip, ticks, labelsRow, marker] });

    // Keep the marker on the current date.
    Multilink.multilink([model.dayOfYearProperty, model.monthDayProperty], (day, { monthIndex }) => {
      marker.x = dayToX(day);
      labels.forEach((label, i) => {
        label.fill = i === monthIndex ? highlightColor : textColor;
      });
    });

    // Drag anywhere on the strip (or the marker) to set the date from the x position.
    const setDateFromPoint = (globalPoint: Vector2): void => {
      const x = this.globalToLocalPoint(globalPoint).x;
      const day = Math.max(1, Math.min(DAYS_PER_YEAR, (x / STRIP_WIDTH) * DAYS_PER_YEAR));
      model.sunEclipticLongitudeProperty.value = eclipticLongitudeForDayOfYear(day);
    };
    hitStrip.addInputListener(new DragListener({ drag: (event) => setDateFromPoint(event.pointer.point) }));
    marker.addInputListener(new DragListener({ drag: (event) => setDateFromPoint(event.pointer.point) }));

    // Arrow keys nudge the date by a day.
    marker.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          const day = model.dayOfYearProperty.value;
          if (keysPressed === "arrowRight" || keysPressed === "arrowUp") {
            model.sunEclipticLongitudeProperty.value = eclipticLongitudeForDayOfYear(day + DAY_STEP);
          } else if (keysPressed === "arrowLeft" || keysPressed === "arrowDown") {
            model.sunEclipticLongitudeProperty.value = eclipticLongitudeForDayOfYear(day - DAY_STEP);
          }
        },
      }),
    );
  }
}
