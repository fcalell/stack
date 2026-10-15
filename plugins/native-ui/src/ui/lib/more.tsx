import { type Read, useMore } from "@fcalell/plugin-api/tanstack-query";
import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";
import { Button } from "../components/button";
import { cn } from "./cn";
import { StateLine } from "./read";
import { useWords } from "./words";

// The room under a row of the viewer's own pressing, as a state line carries.
const SHOW = "flex-row items-center pb-inside";
// A collection that bleeds the card's inset (a List, a Group's card) has its
// rows pad themselves with it, so its more row does the same; the quiet act
// hangs its wash out by the control's own padding, its label at the rows' text.
const INSET = "px-card";
const HANG = "-mx-control-x";

// A collection's last row over a pages read: "Show more" while a next page
// remains (pressed by the viewer, never by scrolling), the painted rows
// `paint` draws while it loads, "Couldn't load more" with Retry when it
// failed. An empty first page that has more is not empty: the next page is
// fetched at once. Only this row renders on the next page's fetch; the frame
// is not busy then.
export function MoreRow(props: {
	read: Read<unknown>;
	empty: boolean;
	paint: () => ReactNode;
	// The collection's rows pad themselves with the card's inset, so this row
	// does too.
	inset?: boolean;
}) {
	const { read, empty, paint, inset } = props;
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
			<View className={inset ? INSET : undefined}>
				<StateLine
					sentence={words.moreFailed}
					act={{ label: words.retry, onAct: more.fetch }}
				/>
			</View>
		);
	}
	if (!next) return null;
	return (
		<View className={cn(SHOW, inset && INSET)}>
			<View className={HANG}>
				<Button
					act="quiet"
					fit="bar"
					label={words.showMore}
					onAct={more.fetch}
				/>
			</View>
		</View>
	);
}
