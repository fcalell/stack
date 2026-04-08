// biome-ignore lint/suspicious/noExplicitAny: internal helper to extract request headers from context
export function getHeaders(context: any): Headers | undefined {
	return context._headers ?? context.reqHeaders;
}
