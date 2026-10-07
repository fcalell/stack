import { ORPCError } from "@orpc/client";

// Whether a failed call answered that the thing does not exist: stack's
// procedures throw `ApiError("NOT_FOUND")`, which the client decodes into an
// `ORPCError` of that code.
export function isNotFound(error: unknown): boolean {
	return error instanceof ORPCError && error.code === "NOT_FOUND";
}
