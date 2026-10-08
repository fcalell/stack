import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};
const ACTIONS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: noop },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: noop },
];
const MORE = [{ label: "Copy deploy hook", onAct: noop }];
const SWITCHER = {
	label: "Workspaces",
	options: [
		{ value: "acme", label: "Acme", avatar: {} },
		{ value: "globex", label: "Globex", avatar: {} },
	],
	value: "acme",
	onChange: noop,
};

export default { title: "Behaviour/Place" } satisfies Meta;

function Page(props: { title: string }) {
	return (
		<Place title={props.title} actions={ACTIONS} more={MORE}>
			<p>The first section.</p>
		</Place>
	);
}

function viewport(
	width: number,
): Pick<StoryObj, "tags" | "globals" | "parameters"> {
	return {
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: `w${width}`, isRotated: false },
		},
		parameters: {
			layout: "fullscreen",
			viewport: {
				options: {
					[`w${width}`]: {
						name: `${width}`,
						styles: { width: `${width}px`, height: "700px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

const LONG = "A deploy title long enough to wrap before the acts";

// A touch Place with no shell switcher stands its acts on the title's row:
// 44 px targets at the row's end, the title at the page's gutter wrapping
// before them, the first section under a hairline that is no taller than the
// row. The same Place under a shell switcher keeps the bar over the title.
function story(width: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<div>
				<Page title={LONG} />
				<Page title="Deploys" />
				<Shell
					places={[{ route: "/x", label: "Deploys", icon: "Rocket" }]}
					switcher={SWITCHER}
				>
					<Page title="Deploys" />
				</Shell>
			</div>
		),
		play: async ({ canvasElement }) => {
			const [single, short, shelled] = [
				...canvasElement.querySelectorAll("header"),
			];
			if (!single || !short || !shelled)
				throw new Error("the heads are not drawn");
			const title = single.querySelector("h1");
			const filter = single.querySelector("[aria-label='Filter']");
			const more = single.querySelector("[aria-label='More']");
			const section = single.nextElementSibling?.querySelector("p");
			if (!title || !filter || !more || !section)
				throw new Error("the Place is not drawn");
			const head = single.getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const end = more.getBoundingClientRect();
			const first = filter.getBoundingClientRect();
			const lines = Math.round(
				text.height / Number.parseFloat(getComputedStyle(title).lineHeight),
			);
			console.log(
				`${width}: head ${head.height}, title ${text.height} (${lines} lines) from ${text.left} to ${text.right}, filter ${first.width}x${first.height} from ${first.left}, more ${end.width}x${end.height} ending ${end.right} of ${head.right}, section ${section.getBoundingClientRect().left}; one-line head ${short.getBoundingClientRect().height}; shelled head ${shelled.getBoundingClientRect().height}`,
			);
			await expect(short.getBoundingClientRect().height).toBeLessThan(
				shelled.getBoundingClientRect().height - 30,
			);
			await expect(text.left).toBeCloseTo(
				section.getBoundingClientRect().left,
				1,
			);
			await expect(text.right).toBeLessThanOrEqual(first.left);
			await expect(first.height).toBeGreaterThanOrEqual(44);
			await expect(first.width).toBeGreaterThanOrEqual(44);
			await expect(end.height).toBeGreaterThanOrEqual(44);
			await expect(end.top).toBeGreaterThanOrEqual(head.top);
			await expect(end.bottom).toBeLessThanOrEqual(head.bottom);
			await expect(lines).toBeGreaterThan(1);
		},
	};
}

export const ActsShareTheTitleRowAt320 = story(320);
export const ActsShareTheTitleRowAt390 = story(390);
