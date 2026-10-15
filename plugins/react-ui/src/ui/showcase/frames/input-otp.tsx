import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { InputOtp } from "../../components/input-otp/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { hang } from "./pending.tsx";

const change = () => {};

// A code one digit short that types its last digit once mounted, so the check
// it starts never settles and the frame holds the look a real code would.
function Checking(props: { children: ReactNode }) {
	const root = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const input = root.current?.querySelector("input");
		const set = Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set;
		if (!input || !set) return;
		set.call(input, "481902");
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}, []);
	return (
		<div ref={root} className="contents">
			{props.children}
		</div>
	);
}

function Typed() {
	const [code, setCode] = useState("48190");
	return (
		<InputOtp length={6} value={code} onChange={setCode} onComplete={hang} />
	);
}

// The frame's `error` reaches the control through Base UI's
// `Field`, as a `FormField` puts it; `OTP_BOX.state.error` is in error in
// every state.
export function drawInputOtp(frame: ShowcaseFrame) {
	const pending = frame.state === "pending";
	return (
		<Field.Root
			invalid={
				frame.state === "error" || frame.cell.name === "OTP_BOX.state.error"
			}
		>
			<Field.Label className={text({ role: "body" })}>Code</Field.Label>
			{pending ? (
				<Checking>
					<Typed />
				</Checking>
			) : (
				<InputOtp length={6} value="481" onChange={change} />
			)}
		</Field.Root>
	);
}
