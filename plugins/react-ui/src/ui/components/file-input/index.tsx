import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
import { accepts } from "@fcalell/ui-core/file";
import { formatterFor } from "@fcalell/ui-core/format";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	text,
} from "@fcalell/ui-core/variants";
import { type ChangeEvent, type DragEvent, use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled, FieldRefusal } from "../../lib/field.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import {
	BOX,
	BOX_DISABLED,
	BOX_FOCUS,
	BOX_HOVER_VALUE,
} from "../input/index.tsx";

// The native file input lies over the whole box, unseen: a press anywhere
// opens the system dialog and the keyboard reaches it, so the box rings on its
// focus as an `Input`'s does. The remove act stands above it.
const PICK = "absolute inset-0 opacity-0";
const ABOVE = "relative flex";
const VALUE = "min-w-0 grow truncate";
const SIZE = "shrink-0";
const DISABLED = "text-ink-disabled";
// A file over the box draws the focus ring, the box being where it lands.
const OVER = "outline-2 outline-offset-2 outline-ring";

const BYTES = {
	style: "unit",
	unit: "byte",
	notation: "compact",
	unitDisplay: "narrow",
} as const;

/** One file chosen or dropped, the control a `FormField` labels, describes and marks in error. */
export interface FileInputProps extends Closed {
	/** The chosen file; `null` while none is. */
	value: PickedFile | null;
	/** Hears the chosen file, or `null` once it is removed. A file `accept` does not name never reaches it. */
	onChange: (file: PickedFile | null) => void;
	/** The types it takes: MIME types or families (`text/csv`, `image/*`) and extensions (`.har`). */
	accept: readonly string[];
}

function pickedFrom(file: File): PickedFile {
	return {
		name: file.name,
		size: file.size,
		type: file.type,
		blob: () => Promise.resolve(file),
	};
}

/** A field box that is the act: empty it reads Choose file, chosen it shows the file's name and size with an act that removes it. A file dropped on the box is taken as one chosen; a file of another type is refused into its `FormField`'s error line, which clears on the next pick. */
export function FileInput({ value, onChange, accept }: FileInputProps) {
	const words = useWords();
	const refuse = use(FieldRefusal);
	const [over, setOver] = useState(false);
	const take = (file: File | undefined) => {
		if (!file) return;
		if (!accepts(file, accept)) {
			refuse?.(
				filled(words.wrongType, {
					name: file.name,
					types: accept.join(", "),
				}),
			);
			return;
		}
		refuse?.(undefined);
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
		<Control
			type="file"
			accept={accept.join(",")}
			onChange={pick}
			// Base UI's Field wires the control (its id, label, description and
			// validity); the render function hands over its props and state so the
			// box around the value draws that state.
			render={(control, state) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: the box only takes a drop; the file input inside it is the control the keyboard reaches
				<div
					onDragOver={(event) => {
						event.preventDefault();
						if (!state.disabled) setOver(true);
					}}
					onDragLeave={leave}
					onDrop={(event) => drop(event, state.disabled)}
					className={cn(
						field({
							trailing: value ? "act" : "none",
							state: state.valid === false ? "error" : "rest",
						}),
						FIELD_GLYPH,
						BOX,
						BOX_FOCUS,
						"relative",
						over && OVER,
						state.disabled
							? BOX_DISABLED
							: state.valid !== false && BOX_HOVER_VALUE,
					)}
				>
					<input {...control} className={PICK} />
					<Icon name="FileUp" fit="control" />
					<span
						className={cn(
							fieldValue({ kind: "text" }),
							!value && FIELD_PLACEHOLDER,
							VALUE,
							state.disabled && DISABLED,
						)}
					>
						{value ? value.name : words.chooseFile}
					</span>
					{value ? (
						<>
							<span
								className={cn(
									text({ role: "meta" }),
									SIZE,
									state.disabled && DISABLED,
								)}
							>
								{formatterFor("number", undefined, BYTES).format(value.size)}
							</span>
							<span className={ABOVE}>
								<FieldDisabled value={state.disabled}>
									<IconButton
										icon="X"
										label={words.remove}
										onAct={() => {
											refuse?.(undefined);
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
	);
}
