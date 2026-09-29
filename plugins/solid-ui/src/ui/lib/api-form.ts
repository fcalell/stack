import type { FieldBinding } from "@fcalell/ui-core/descriptors";
import {
	type AnyFormApi,
	createForm,
	type DeepKeys,
	type DeepValue,
	getBy,
	type StandardSchemaV1,
} from "@tanstack/solid-form";
import { getOwner, runWithOwner } from "solid-js";
import {
	type MutationOptions,
	type MutationSource,
	useMutation,
} from "#lib/query.ts";
import type { Answered } from "#lib/refusal.ts";
import { toast } from "#lib/toast.ts";

// Without `input` the form's values are the procedure's input, so `input`
// is required exactly when they are not.
type InputOption<TData, TVars> = [TData] extends [TVars]
	? { input?: (values: TData) => TVars }
	: { input: (values: TData) => TVars };

type UseApiFormOptions<TData, TVars, TOutput> = {
	// biome-ignore lint/suspicious/noExplicitAny: schema output may differ from input (transforms)
	schema: StandardSchemaV1<TData, any>;
	defaultValues: TData;
	// What `useMutation` takes: `() => q.x.mutationOptions()`, whose
	// key names the procedure so its declared writes invalidate every query
	// that read them, or `() => ({ mutationFn, writes? })` for a call outside
	// the API, naming the entities it writes.
	mutation: () => MutationSource<TVars, TOutput>;
	onSuccess?: (result: Answered<TOutput>) => void;
	successMessage?: string;
	errorMessage?: string;
} & InputOption<TData, TVars>;

// A field error is a string (a server's field error), a schema issue with a
// `message`, or a list of either; the line shows the first.
function messageOf(error: unknown): string | undefined {
	if (typeof error === "string") return error || undefined;
	if (Array.isArray(error)) {
		for (const entry of error) {
			const message = messageOf(entry);
			if (message) return message;
		}
		return undefined;
	}
	if (error && typeof error === "object" && "message" in error) {
		return typeof error.message === "string" ? error.message : undefined;
	}
	return undefined;
}

// The mutation a form submits through: the procedure's key, so its writes
// invalidate as `useMutation`'s do, and its call on the input `input` makes
// of the form's values. A resolved better-auth refusal fails the submit
// through `useMutation`, as any mutation's does.
function apiFormMutation<TData, TVars, TOutput>(
	options: UseApiFormOptions<TData, TVars, TOutput>,
): MutationOptions<TData, TOutput> {
	return {
		mutation: () => {
			const { mutationKey, mutationFn, writes } = options.mutation();
			return {
				mutationKey,
				writes,
				mutationFn: async (values, context) => {
					if (!mutationFn) throw new Error("The mutation has no mutationFn.");
					const input = options.input
						? options.input(values)
						: (values as unknown as TVars);
					return mutationFn(input, context);
				},
			};
		},
		errorMessage: options.errorMessage,
	};
}

// The TanStack form options `useApiForm` builds, apart so a test drives them
// through a plain `FormApi`. A refusal's field errors land on their fields
// as submit errors, which `changeField` clears.
function apiFormOptions<TData, TVars, TOutput>(
	options: UseApiFormOptions<TData, TVars, TOutput>,
	submit: (values: TData) => Promise<Answered<TOutput>>,
) {
	return {
		defaultValues: options.defaultValues,
		validators: {
			onSubmit: options.schema,
		},
		onSubmit: async ({
			value,
			formApi,
		}: {
			value: TData;
			formApi: AnyFormApi;
		}) => {
			try {
				const result = await submit(value);
				if (options.successMessage)
					toast(options.successMessage, { state: "done" });
				options.onSuccess?.(result);
			} catch (err) {
				const fieldErrors = (
					err as { data?: { fieldErrors?: Record<string, string> } }
				)?.data?.fieldErrors;
				if (fieldErrors) {
					for (const [field, message] of Object.entries(fieldErrors)) {
						formApi.setFieldMeta(field, (meta) => ({
							...meta,
							errorMap: { ...meta?.errorMap, onSubmit: message },
						}));
					}
				}
			}
		},
	};
}

// A change to a field clears its submit error, as a TanStack `FieldApi`
// clears its own on change: the bindings have no field instances, and a
// submit error left in place keeps the form invalid, so `handleSubmit`
// would return before sending anything.
function changeField(form: AnyFormApi, name: string, next: unknown): void {
	form.setFieldValue(name, next);
	if (form.getFieldMeta(name)?.errorMap?.onSubmit === undefined) return;
	form.setFieldMeta(name, (meta) => ({
		...meta,
		errorMap: { ...meta.errorMap, onSubmit: undefined },
		errorSourceMap: { ...meta.errorSourceMap, onSubmit: undefined },
	}));
}

export function useApiForm<TData, TOutput, TVars = TData>(
	options: UseApiFormOptions<TData, TVars, TOutput>,
) {
	const mut = useMutation(() => apiFormMutation(options));
	const form = createForm(() => apiFormOptions(options, mut.mutateAsync));

	// One binding per field name and mode, built once under the form's owner,
	// so a `FormField` that reads its `field` prop again gets the same binding
	// and the subscriptions live as long as the form. With `commit` the field
	// autosaves: each commit its control reports (leaving the field or Enter,
	// having changed it) submits the form through its mutation.
	const owner = getOwner();
	const bindings = new Map<string, FieldBinding<unknown>>();
	function bind<TName extends DeepKeys<TData>>(
		name: TName,
		mode?: { commit?: boolean },
	): FieldBinding<DeepValue<TData, TName>> {
		type Value = DeepValue<TData, TName>;
		const commit = mode?.commit === true;
		const key = `${commit ? "commit" : "submit"}:${name}`;
		const cached = bindings.get(key);
		if (cached) return cached as FieldBinding<Value>;
		const binding = runWithOwner(owner, () => {
			const value = form.useStore(
				(state) => getBy(state.values, name) as Value,
			);
			const errors = form.useStore(
				(state) => state.fieldMeta[name]?.errors as unknown,
			);
			return {
				get value() {
					return value();
				},
				onChange: (next: Value) => changeField(form, name, next),
				get error() {
					return messageOf(errors());
				},
				onCommit: commit ? () => void form.handleSubmit() : undefined,
			};
		}) as FieldBinding<Value>;
		bindings.set(key, binding as FieldBinding<unknown>);
		return binding;
	}

	return Object.assign(form, { bind });
}

export type { UseApiFormOptions };
export { apiFormMutation, apiFormOptions, changeField };
