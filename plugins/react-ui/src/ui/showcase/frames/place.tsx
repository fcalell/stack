import { cn } from "@fcalell/ui-core/cn";
import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { SHELL_COLUMN } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Group } from "../../components/group/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInList } from "./layout-context.tsx";
import { TURN, TURNS } from "./thread.tsx";

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
// page stands in the shell's column, which has a height of its own when the
// page docks a foot.
export function Column(props: { children: ReactNode; height?: string }) {
	return (
		<div
			className={cn(
				SHELL_COLUMN,
				"flex flex-col w-screen max-w-full",
				props.height,
			)}
		>
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

// A spec read in a context: Live, or a change set whose kind is its chip,
// the list ending with the act that opens a new one.
function Spec() {
	const [context, setContext] = useState("billing");
	return (
		<Place
			title="Billing"
			context={{
				label: "Context",
				value: context,
				onChange: setContext,
				options: [
					{ value: "live", label: "Live" },
					{
						value: "billing",
						label: "Billing limits",
						chip: { family: "amber", label: "Draft" },
					},
					{
						value: "onboarding",
						label: "Onboarding copy",
						chip: { family: "green", label: "Ready" },
					},
				],
				act: { icon: "Plus", label: "New change set", onAct: act },
			}}
			actions={SEARCH}
		>
			<StandInList />
		</Place>
	);
}

// An assistant's home: its sections scrolling under the ask field docked at
// its foot, the latest exchange inline in the last section.
function Home() {
	const [value, setValue] = useState("");
	return (
		<Place
			title="Home"
			actions={SEARCH}
			foot={
				<MessageInput
					value={value}
					onChange={setValue}
					onAttach={act}
					placeholder="Ask about your deploys"
					onSend={() => setValue("")}
				/>
			}
		>
			<Section title="Tasks">
				<Group>
					<StandInList />
				</Group>
			</Section>
			<Section title="Latest">
				<Thread items={TURNS.slice(-2)} message={TURN} />
			</Section>
		</Place>
	);
}

// The cell picks the form: the title the Place with its actions, more and
// act; the primary act that act loading; the bar fit a bleeding body under
// one action; the bar icon act its more menu open; the body icon act (the
// touch top bar's) an assistant's home under its search act, its ask field
// docked at its foot, since the foot draws no matrix cell of its own; the
// pick's pill cells a spec read in a change set (its chip on the trigger),
// and the chip cells the same with its list open on the desktop. The other
// cells are the atoms' own.
export function drawPlace(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell.startsWith("CHIP") && frame.density === "desktop")
		return (
			<Opened popup="listbox">
				<Column>
					<Spec />
				</Column>
			</Opened>
		);
	if (
		cell === "PILL_ACT" ||
		cell === "PICKER_VALUE" ||
		cell === "ICON.fit.meta" ||
		cell.startsWith("CHIP")
	)
		return (
			<Opened popup="closed">
				<Column>
					<Spec />
				</Column>
			</Opened>
		);
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
	if (cell === "ICON_BUTTON.fit.body")
		return (
			<Column height="h-185">
				<Home />
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
