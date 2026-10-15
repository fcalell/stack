import { Input as Control } from "@base-ui/react/input";
import { isThenable } from "@fcalell/plugin-api/acts";
import { useRun } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { OTP, OTP_DIGIT, otpBox, text } from "@fcalell/ui-core/variants";
import { use } from "react";
import { useFailed } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { FieldRefusal } from "../../lib/field.ts";
import { useModality } from "../../lib/modality.ts";
import { useWords } from "../../lib/words.tsx";
import { Spinner } from "../spinner/index.tsx";

// The checking line stands one `pair` under the row.
const STACK = "flex flex-col gap-pair";
const ROW = "relative flex items-center";
// One real input lies over the boxes, invisible: a click anywhere focuses it,
// and the browser's code suggestion or a paste fills it at once. It goes
// first so the box it types into can ring on its focus.
const INPUT = "peer absolute inset-0 opacity-0";
const BOX = "flex items-center justify-center";
const BOX_FOCUS =
	"peer-focus-visible:not-in-data-[modality=pointer]:outline-2 peer-focus-visible:not-in-data-[modality=pointer]:outline-offset-(--focus-ring-edge-offset) peer-focus-visible:not-in-data-[modality=pointer]:outline-ring";
const DIGIT = "text-center";
const LINE = "flex items-center gap-inside";

/** A one-time code, the control a `FormField` labels, describes and marks in error. */
export interface InputOtpProps extends Closed {
	/** How many digits the code has, one box each. */
	length: number;
	/** The digits typed so far. */
	value: string;
	/** Hears the digits on every change; anything but a digit is dropped. */
	onChange: (value: string) => void;
	/** Hears the code once its last digit lands. Return the check's promise and, while it pends, the boxes hold the code at rest, the input is disabled and a spinner line stands under it; a refusal goes to the field's error line, with its reason, and the next digit clears it. */
	onComplete?: (value: string) => unknown;
}

/** A row of digit boxes over one input; the box the next digit lands in rings on focus. */
export function InputOtp({
	length,
	value,
	onChange,
	onComplete,
}: InputOtpProps) {
	useModality();
	const words = useWords();
	const run = useRun();
	const failed = useFailed();
	const refuse = use(FieldRefusal);
	const checking = run.pending !== undefined;
	const active = Math.min(value.length, length - 1);
	const complete = (code: string) =>
		run.run(true, () => {
			const result = onComplete?.(code);
			if (!isThenable(result)) return result;
			return Promise.resolve(result).catch((error: unknown) =>
				failed(error, () => complete(code)),
			);
		});
	return (
		<Control
			value={value}
			onValueChange={(raw) => {
				const next = raw.replace(/\D/g, "").slice(0, length);
				if (next === value) return;
				refuse?.(undefined);
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
						<input {...control} className={INPUT} />
						{Array.from({ length }, (_, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: a box is its position
								key={index}
								aria-hidden
								className={cn(
									otpBox({ state: state.valid === false ? "error" : "rest" }),
									BOX,
									index === active && !checking && BOX_FOCUS,
								)}
							>
								<span className={cn(OTP_DIGIT, DIGIT)}>{value[index]}</span>
							</span>
						))}
					</div>
					{checking ? (
						<p role="status" className={cn(text({ role: "meta" }), LINE)}>
							<Spinner />
							<span>{words.checking}</span>
						</p>
					) : null}
				</div>
			)}
		/>
	);
}
