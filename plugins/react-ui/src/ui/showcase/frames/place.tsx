import { cn } from "@fcalell/ui-core/cn";
import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { SHELL_COLUMN } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Place } from "../../components/place/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInList } from "./layout-context.tsx";

const act = () => {};
export const ACTIONS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: act },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: act },
];
const SEARCH = [{ icon: "Search" as const, label: "Search", onAct: act }];
export const MORE: MenuItem[] = [
	{ label: "Copy deploy hook", onAct: act },
	{ label: "Export as CSV", onAct: act },
	{ label: "Delete all previews", onAct: act, destructive: true },
];

// A frame drawn at the showcase's width on the column's ground, the way a
// page stands in the shell's column.
export function Column(props: { children: ReactNode }) {
	return (
		<div className={cn(SHELL_COLUMN, "flex flex-col w-screen max-w-full")}>
			{props.children}
		</div>
	);
}

// A frame whose first menu (or, `popup: "listbox"`, its first pick) is open:
// once mounted it focuses that trigger and opens it from the keyboard. The
// popup mounts inside the frame, so it draws the frame's mode.
export function Opened(props: {
	children: ReactNode;
	popup?: "menu" | "listbox";
}) {
	const popup = props.popup ?? "menu";
	const frame = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	useEffect(() => {
		if (!container) return;
		const trigger = frame.current?.querySelector<HTMLElement>(
			`[aria-haspopup="${popup}"]`,
		);
		trigger?.focus();
		trigger?.dispatchEvent(
			new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
		);
	}, [container, popup]);
	return (
		<PortalContainer value={container}>
			<div ref={frame} className="relative flex flex-col">
				{props.children}
				<div ref={setContainer} />
			</div>
		</PortalContainer>
	);
}

function Deploys(props: { loading?: boolean }) {
	return (
		<Place
			title="Deploys"
			actions={ACTIONS}
			more={MORE}
			act={{
				label: "Deploy",
				onAct: act,
				loading: props.loading,
			}}
		>
			<StandInList />
		</Place>
	);
}

// The cell picks the form: the title the Place with its actions, more and
// act; the primary act that act loading; the bar fit a bleeding body under
// one action; the bar icon act its more menu open. The other cells are the
// atoms' own.
export function drawPlace(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "TEXT.role.title")
		return (
			<Column>
				<Deploys />
			</Column>
		);
	if (cell === "BUTTON.act.primary")
		return (
			<Column>
				<Deploys loading />
			</Column>
		);
	if (cell === "BUTTON.fit.bar")
		return (
			<Column>
				<Place title="Logs" actions={SEARCH} bleed>
					<StandInList />
				</Place>
			</Column>
		);
	if (cell === "ICON_BUTTON.fit.bar")
		return (
			<Opened>
				<Column>
					<Deploys />
				</Column>
			</Opened>
		);
	return undefined;
}
