import { type DefinitionShape, groupWait } from "@fcalell/ui-core/list-state";
import { GROUP } from "@fcalell/ui-core/variants";
import {
	Children,
	isValidElement,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { between, GroupContext, type GroupHost } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";
import { DefinitionWait } from "../definition-row/wait";

const BOX = "overflow-hidden";
// A waiting Group with no List of its own draws three waiting setting rows:
// a label over a description, a switch at the end.
const SETTING: DefinitionShape = {
	change: false,
	description: true,
	end: "switch",
	code: false,
};
const SETTINGS = [0, 1, 2] as const;

export interface GroupProps extends Closed {
	loading?: boolean;
	children?: ReactNode;
}

// Rows in a hairline card on the surface, the hairline drawn once between
// them, so no row carries one. A List in it draws its rows, its waiting rows
// and its failed and empty forms on the card. A loading Section's body waits
// with it: a List draws its own waiting rows, a Meter, a Slider and a
// DefinitionRow their own waiting forms, and skeleton setting rows stand in
// for children none of them answers for.
export function Group({ loading, children }: GroupProps) {
	const inherited = useContext(LoadingContext);
	const waiting = loading ?? inherited;
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
	const rows =
		waiting && settings
			? SETTINGS.map((index) => (
					<DefinitionWait key={index} shape={SETTING} index={index} />
				))
			: Children.toArray(children);
	return (
		<View
			accessibilityState={{ busy: loading === true }}
			className={cn(GROUP, BOX)}
		>
			<LoadingContext.Provider value={waiting}>
				<GroupContext.Provider value={host}>
					<GroundContext.Provider value="group">
						{rows.map((row, index) => (
							// Each wrapper keeps its row's own key (`Children.toArray`
							// keys a row by its place among the children as written,
							// so a conditional row appearing shifts no later row's
							// state); a keyless text stands at its index.
							<View
								key={isValidElement(row) && row.key !== null ? row.key : index}
								className={between(index)}
							>
								{row}
							</View>
						))}
					</GroundContext.Provider>
				</GroupContext.Provider>
			</LoadingContext.Provider>
		</View>
	);
}
