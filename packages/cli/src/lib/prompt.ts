import {
	cancel,
	confirm as clackConfirm,
	isCancel,
	multiselect,
	select,
	text,
} from "@clack/prompts";

function unwrap<T>(value: T | symbol): T {
	if (isCancel(value)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return value as T;
}

export async function ask(
	message: string,
	defaultValue?: string,
): Promise<string> {
	return unwrap(await text({ message, defaultValue }));
}

export async function confirm(message: string): Promise<boolean> {
	return unwrap(await clackConfirm({ message, initialValue: false }));
}

export async function choose<T extends string>(
	message: string,
	options: readonly [T, ...T[]],
): Promise<T> {
	const value = await select({
		message,
		// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
		options: options.map((v) => ({ value: v, label: v })) as any,
	});
	return unwrap(value) as T;
}

export interface MultiOption<T extends string> {
	label: string;
	value: T;
	default?: boolean;
}

export async function multi<T extends string>(
	message: string,
	options: readonly MultiOption<T>[],
): Promise<T[]> {
	const value = await multiselect({
		message,
		// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
		options: options.map((o) => ({ value: o.value, label: o.label })) as any,
		initialValues: options.filter((o) => o.default).map((o) => o.value),
	});
	return unwrap(value) as T[];
}
