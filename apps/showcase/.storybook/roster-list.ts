import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { showcasePages } from "@fcalell/plugin-react-ui/showcase/pages";

// Runs in a child process so each listing reads the roster fresh: Node caches
// an ES module for the life of a process, and the roster is edited while
// Storybook runs.
const components = new Map<
	string,
	{ layer: string; component: string; states: Set<string> }
>();
for (const frame of showcaseFrames()) {
	const entry = components.get(frame.component) ?? {
		layer: frame.layer,
		component: frame.component,
		states: new Set<string>(),
	};
	entry.states.add(frame.state);
	components.set(frame.component, entry);
}
console.log(
	JSON.stringify({
		components: [...components.values()].map((entry) => ({
			...entry,
			states: [...entry.states],
		})),
		pages: showcasePages(),
	}),
);
