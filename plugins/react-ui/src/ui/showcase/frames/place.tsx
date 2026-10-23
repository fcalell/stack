import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { SHELL_COLUMN } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { PortalContainer } from "../../lib/portal.ts";

// The Shell draws the place; a frame or story that stands Panes without a Shell
// places them in it.
export { Place } from "../../components/shell/place.tsx";

const act = () => {};
export const ACTIONS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: act },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: act },
];
export const MORE: Act[] = [
	{ label: "Copy deploy hook", onAct: act },
	{ label: "Export as CSV", onAct: act },
	{ label: "Delete all previews", onAct: act, destructive: true },
];

// A frame drawn at the showcase's width on the column's ground, the way a
// page stands in the shell's column, which has a height of its own when the
// page docks a foot.
export function Column(props: { children: ReactNode }) {
	return (
		<div className={cn(SHELL_COLUMN, "flex flex-col w-screen max-w-full")}>
			{props.children}
		</div>
	);
}

// A frame whose first menu (or, `popup: "listbox"`, its first pick) is open:
// once mounted it focuses that trigger and opens it from the keyboard; with
// `popup: "closed"` it opens none and holds the popups a viewer opens. The
// popup mounts inside the frame, so it draws the frame's mode.
export function Opened(props: {
	children: ReactNode;
	popup?: "menu" | "listbox" | "closed";
}) {
	const popup = props.popup ?? "menu";
	const frame = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	useEffect(() => {
		if (!container || popup === "closed") return;
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
