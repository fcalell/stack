import { ApiError } from "@fcalell/plugin-api/error";

// better-auth's client does not throw a refusal: it resolves
// `{ data: null, error: { code, message, status, statusText } }`. That
// answer is a failed mutation like an oRPC refusal, so `useMutation` (and
// `useApiForm` through it) throws it as the `ApiError` its error path already
// phrases: the code and message as sent, and a server failure (5xx, or no
// code) as `INTERNAL_SERVER_ERROR`, which the caller's `errorMessage` covers.
// A refusal that names its fields (`fieldErrors`, as plugin-auth's reserved
// organization slug does) carries them as `data.fieldErrors`, where
// `useApiForm` reads an API procedure's. Any other resolved value is a
// success.
function isFieldErrors(value: unknown): value is Record<string, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		Object.values(value).every((entry) => typeof entry === "string")
	);
}

export function refusalOf(
	result: unknown,
): ApiError<string, unknown> | undefined {
	if (typeof result !== "object" || result === null) return undefined;
	if (!("data" in result) || !("error" in result)) return undefined;
	const error = (result as { error: unknown }).error;
	if (typeof error !== "object" || error === null) return undefined;
	const { code, message, status, fieldErrors } = error as {
		code?: unknown;
		message?: unknown;
		status?: unknown;
		fieldErrors?: unknown;
	};
	if (typeof status !== "number") return undefined;
	const failing = status >= 400 ? status : 500;
	return new ApiError(
		typeof code === "string" && code !== "" && failing < 500
			? code
			: "INTERNAL_SERVER_ERROR",
		{
			status: failing,
			message: typeof message === "string" ? message : undefined,
			...(isFieldErrors(fieldErrors) ? { data: { fieldErrors } } : {}),
		},
	);
}

// What a mutation's caller receives from its source's answer: better-auth's
// `{ data, error: null }` unwraps to its `data`, its refusal branch never
// arrives (it is thrown), and any other value is itself.
export type Answered<T> = T extends { data: infer D; error: null }
	? D
	: T extends { data: null; error: { status: number } }
		? never
		: T;

// The runtime half of `Answered`: a refusal thrown as `refusalOf` builds it,
// a better-auth success unwrapped to its `data`, anything else as it is.
export function answered<T>(result: T): Answered<T> {
	const refusal = refusalOf(result);
	if (refusal) throw refusal;
	if (
		typeof result === "object" &&
		result !== null &&
		"data" in result &&
		"error" in result &&
		result.error === null
	) {
		return result.data as Answered<T>;
	}
	return result as Answered<T>;
}
