import { createForm, type StandardSchemaV1 } from "@tanstack/solid-form";
import { toast } from "#components/toast";
import { useMutation } from "#lib/query";

interface UseApiFormOptions<TData, TOutput> {
	// biome-ignore lint/suspicious/noExplicitAny: schema output may differ from input (transforms)
	schema: StandardSchemaV1<TData, any>;
	defaultValues: TData;
	mutation: (input: TData) => Promise<TOutput>;
	onSuccess?: (result: TOutput) => void;
	successMessage?: string;
	errorMessage?: string;
}

export function useApiForm<TData, TOutput>(
	options: UseApiFormOptions<TData, TOutput>,
) {
	const mut = useMutation<TData, TOutput>(() => ({
		mutation: () => ({
			mutationFn: (input: TData) => options.mutation(input),
		}),
		errorMessage: options.errorMessage,
	}));

	return createForm(() => ({
		defaultValues: options.defaultValues,
		validators: {
			onSubmit: options.schema,
		},
		onSubmit: async ({ value, formApi }) => {
			try {
				const result = await mut.mutateAsync(value);
				if (options.successMessage) toast.success(options.successMessage);
				options.onSuccess?.(result);
			} catch (err) {
				const fieldErrors = (
					err as { data?: { fieldErrors?: Record<string, string> } }
				)?.data?.fieldErrors;
				if (fieldErrors) {
					for (const [field, message] of Object.entries(fieldErrors)) {
						// biome-ignore lint/suspicious/noExplicitAny: dynamic field key from server payload
						formApi.setFieldMeta(field as any, (meta) => ({
							...meta,
							errorMap: { ...meta.errorMap, onSubmit: message },
						}));
					}
				}
			}
		},
	}));
}
