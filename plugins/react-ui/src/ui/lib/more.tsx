import {
	type More,
	type Read,
	useMore,
	useWindowMore,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonBase } from "../components/button/base.tsx";
import { StateLine } from "./read.tsx";
import { useWords } from "./words.tsx";

// The room under a row of the viewer's own pressing, as a state line carries.
const SHOW = "flex items-center pb-gap";
// A collection that bleeds the card's inset (a Section's sheet) has its
// rows pad themselves with it, so its more row does the same; the quiet act
// hangs its wash out by the control's own padding, its label at the rows' text,
// and gives way to the row's width, its label truncating.
const INSET = "px-pad";
const HANG = "-mx-pad flex min-w-0 max-w-full";

interface MoreProps {
	read: Read<unknown>;
	empty: boolean;
	paint: () => ReactNode;
	/** The collection's rows pad themselves with the card's inset, so this row does too. */
	inset?: boolean;
	/** The rows mounted reach the last one loaded (`useReach`): a long collection loads its next page without a press. */
	scrolled?: boolean;
}

/** Whether the rows a collection's `Window` mounts include the last of its `count` loaded, once it windows (`VIRTUAL_FROM` rows): the viewer is near the end, so the next page loads as the end nears and "Show more" stays for a short collection. `reached` holds for the count it was seen at, so a page that lands is not taken for the end again before the window has ranged over it. Hand `onRange` to the `Window`. */
export function useReach(count: number) {
	const [seen, setSeen] = useState<number>();
	const onRange = useCallback(
		(indices: readonly number[]) => {
			const end = count >= VIRTUAL_FROM && indices.includes(count - 1);
			setSeen((now) => (end ? count : now === undefined ? now : undefined));
		},
		[count],
	);
	return { reached: seen === count, onRange };
}

/** A collection's last row over a read that pages (a pages read, or a window read the collection does not size to its total): "Show more" while a next page remains (pressed by the viewer; a long list that scrolls loads it as the end nears instead), the painted rows `paint` draws while it loads, "Couldn't load more" with Retry when it failed. An empty first page that has more is not empty: the next page is fetched at once. Only this row renders on the next page's fetch; the frame is not busy then. */
export function MoreRow(props: MoreProps) {
	return props.read.kind === "window" ? (
		<WindowMoreRow {...props} />
	) : (
		<PagesMoreRow {...props} />
	);
}

function PagesMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={useMore(props.read)} />;
}

function WindowMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={useWindowMore(props.read)} />;
}

function MoreLine(props: MoreProps & { more: More }) {
	const { more, empty, paint, inset, scrolled } = props;
	const words = useWords();
	const { next, fetching, failed } = more;
	const fetch = useRef(more.fetch);
	fetch.current = more.fetch;
	const fetches = (empty || scrolled === true) && next && !fetching && !failed;
	useEffect(() => {
		if (fetches) fetch.current();
	}, [fetches]);
	if (fetching || fetches) return paint();
	if (failed) {
		return (
			<div className={inset ? INSET : undefined}>
				<StateLine
					sentence={words.moreFailed}
					act={{ label: words.retry, onAct: more.fetch }}
				/>
			</div>
		);
	}
	if (!next) return null;
	return (
		<div className={cn(SHOW, inset && INSET)}>
			<div className={HANG}>
				<ButtonBase act="quiet" label={words.showMore} onAct={more.fetch} />
			</div>
		</div>
	);
}
