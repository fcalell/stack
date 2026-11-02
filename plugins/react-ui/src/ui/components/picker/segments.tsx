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
import { use, useLayoutEffect, useRef } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import { GroupName } from "../../lib/field.ts";
import { follow, useRoute } from "../../lib/navigate.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { PickerSegmentsProps } from "./index.tsx";

// The segments keep their natural width and a label is never cut: where they
// do not fit the track's room the track scrolls sideways, with no scrollbar
// drawn, as a phone's tab row does, and the chosen segment is scrolled into
// view (below), and the track fades at the edge that has more (`scroll-fade-x`),
// so a tab at the edge never stands cut with nothing to say so. It hugs its segments in a column too (a FormField), never
// stretching to the field. Its cap is its container's, important: a Pane's
// body caps what stands in it at the measure by a child selector, which would
// otherwise outrank `max-w-full` and leave a track wider than its column,
// scrolling the page. A scroll container has no automatic minimum height, so
// `shrink-0` keeps it from giving up its height to a column that overflows (a
// Pane's body above a tall facet). It is positioned, so it is its segments'
// offset parent: the radio group scrolls the chosen segment into view by its
// offset in the track (`offsetLeft` up the offset parents), and from any
// further ancestor that offset is the segment's place in the page, which reads
// as a segment past the track's end and scrolls it to the end: a chosen segment
// that fits stands scrolled past the ones before it.
const TRACK =
	"relative inline-flex shrink-0 min-w-0 max-w-full! items-center w-fit overflow-x-auto scrollbar-none scroll-fade-x";
// A segment rings inset, so the ring clears its neighbours; an idle one
// washes under the pointer and the press and takes the body ink, the chosen
// one carries a 2 px ink underline.
const SEGMENT =
	"group relative inline-flex shrink-0 items-center justify-center focus-visible:-outline-offset-2";
const IDLE_LABEL = "group-hover:text-ink-body";
const LABEL = "truncate max-w-measure-short";

// The chosen segment is in the track's view whenever the track holds it: as it
// mounts, as the choice changes and as the track's size changes (the phone's
// width, a late font, a Pane's body settling). A chosen tab is never the one
// cut; only the track's own scroll moves, never an ancestor, and only when the
// segment is not already whole in view (a pixel of subpixel rounding is whole).
// This reads two boxes in JavaScript because CSS cannot scroll a track to a
// child on its own (structure rule 7's segments' scroll); it looks the chosen
// segment up in the track, since a ref on a child runs before its parent's is
// set, which is why the reveal on mount was lost. A key's focus scrolls its own
// segment natively.
const CHOSEN = '[role="radio"][aria-checked="true"], [aria-current="page"]';
const SLACK = 1;
function useReveal<E extends HTMLElement>(chosen: string) {
	const track = useRef<E>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the choice is what moves the segment to reveal
	useLayoutEffect(() => {
		const box = track.current;
		if (!box) return;
		const reveal = () => {
			const segment = box.querySelector<HTMLElement>(CHOSEN);
			if (!segment) return;
			// Physical offsets from the track's edges, so the scroll is the same in a
			// right-to-left page.
			const room = box.getBoundingClientRect();
			const at = segment.getBoundingClientRect();
			if (at.left < room.left - SLACK)
				box.scrollBy({ left: at.left - room.left });
			else if (at.right > room.right + SLACK)
				box.scrollBy({ left: at.right - room.right });
		};
		reveal();
		const watch = new ResizeObserver(reveal);
		watch.observe(box);
		return () => watch.disconnect();
	}, [chosen]);
	return track;
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
	const track = useReveal<HTMLDivElement>(chosenValue);
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
	const track = useReveal<HTMLDivElement>(chosen?.href ?? "");
	return (
		<div ref={track} className={cn(SEGMENT_TRACK, TRACK)}>
			{options.map((option) => {
				const current = option === chosen;
				const state = current ? "selected" : "idle";
				return (
					<a
						key={option.href}
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
