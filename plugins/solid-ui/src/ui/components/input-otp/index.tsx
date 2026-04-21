import OtpField from "@corvu/otp-field";
import { createMemo, For, Index, Show } from "solid-js";
import { cn } from "#lib/cn";

const REGEXP_ONLY_DIGITS = "^\\d*$";

// ─── Slot (internal) ───

function Slot(props: { index: number }) {
	const context = OtpField.useContext();

	const char = () => context.value()[props.index] ?? "";
	const isActive = () => context.activeSlots().includes(props.index);
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
			)}
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

// ─── Separator (internal) ───

function Separator() {
	return (
		<div class="flex items-center" aria-hidden="true">
			<span class="text-muted-foreground">-</span>
		</div>
	);
}

// ─── InputOTP (public) ───

type InputOTPProps = {
	maxLength: number;
	pattern?: string | null;
	value?: string;
	onValueChange?: (value: string) => void;
	onComplete?: (value: string) => void;
	disabled?: boolean;
	class?: string;
	id?: string;
	"aria-invalid"?: boolean;
};

function InputOTP(props: InputOTPProps) {
	const groups = createMemo(() => {
		const len = props.maxLength;
		const half = Math.ceil(len / 2);
		return [half, len - half];
	});

	return (
		<OtpField
			maxLength={props.maxLength}
			value={props.value}
			onValueChange={props.onValueChange}
			onComplete={props.onComplete}
			class={cn("group flex items-center has-disabled:opacity-50", props.class)}
			aria-invalid={props["aria-invalid"] || undefined}
		>
			{(() => {
				let offset = 0;
				return (
					<For each={groups()}>
						{(groupSize, gi) => {
							const start = offset;
							offset += groupSize;
							return (
								<>
									{gi() > 0 && <Separator />}
									<div role="presentation" class="flex items-center gap-2">
										<Index each={Array.from({ length: groupSize })}>
											{(_, i) => <Slot index={start + i} />}
										</Index>
									</div>
								</>
							);
						}}
					</For>
				);
			})()}
			<OtpField.Input
				id={props.id}
				pattern={props.pattern ?? REGEXP_ONLY_DIGITS}
				disabled={props.disabled}
				spellcheck={false}
				class="disabled:cursor-not-allowed"
			/>
		</OtpField>
	);
}

// ─── Exports ───

export type { InputOTPProps };
export { InputOTP, REGEXP_ONLY_DIGITS };
