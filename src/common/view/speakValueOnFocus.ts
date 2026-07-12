/**
 * speakValueOnFocus.ts
 *
 * Interactive-description helper: speak a live "object response" — the current
 * value of a draggable object — to screen readers whenever that value changes
 * while the object holds keyboard focus.
 *
 * Every draggable coordinate marker in this sim (the map cursor, globe observer,
 * sky-map star, sphere guide star, orbit Earth, date scrubber, close-up observer)
 * has an accessible name, help text, and arrow-key control, but on its own it
 * gives a screen-reader user no feedback about the *result* of a nudge. This wires
 * that missing feedback: as a keyboard user arrows the object, the resulting
 * coordinate is announced.
 *
 * Pointer drags do not move DOM focus, so mouse users hear nothing (they can see
 * the value). Rapid arrow presses are collapsed to the final value by the
 * utterance's `alertStableDelay`, so the queue never backs up.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Node } from "scenerystack/scenery";
import { Utterance } from "scenerystack/utterance-queue";

/** Debounce (ms) so a burst of arrow presses announces once, with the final value. */
const ALERT_STABLE_DELAY = 500;

/**
 * Announce `responseProperty` as an object response on `node` each time it changes
 * while `node` is focused.
 *
 * @param node - the focusable draggable object
 * @param responseProperty - a localized string describing the object's current value
 */
export function speakValueOnFocus(node: Node, responseProperty: TReadOnlyProperty<string>): void {
  // The utterance reads the property's current value when it is announced, and
  // debounces bursts of changes into a single, final announcement.
  const utterance = new Utterance({ alert: responseProperty, alertStableDelay: ALERT_STABLE_DELAY });
  responseProperty.lazyLink(() => {
    if (node.focused) {
      node.addAccessibleObjectResponse(utterance);
    }
  });
}
