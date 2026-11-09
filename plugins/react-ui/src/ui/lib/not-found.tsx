import type { ReactNode } from "react";
import { use } from "react";
import { Button } from "../components/button/index.tsx";
import { Gate } from "../components/gate/index.tsx";
import { MissingBase } from "../components/missing/base.tsx";
import { Pane } from "../components/pane/index.tsx";
import { InPane, ShellHome } from "./frame.ts";
import { useWords } from "./words.tsx";

// The slice of the app's router the page for an unknown address needs, typed
// structurally so react-ui imports no router. The generated entry hands the
// app's router to `bindNotFound` right after creating it.
export interface NotFoundRouter {
	update(options: { defaultNotFoundComponent: () => ReactNode }): void;
}

// The page for an address nothing serves, drawn by the router wherever the miss
// lands. TanStack's fuzzy mode hands a miss to the deepest matched route that
// has children: an address under one of the app's routes (`/members/zzz`)
// stands in that route's layout, here a Shell, and any other miss stands at the
// root, outside it. Under a record's Pane (its tabs' outlet) the miss is the
// record's body; beside the place's Pane it stands where a record would.
function NotFound() {
	const words = useWords();
	const home = use(ShellHome);
	const inPane = use(InPane);
	if (home === undefined)
		return (
			<Gate title={words.notFound} description={[words.nowhere]}>
				<Button href="/" label={words.back} />
			</Gate>
		);
	const missing = <MissingBase sentence={words.nowhere} act={home} />;
	if (inPane) return missing;
	return (
		<Pane title={words.notFound} record={{}}>
			{missing}
		</Pane>
	);
}

// The router's default not-found page, set once the app's own routes are
// known: a route's own `notFoundComponent` (an app's catch-all) wins over it.
export function bindNotFound(router: NotFoundRouter): void {
	router.update({ defaultNotFoundComponent: NotFound });
}
