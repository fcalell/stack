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
import { LoadingContext, useWait, VEIL } from "../../lib/loading.ts";
import { DefinitionWait } from "../definition-row/wait.tsx";

const BOX = "flex flex-col shrink-0 overflow-hidden";
// A waiting Group with no List of its own draws three waiting setting rows:
// a label over a description, a switch at the end.
const SETTING: DefinitionShape = {
	change: false,
	description: true,
	end: "switch",
	code: false,
};
const SETTINGS = [0, 1, 2] as const;

/** Rows in a hairline card. */
export interface GroupProps extends Closed {
	/** The rows wait (a loading Section's body waits with it): a List in it draws its own waiting rows, a Meter, a Slider and a DefinitionRow their own waiting forms, and skeleton setting rows stand in for children none of them answers for. */
	loading?: boolean;
	/** The rows: static rows, or a List whose rows stand on the card. */
	children?: ReactNode;
}

/** Rows in a hairline card on the surface, the hairline drawn once between them, so no row carries one. A List in it draws its rows, its waiting rows and its failed and empty forms on the card. */
export function Group({ loading, children }: GroupProps) {
	const inherited = use(LoadingContext);
	// Its own `loading` waits as a read that lasts does (drawn after a delay, held
	// a minimum); one inherited from a Section arrives already so.
	const late = useWait(loading === true);
	const waiting = loading === undefined ? inherited : late.waiting;
	// A waiting body draws the waiting forms of the parts that register (however
	// deep: a List, a Meter, a Slider, a DefinitionRow); with none, setting
	// skeletons. The body renders once to learn, and the swap lands in a
	// synchronous re-render before paint.
	const parts = useRef(0);
	const [settings, setSettings] = useState(false);
	const host = useMemo<GroupHost>(
		() => ({
			part: () => {
				parts.current += 1;
				return () => {
					parts.current -= 1;
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		setSettings(waiting && groupWait(parts.current) === "settings");
	}, [waiting]);
	return (
		<div
			aria-busy={loading || undefined}
			className={cn(GROUP, BOX, late.veiled && VEIL)}
		>
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
