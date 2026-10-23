import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { LinkSegment } from "@fcalell/ui-core/descriptors";
import { linkAt } from "@fcalell/ui-core/pick";
import {
	SEGMENT_CHOSEN,
	SEGMENT_IDLE,
	SEGMENT_TRACK,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { use, useCallback, useRef } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import { GroupName } from "../../lib/field.ts";
import { follow, useRoute } from "../../lib/navigate.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { PickerSegmentsProps } from "./index.tsx";

// The segments keep their natural width and a label is never cut: where they
// do not fit the track's room the track scrolls sideways, with no scrollbar
// drawn, as a phone's tab row does, and the chosen segment is scrolled into
// view (below). It hugs its segments in a column too (a FormField), never
// stretching to the field. Its cap is its container's, important: a Pane's
// body caps what stands in it at the measure by a child selector, which would
// otherwise outrank `max-w-full` and leave a track wider than its column,
// scrolling the page. A scroll container has no automatic minimum height, so
// `shrink-0` keeps it from giving up its height to a column that overflows (a
// Pane's body above a tall facet).
const TRACK =
	"inline-flex shrink-0 min-w-0 max-w-full! items-center w-fit overflow-x-auto scrollbar-none";
// A segment rings inset, so the ring clears its neighbours; an idle one
// washes under the pointer and the press and takes the body ink, the chosen
// one carries a 2 px ink underline.
const SEGMENT =
	"group relative inline-flex shrink-0 items-center justify-center focus-visible:-outline-offset-2";
const IDLE_LABEL = "group-hover:text-ink-body";
const LABEL = "truncate max-w-measure-short";

// The chosen segment scrolls into the track's view as it mounts and as the
// choice changes: the ref moves to the segment chosen, which reveals itself (a
// key's focus scrolls its own segment natively). Only the track's own scroll
// moves, never an ancestor, and only when the segment is not already whole in
// view.
function useReveal<E extends HTMLElement>() {
	const track = useRef<E>(null);
	const reveal = useCallback((segment: HTMLElement | null) => {
		const box = track.current;
		if (!box || !segment) return;
		// Physical offsets from the track's edges, so the scroll is the same in a
		// right-to-left page.
		const room = box.getBoundingClientRect();
		const at = segment.getBoundingClientRect();
		if (at.left < room.left) box.scrollBy({ left: at.left - room.left });
		else if (at.right > room.right)
			box.scrollBy({ left: at.right - room.right });
	}, []);
	return [track, reveal] as const;
}

/** The group every Picker in `fit: segments` over choices renders, on the `draft` its host holds: a field hosts the draft of its segments and draws a rejection in its own line. `painted` is the track while its data is not here: one filled box at its loaded size, the segments not drawn, inert. Outside the package's exports. */
export function SegmentsBase<V extends string = string>({
	label,
	options,
	draft,
	onChange,
	painted: given,
}: Pick<PickerSegmentsProps<V>, "label" | "options" | "onChange"> & {
	draft: Draft<V>;
	painted?: boolean;
}) {
	// A read that ended leaves the track with no segment chosen, blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const chosenValue = painted || ended ? "" : draft.value;
	// A FormField around it names it with its visible label.
	const named = use(GroupName);
	const [track, reveal] = useReveal<HTMLDivElement>();
	return (
		<RadioGroup
			ref={track}
			aria-label={named ? undefined : label}
			aria-labelledby={named?.labelledBy}
			value={chosenValue}
			onValueChange={(next) =>
				draft.change(next as V, () => onChange(next as NoInfer<V>))
			}
			inert={painted || undefined}
			aria-disabled={ended || undefined}
			className={cn(
				SEGMENT_TRACK,
				TRACK,
				painted && cn(PAINT_CONTROL, "*:invisible"),
			)}
		>
			{options.map((option) => {
				const chosen = option.value === chosenValue;
				const state = chosen ? "selected" : "idle";
				return (
					<Radio.Root
						key={String(option.value)}
						ref={chosen ? reveal : undefined}
						value={option.value as string}
						nativeButton
						render={<button type="button" />}
						className={cn(
							segment({ state }),
							SEGMENT,
							chosen ? SEGMENT_CHOSEN : SEGMENT_IDLE,
						)}
					>
						<span
							className={cn(
								segmentLabel({ state }),
								LABEL,
								!chosen && IDLE_LABEL,
							)}
						>
							{option.label}
						</span>
					</Radio.Root>
				);
			})}
		</RadioGroup>
	);
}

/** Segments over choices that hold their own draft, as a bare one does; a rejection toasts. `painted` forces the painted track. Outside the package's exports. */
export function HeldSegments<V extends string = string>({
	label,
	options,
	value,
	onChange,
	painted,
}: Omit<PickerSegmentsProps<V>, "fit"> & {
	fit?: "segments";
	painted?: boolean;
}) {
	return (
		<SegmentsBase<V>
			label={label}
			options={options}
			draft={useHeldDraft<V>(value)}
			onChange={onChange}
			painted={painted}
		/>
	);
}

/** Segments over links, the tabs of a place: anchors, the one the location selects marked as the current page, a plain press opening its href in place and any other press the browser's. Outside the package's exports. */
export function LinkSegments({ options }: { options: readonly LinkSegment[] }) {
	const chosen = linkAt(options, useRoute());
	const [track, reveal] = useReveal<HTMLDivElement>();
	return (
		<div ref={track} className={cn(SEGMENT_TRACK, TRACK)}>
			{options.map((option) => {
				const current = option === chosen;
				const state = current ? "selected" : "idle";
				return (
					<a
						key={option.href}
						ref={current ? reveal : undefined}
						href={option.href}
						onClick={follow}
						aria-current={current ? "page" : undefined}
						className={cn(
							segment({ state }),
							SEGMENT,
							current ? SEGMENT_CHOSEN : SEGMENT_IDLE,
						)}
					>
						<span
							className={cn(
								segmentLabel({ state }),
								LABEL,
								!current && IDLE_LABEL,
							)}
						>
							{option.label}
						</span>
					</a>
				);
			})}
		</div>
	);
}
