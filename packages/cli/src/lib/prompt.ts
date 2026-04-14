import {
	checkbox,
	input,
	confirm as inquirerConfirm,
	select,
} from "@inquirer/prompts";

export function ask(message: string, defaultValue?: string): Promise<string> {
	return input({ message, default: defaultValue });
}

export function confirm(message: string): Promise<boolean> {
	return inquirerConfirm({ message, default: false });
}

export function choose<T extends string>(
	message: string,
	options: readonly [T, ...T[]],
): Promise<T> {
	return select({
		message,
		choices: options.map((value) => ({ value, name: value })),
	});
}

export interface MultiOption<T extends string> {
	label: string;
	value: T;
	default?: boolean;
}

export function multi<T extends string>(
	message: string,
	options: readonly MultiOption<T>[],
): Promise<T[]> {
	return checkbox({
		message,
		choices: options.map((o) => ({
			name: o.label,
			value: o.value,
			checked: o.default ?? false,
		})),
	});
}
