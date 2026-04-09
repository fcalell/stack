import OtpField from "@corvu/otp-field";
import type { ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "#lib/cn";

const REGEXP_ONLY_DIGITS = "^\\d*$";

type InputOTPProps = Parameters<typeof OtpField>[0] & {
	class?: string;
};

function Root(props: InputOTPProps) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<OtpField
			class={cn("group flex items-center has-disabled:opacity-50", local.class)}
			{...rest}
		/>
	);
}

function OTPInput(props: ComponentProps<typeof OtpField.Input>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<OtpField.Input
			spellcheck={false}
			class={cn("disabled:cursor-not-allowed", local.class)}
			{...rest}
		/>
	);
}

function Group(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<div
			role="presentation"
			class={cn("flex items-center gap-2", local.class)}
			{...rest}
		>
			{local.children}
		</div>
	);
}

type SlotProps = ComponentProps<"div"> & {
	index: number;
};

function Slot(props: SlotProps) {
	const [local, rest] = splitProps(props, ["index", "class"]);
	const context = OtpField.useContext();

	const char = () => context.value()[local.index] ?? "";
	const isActive = () => context.activeSlots().includes(local.index);
	const showFakeCaret = () =>
		isActive() && context.isInserting() && char() === "";

	return (
		<div
			data-active={isActive() || undefined}
			aria-hidden="true"
			class={cn(
				"relative flex h-10 w-10 items-center justify-center rounded-md border-2 border-input bg-muted font-mono text-sm",
				"data-active:z-10 data-active:outline-2 data-active:outline-ring data-active:outline-offset-2",
				"group-aria-invalid:border-destructive",
				local.class,
			)}
			{...rest}
		>
			{char()}
			<Show when={showFakeCaret()}>
				<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div class="h-4 w-px animate-caret-blink bg-foreground" />
				</div>
			</Show>
		</div>
	);
}

function Separator(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class", "children"]);
	return (
		<div
			class={cn("flex items-center", local.class)}
			aria-hidden="true"
			{...rest}
		>
			{local.children ?? <span class="text-muted-foreground">-</span>}
		</div>
	);
}

export const InputOTP = Object.assign(Root, {
	Input: OTPInput,
	Group,
	Slot,
	Separator,
});

export { REGEXP_ONLY_DIGITS };
