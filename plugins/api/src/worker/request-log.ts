import type { MiddlewareHandler } from "hono";

// A query procedure travels as `GET <prefix>/…?data=<its input>`, so Hono's
// own `logger()`, which prints the path with its query string, would put every
// read's input (an email, an id, a search term) in the worker's logs. This one
// prints the method and the pathname only.

// "12ms" under a second, "1.2s" from there.
export function formatDuration(ms: number): string {
	return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// The request line: the url's pathname, never its search or hash.
export function pathnameOf(url: string): string {
	const end = url.search(/[?#]/);
	const head = end === -1 ? url : url.slice(0, end);
	const scheme = head.indexOf("://");
	if (scheme === -1) return head;
	const path = head.indexOf("/", scheme + 3);
	return path === -1 ? "/" : head.slice(path);
}

export function formatRequestLog(line: {
	method: string;
	url: string;
	status?: number;
	ms?: number;
}): string {
	const path = pathnameOf(line.url);
	if (line.status === undefined || line.ms === undefined) {
		return `<-- ${line.method} ${path}`;
	}
	return `--> ${line.method} ${path} ${line.status} ${formatDuration(line.ms)}`;
}

export function requestLogger(
	print: (line: string) => void = console.log,
): MiddlewareHandler {
	return async (c, next) => {
		const { method } = c.req;
		const url = c.req.url;
		print(formatRequestLog({ method, url }));
		const start = Date.now();
		await next();
		print(
			formatRequestLog({
				method,
				url,
				status: c.res.status,
				ms: Date.now() - start,
			}),
		);
	};
}
