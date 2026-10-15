import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Select } from "../../components/select/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, waitingText } from "../waiting.ts";
import { beside, isPaint, labelled } from "./painted.tsx";

const change = () => {};

const REGIONS = [
	{
		label: "Europe",
		options: [
			{ value: "eu-central-1", label: "Frankfurt, eu-central-1" },
			{ value: "eu-west-1", label: "Ireland, eu-west-1" },
			{ value: "eu-west-2", label: "London, eu-west-2" },
		],
	},
	{
		label: "North America",
		options: [
			{ value: "us-east-1", label: "N. Virginia, us-east-1" },
			{ value: "us-west-2", label: "Oregon, us-west-2" },
		],
	},
];

function press(target: Element | null | undefined, key: string): void {
	target?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

// The open list: the frame opens its select from the keyboard once mounted
// and moves the highlight two rows down, off the chosen row. The popup mounts
// inside the frame, so it draws the frame's mode, and flows under the
// trigger (the positioner, under Base UI's portal node, drawn `static` with no
// transform over its own placement) so the frame holds it.
function Open(props: { children: ReactNode }) {
	const frame = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	useEffect(() => {
		if (!container) return;
		const trigger = frame.current?.querySelector("button");
		trigger?.focus();
		press(trigger, "ArrowDown");
		const move = requestAnimationFrame(() => {
			const list = container.querySelector('[role="listbox"]');
			press(list, "ArrowDown");
			press(list, "ArrowDown");
		});
		return () => cancelAnimationFrame(move);
	}, [container]);
	return (
		<PortalContainer value={container}>
			<div ref={frame} className="flex flex-col gap-pair">
				{props.children}
				<div ref={setContainer} className="*:*:static! *:*:transform-none!" />
			</div>
		</PortalContainer>
	);
}

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them; the label names a button, so it is
// no native `<label>`. The placeholder cell and an error draw nothing
// chosen; every other frame has a region chosen, and `selected` draws the
// list open; the first error cell adds the control over options that fail
// and answer not found. `PAINT.kind.control` draws the trigger beside its painted form, a
// value that never arrives.
export function drawSelect(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			labelled(
				<Select value="eu-central-1" onChange={change} options={REGIONS} />,
			),
			labelled(
				<Select value={waitingText} onChange={change} options={REGIONS} />,
			),
		);
	const name = frame.cell.name;
	const empty =
		name === "FIELD_PLACEHOLDER" ||
		name === "FIELD.state.error" ||
		frame.state === "error";
	const control = (
		<Field.Root
			invalid={frame.state === "error" || name === "FIELD.state.error"}
			disabled={frame.state === "disabled"}
		>
			<Field.Label
				nativeLabel={false}
				render={<div />}
				className={text({ role: "body" })}
			>
				Default region
			</Field.Label>
			<Select
				value={empty ? undefined : "eu-central-1"}
				onChange={change}
				options={REGIONS}
				placeholder="Choose a region"
			/>
		</Field.Root>
	);
	if (frame.state === "selected") return <Open>{control}</Open>;
	// The first error cell also draws the control over options that fail and
	// answer not found: no frame holds them, so the control says so itself.
	if (frame.state === "error" && isFirstCell(frame))
		return (
			<div className="flex flex-col gap-sections">
				{control}
				{endedAt<{ value: string; label: string }>(frame.id, "error").map(
					({ title, items }) => (
						<Select
							key={title}
							value="eu-central-1"
							onChange={change}
							options={items}
						/>
					),
				)}
			</div>
		);
	return control;
}
