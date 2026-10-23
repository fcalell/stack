import { type Read, useMore } from "@fcalell/plugin-api/tanstack-query";
import { type ReactNode, useEffect, useRef } from "react";
import { type MoreState, pagesAt } from "../waiting.ts";

const HOWS: readonly MoreState[] = ["next", "fetching", "failed"];

// Asks for the next page once it can be asked for, as a viewer pressing "Show
// more" would, so a frame stands in the state that follows the press.
function Pressed(props: { read: Read<unknown>; children: ReactNode }) {
	const { next, fetch } = useMore(props.read);
	const pressed = useRef(false);
	useEffect(() => {
		if (next && !pressed.current) {
			pressed.current = true;
			fetch();
		}
	}, [next, fetch]);
	return props.children;
}

/** A collection over a pages read in each state of its more row: "Show more" standing, the next page loading (painted rows) and the next page failed (the line with Retry). `draw` is given each form's read and its name. */
export function Paged<T>(props: {
	id: string;
	rows: readonly T[];
	draw: (read: Read<readonly T[]>, how: MoreState) => ReactNode;
}) {
	return (
		<>
			{HOWS.map((how) => {
				const read = pagesAt(`${props.id}/${how}`, how, props.rows);
				const form = props.draw(read, how);
				return how === "next" ? (
					<div key={how}>{form}</div>
				) : (
					<Pressed key={how} read={read}>
						{form}
					</Pressed>
				);
			})}
		</>
	);
}
