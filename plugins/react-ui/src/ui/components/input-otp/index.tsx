import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import { OTP, OTP_DIGIT, otpBox, text } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";
import { Spinner } from "../spinner/index.tsx";

// The loading line stands one `pair` under the row.
const STACK = "flex flex-col gap-pair";
const ROW = "relative flex items-center";
// One real input lies over the boxes, invisible: a click anywhere focuses it,
// and the browser's code suggestion or a paste fills it at once. It goes
// first so the box it types into can ring on its focus.
const INPUT = "peer absolute inset-0 opacity-0";
const BOX = "flex items-center justify-center";
const BOX_FOCUS =
	"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring";
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
	/** Hears the code once its last digit lands. */
	onComplete?: (value: string) => void;
	/** The code is being checked: the boxes hold it at rest, the input is inert and the row busy, a spinner line under it. */
	loading?: boolean;
}

/** A row of digit boxes over one input; the box the next digit lands in rings on focus. */
export function InputOtp({
	length,
	value,
	onChange,
	onComplete,
	loading,
}: InputOtpProps) {
	const words = useWords();
	const active = Math.min(value.length, length - 1);
	return (
		<Control
			value={value}
			onValueChange={(raw) => {
				const next = raw.replace(/\D/g, "").slice(0, length);
				if (next === value) return;
				onChange(next);
				if (next.length === length) onComplete?.(next);
			}}
			inputMode="numeric"
			autoComplete="one-time-code"
			maxLength={length}
			// Inert while the code is checked, yet still read: out of the tab
			// order and unwritable, never `disabled` or `inert`, which would drop
			// its name and its digits from the accessibility tree.
			readOnly={loading}
			tabIndex={loading ? -1 : undefined}
			aria-disabled={loading || undefined}
			// Base UI's Field wires the input; the render function hands over its
			// props and state so the boxes draw the field's error.
			render={(control, state) => (
				<div className={STACK}>
					<div aria-busy={loading || undefined} className={cn(OTP, ROW)}>
						<input {...control} className={INPUT} />
						{Array.from({ length }, (_, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: a box is its position
								key={index}
								aria-hidden
								className={cn(
									otpBox({ state: state.valid === false ? "error" : "rest" }),
									BOX,
									index === active && !loading && BOX_FOCUS,
								)}
							>
								<span className={cn(OTP_DIGIT, DIGIT)}>{value[index]}</span>
							</span>
						))}
					</div>
					{loading ? (
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
