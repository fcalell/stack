import { useParams } from "@solidjs/router";
import type { Accessor } from "solid-js";

// The params a generated route builder takes, as the URL gives them back:
// every value a string. A builder without params reads none.
export type RouteParams<B> = B extends (
	params: infer P,
	...rest: never[]
) => string
	? unknown extends P
		? Record<never, never>
		: { [K in keyof P]: string }
	: never;

// The current route's params, typed by the builder of the page that reads
// them: `useRouteParams(routes.org.projects.project)().project`. Renaming the
// page file renames the builder, so every reader of a stale param fails to
// compile.
export function useRouteParams<B extends (...args: never[]) => string>(
	_builder: B,
): Accessor<RouteParams<B>> {
	const params = useParams();
	return () => params as RouteParams<B>;
}
