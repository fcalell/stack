import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import { accepts, fileSize, kindsOf } from "@fcalell/ui-core/file";
import { pathCut } from "@fcalell/ui-core/list-state";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FIELD_ERROR_LINE,
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	FIGURES,
	field,
	fieldValue,
	LINE_IN,
	text,
} from "@fcalell/ui-core/variants";
import { type ChangeEvent, type DragEvent, useId, useState } from "react";
import { FieldDisabled } from "../../lib/field.ts";
import { BOX_FOCUS, useModality } from "../../lib/modality.ts";
import { pickedFrom } from "../../lib/picked.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { BOX, BOX_DISABLED, BOX_HOVER_VALUE } from "./base.tsx";
import type { FilePickProps } from "./index.tsx";

// The native file input lies over the whole box, unseen: a press anywhere
// opens the system dialog and the keyboard reaches it, so the box rings on its
// focus as an `Input`'s does. The remove act stands above it.
const PICK = "absolute inset-0 opacity-0";
const ANCHOR = "relative";
const STACK = "flex flex-col gap-gap min-w-0";
const ABOVE = "relative flex";
const VALUE = "min-w-0 grow truncate";
// A chosen name cuts in its middle as a file row's does (`pathCut`): its stem
// truncates and its end, the extension and the characters before it, stands
// whole while the box holds it: the stem gives first (a shrink weight past the
// end's), and the end gives only once the stem is gone, cut with an ellipsis,
// so the box never outgrows its column.
const NAME = "flex min-w-0 grow";
const STEM = "min-w-0 truncate shrink-10000000";
const END = "min-w-0 truncate";
const SIZE = "shrink-0 max-w-measure-short truncate";
const DISABLED = "text-ink-disabled";
// A file over the box draws the focus ring, the box being where it lands.
const OVER = "outline-2 outline-offset-(--focus-ring-edge-offset) outline-ring";

function Name(props: { name: string }) {
	const { stem, tail } = pathCut(props.name);
	return (
		<>
			<span className={STEM}>{stem}</span>
			<span className={END}>{tail}</span>
		</>
	);
}

/** The field box a `file` Input draws. Outside the package's exports. */
export function FileField({ value, onChange, accept }: FilePickProps) {
	useModality();
	const words = useWords();
	// What the box refused stands in its own line until the next pick.
	const [refused, refuse] = useState<string>();
	const line = useId();
	const [over, setOver] = useState(false);
	const take = (file: File | undefined) => {
		if (!file) return;
		if (!accepts(file, accept)) {
			refuse(
				filled(words.wrongType, {
					name: file.name,
					types: kindsOf(accept, words).join(", "),
				}),
			);
			return;
		}
		refuse(undefined);
		onChange(pickedFrom(file));
	};
	const pick = (event: ChangeEvent<HTMLInputElement>) => {
		take(event.currentTarget.files?.[0]);
		// The same file chosen again is a change the input would not report.
		event.currentTarget.value = "";
	};
	const leave = (event: DragEvent<HTMLDivElement>) => {
		const next = event.relatedTarget;
		if (next instanceof Node && event.currentTarget.contains(next)) return;
		setOver(false);
	};
	const drop = (event: DragEvent<HTMLDivElement>, disabled: boolean) => {
		// A file dropped past the box would open in the tab.
		event.preventDefault();
		setOver(false);
		if (!disabled) take(event.dataTransfer.files[0]);
	};
	return (
		<div className={STACK}>
			<Control
				type="file"
				accept={accept.join(",")}
				onChange={pick}
				// Base UI's Field wires the control (its id, label, description and
				// validity); the render function hands over its props and state so the
				// box around the value draws that state. A disabled box carries
				// `aria-disabled` itself, so the name and size outside the native
				// control read as disabled to a checker.
				render={(control, state) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: the box only takes a drop; the file input inside it is the control the keyboard reaches
					<div
						aria-disabled={state.disabled || undefined}
						onDragOver={(event) => {
							event.preventDefault();
							if (!state.disabled) setOver(true);
						}}
						onDragLeave={leave}
						onDrop={(event) => drop(event, state.disabled)}
						className={cn(
							field({
								trailing: value ? "act" : "none",
								state: state.valid === false || refused ? "error" : "rest",
							}),
							FIELD_GLYPH,
							BOX,
							BOX_FOCUS,
							ANCHOR,
							over && OVER,
							state.disabled
								? BOX_DISABLED
								: state.valid !== false && !refused && BOX_HOVER_VALUE,
						)}
					>
						<input
							{...control}
							aria-invalid={refused ? true : control["aria-invalid"]}
							aria-describedby={
								refused
									? [control["aria-describedby"], line]
											.filter(Boolean)
											.join(" ")
									: control["aria-describedby"]
							}
							className={PICK}
						/>
						<Icon name={value ? "File" : "FileUp"} fit="control" />
						<span
							className={cn(
								fieldValue({ kind: "text" }),
								!value && FIELD_PLACEHOLDER,
								value ? NAME : VALUE,
								state.disabled && DISABLED,
							)}
						>
							{value ? <Name name={value.name} /> : words.chooseFile}
						</span>
						{value ? (
							<>
								<span
									className={cn(
										text({ role: "meta" }),
										FIGURES,
										SIZE,
										state.disabled && DISABLED,
									)}
								>
									{fileSize(value.size)}
								</span>
								<span className={ABOVE}>
									<FieldDisabled value={state.disabled}>
										<Button
											glyph
											icon="X"
											label={`${words.remove} ${value.name}`}
											onAct={() => {
												refuse(undefined);
												onChange(null);
											}}
											fit="field"
										/>
									</FieldDisabled>
								</span>
							</>
						) : null}
					</div>
				)}
			/>
			{refused ? (
				<p
					id={line}
					key={refused}
					role="alert"
					className={cn(FIELD_ERROR_LINE, LINE_IN)}
				>
					{refused}
				</p>
			) : null}
		</div>
	);
}
