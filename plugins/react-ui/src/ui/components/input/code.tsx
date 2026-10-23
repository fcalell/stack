import { Input as Control } from "@base-ui/react/input";
import { drew, isThenable, refusal } from "@fcalell/plugin-api/acts";
import { useRun } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	FIELD_ERROR_LINE,
	LINE_IN,
	OTP,
	OTP_DIGIT,
	otpBox,
	text,
} from "@fcalell/ui-core/variants";
import { useId, useState } from "react";
import { useModality } from "../../lib/modality.ts";
import { useWords } from "../../lib/words.tsx";
import { Spinner } from "../spinner/index.tsx";
import type { CodeInputProps } from "./index.tsx";

// The checking line stands one `pair` under the row.
const STACK = "flex flex-col gap-gap";
const ROW = "relative flex items-center";
// One real input lies over the boxes, invisible: a click anywhere focuses it,
// and the browser's code suggestion or a paste fills it at once. It goes
// first so the box it types into can ring on its focus.
const INPUT = "peer absolute inset-0 opacity-0";
const BOX = "flex items-center justify-center";
const BOX_FOCUS =
	"peer-focus-visible:not-in-data-[modality=pointer]:outline-2 peer-focus-visible:not-in-data-[modality=pointer]:outline-offset-(--focus-ring-edge-offset) peer-focus-visible:not-in-data-[modality=pointer]:outline-ring";
const DIGIT = "text-center";
const LINE = "flex items-center gap-gap";

/** The row of digit boxes over one input a `code` Input draws; the box the next digit lands in rings on focus. Outside the package's exports. */
export function CodeField({
	length,
	value,
	onChange,
	onComplete,
}: CodeInputProps) {
	useModality();
	const words = useWords();
	const run = useRun();
	// The check's refusal stands in the control's own line until the next digit.
	const [refused, refuse] = useState<string>();
	const line = useId();
	const checking = run.pending !== undefined;
	const active = Math.min(value.length, length - 1);
	// The attempt a Retry runs again: its promise, so the toast's act holds it.
	const attempt = (code: string): unknown => {
		const result = onComplete?.(code);
		if (!isThenable(result)) return result;
		return Promise.resolve(result).catch((error: unknown) => {
			drew(error);
			refuse(refusal(error) ?? words.actFailed);
		});
	};
	const complete = (code: string) => run.run(true, () => attempt(code));
	return (
		<Control
			value={value}
			onValueChange={(raw) => {
				const next = raw.replace(/\D/g, "").slice(0, length);
				if (next === value) return;
				refuse(undefined);
				onChange(next);
				if (next.length === length) complete(next);
			}}
			inputMode="numeric"
			autoComplete="one-time-code"
			maxLength={length}
			disabled={checking}
			// Base UI's Field wires the input; the render function hands over its
			// props and state so the boxes draw the field's error.
			render={(control, state) => (
				<div className={STACK}>
					<div className={cn(OTP, ROW)}>
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
							className={INPUT}
						/>
						{Array.from({ length }, (_, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: a box is its position
								key={index}
								aria-hidden
								className={cn(
									otpBox({
										state: state.valid === false || refused ? "error" : "rest",
									}),
									BOX,
									index === active && !checking && BOX_FOCUS,
								)}
							>
								<span className={cn(OTP_DIGIT, DIGIT)}>{value[index]}</span>
							</span>
						))}
					</div>
					{checking ? (
						<p
							role="status"
							className={cn(text({ role: "meta" }), LINE, LINE_IN)}
						>
							<Spinner />
							<span>{words.checking}</span>
						</p>
					) : null}
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
			)}
		/>
	);
}
