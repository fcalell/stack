import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { InputOtp } from "../../components/input-otp/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};

// The frame's `error` reaches the control through Base UI's
// `Field`, as a `FormField` puts it; `OTP_BOX.state.error` is in error in
// every state. A focus frame rings the box the next digit lands in.
export function drawInputOtp(frame: ShowcaseFrame) {
	const loading = frame.state === "loading";
	return (
		<Field.Root
			invalid={
				frame.state === "error" || frame.cell.name === "OTP_BOX.state.error"
			}
		>
			<Field.Label className={text({ role: "body" })}>Code</Field.Label>
			<InputOtp
				length={6}
				value={loading ? "481902" : "481"}
				onChange={change}
				loading={loading}
			/>
		</Field.Root>
	);
}
