import { X } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { cn } from "#lib/cn";

type EnumInputProps = {
	values: string[];
	onChange: (values: string[]) => void;
	disabled?: boolean;
	placeholder?: string;
};

function EnumInput(props: EnumInputProps) {
	let inputRef!: HTMLInputElement;
	const [inputValue, setInputValue] = createSignal("");

	const addValue = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) return;

		const isDuplicate = props.values.some(
			(v) => v.toLowerCase() === trimmed.toLowerCase(),
		);
		if (isDuplicate) return;

		props.onChange([...props.values, trimmed]);
		setInputValue("");
	};

	const removeValue = (index: number) => {
		props.onChange(props.values.filter((_, i) => i !== index));
		inputRef.focus();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addValue(inputValue());
		}

		if (e.key === "Backspace" && inputValue() === "") {
			e.preventDefault();
			if (props.values.length > 0) {
				removeValue(props.values.length - 1);
			}
		}
	};

	const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
		const value = e.currentTarget.value;

		if (value.includes(",")) {
			const parts = value.split(",");
			for (const part of parts.slice(0, -1)) {
				addValue(part);
			}
			setInputValue(parts.at(-1) ?? "");
			return;
		}

		setInputValue(value);
	};

	return (
		<div
			class={cn(
				"flex min-h-10 flex-wrap items-center gap-1 rounded-md border-2 border-input bg-muted px-3 py-2 font-mono text-sm transition-all focus-within:border-primary",
				props.disabled &&
					"pointer-events-none cursor-not-allowed opacity-[0.38]",
			)}
		>
			<For each={props.values}>
				{(value, index) => (
					<span class="flex items-center gap-1 rounded-sm bg-border px-2 py-0.5 font-mono text-xs text-foreground">
						{value}
						<button
							type="button"
							onClick={() => removeValue(index())}
							class="cursor-pointer text-foreground/70 transition-colors hover:text-foreground"
							aria-label={`Remove ${value}`}
						>
							<X class="size-3" />
						</button>
					</span>
				)}
			</For>
			<input
				ref={inputRef}
				type="text"
				value={inputValue()}
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				placeholder={
					props.values.length === 0
						? (props.placeholder ?? "Type and press Enter")
						: undefined
				}
				disabled={props.disabled}
				class="min-w-[80px] flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
			/>
		</div>
	);
}

export type { EnumInputProps };
export { EnumInput };
