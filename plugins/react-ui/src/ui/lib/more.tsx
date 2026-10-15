import { type Read, useMore } from "@fcalell/plugin-api/tanstack-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "../components/button/index.tsx";
import { StateLine } from "./read.tsx";
import { useWords } from "./words.tsx";

// The room under a row of the viewer's own pressing, as a state line carries.
const SHOW = "flex items-center pb-inside";

/** A collection's last row over a pages read: "Show more" while a next page remains (pressed by the viewer, never by scrolling), the painted rows `paint` draws while it loads, "Couldn't load more" with Retry when it failed. An empty first page that has more is not empty: the next page is fetched at once. Only this row renders on the next page's fetch; the frame is not busy then. */
export function MoreRow(props: {
	read: Read<unknown>;
	empty: boolean;
	paint: () => ReactNode;
}) {
	const { read, empty, paint } = props;
	const words = useWords();
	const more = useMore(read);
	const { next, fetching, failed } = more;
	const fetch = useRef(more.fetch);
	fetch.current = more.fetch;
	const fetches = empty && next && !fetching && !failed;
	useEffect(() => {
		if (fetches) fetch.current();
	}, [fetches]);
	if (fetching || fetches) return paint();
	if (failed) {
		return (
			<StateLine
				sentence={words.moreFailed}
				act={{ label: words.retry, onAct: more.fetch }}
			/>
		);
	}
	if (!next) return null;
	return (
		<div className={SHOW}>
			<Button act="quiet" fit="bar" label={words.showMore} onAct={more.fetch} />
		</div>
	);
}
