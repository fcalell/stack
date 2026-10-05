import { cn } from "@fcalell/ui-core/cn";
import { type DefinitionShape, groupWait } from "@fcalell/ui-core/list-state";
import { GROUP } from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	use,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { GroupContext, type GroupHost } from "../../lib/group.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { DefinitionWait } from "../definition-row/wait.tsx";

const BOX = "flex flex-col overflow-hidden";
// A waiting Group with no List of its own draws three waiting setting rows:
// a label over a description, a switch at the end.
const SETTING: DefinitionShape = {
	change: false,
	description: true,
	end: "switch",
};
const SETTINGS = [0, 1, 2] as const;

/** Rows in a hairline card. */
export interface GroupProps extends Closed {
	/** The rows wait (a loading Section's body waits with it): a List in it draws its own waiting rows, and skeleton setting rows stand in for static rows. */
	loading?: boolean;
	/** The rows: static rows, or a List whose rows stand on the card. */
	children?: ReactNode;
}

/** Rows in a hairline card on the surface, the hairline drawn once between them, so no row carries one. A List in it draws its rows, its waiting rows and its failed and empty forms on the card, the card busy while the List's items wait. */
export function Group({ loading, children }: GroupProps) {
	const inherited = use(LoadingContext);
	const waiting = loading ?? inherited;
	// A waiting body draws a List's own waiting rows when one (however deep)
	// registers; with none, setting skeletons. The body renders once to learn,
	// and the swap lands in a synchronous re-render before paint.
	const lists = useRef(0);
	const [busyLists, setBusyLists] = useState(0);
	const [settings, setSettings] = useState(false);
	const host = useMemo<GroupHost>(
		() => ({
			list: (busy) => {
				lists.current += 1;
				if (busy) setBusyLists((count) => count + 1);
				return () => {
					lists.current -= 1;
					if (busy) setBusyLists((count) => count - 1);
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		setSettings(waiting && groupWait(lists.current) === "settings");
	}, [waiting]);
	// A loading Section is busy once: rows drawn on its word say nothing.
	const busy = loading === true || busyLists > 0;
	return (
		<div aria-busy={busy || undefined} className={cn(GROUP, BOX)}>
			{waiting && settings ? (
				SETTINGS.map((index) => (
					<DefinitionWait key={index} shape={SETTING} index={index} />
				))
			) : (
				<LoadingContext value={waiting}>
					<GroupContext value={host}>
						<GroundContext value="group">{children}</GroundContext>
					</GroupContext>
				</LoadingContext>
			)}
		</div>
	);
}
