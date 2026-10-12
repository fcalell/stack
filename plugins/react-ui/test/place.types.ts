import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import type { PaneProps } from "../src/ui/components/pane/index.tsx";
import type { PlaceProps } from "../src/ui/components/place/index.tsx";

const act = () => {};
const create: IconAct = { icon: "Plus", label: "New", onAct: act };
const more: MenuItem[] = [{ label: "Export", onAct: act }];

// a Place holds its Panes and states only the distance it is read from
{
	const page: PlaceProps = { children: "the Panes" };
	const room: PlaceProps = { distance: "room", children: "the Panes" };
	const bare: PlaceProps = {};
	void [page, room, bare];
}

// a Place draws no bar: the old head props are gone
{
	// @ts-expect-error: the title is the first Pane's
	const titled: PlaceProps = { title: "Deploys" };
	// @ts-expect-error: a create act is one of a Pane's actions
	const acting: PlaceProps = { act: { label: "Deploy", onAct: act } };
	// @ts-expect-error: the field docks at a Pane's foot
	const footed: PlaceProps = { foot: "an ask field" };
	// @ts-expect-error: a way back is a Pane's `back`
	const upped: PlaceProps = { up: "/system" };
	// @ts-expect-error: a Place offers no bleed
	const bled: PlaceProps = { bleed: true };
	// @ts-expect-error: a context's picker is gone
	const context: PlaceProps = { context: { label: "Set", options: [] } };
	void [titled, acting, footed, upped, bled, context];
}

// a Place's distance is the room or nothing
{
	// @ts-expect-error: only the room is a distance
	const near: PlaceProps = { distance: "desk" };
	void near;
}

// a Pane takes a title, and the acts, field and forms that make it a page
{
	const bare: PaneProps = { title: "Deploys" };
	const page: PaneProps = {
		title: "Deploys",
		actions: [create],
		more,
		foot: "an ask field",
		children: "the sections",
	};
	const record: PaneProps = { title: "dpl_7Hp9aK", back: "/deploys" };
	const pushed: PaneProps = {
		title: "dpl_7Hp9aK",
		back: "/deploys",
		cover: true,
	};
	const canvas: PaneProps = { title: "Workflow", wide: true };
	void [bare, page, record, pushed, canvas];
}

// a Pane without a title is no Pane
{
	// @ts-expect-error: the title names the Pane and heads its bar
	const untitled: PaneProps = { actions: [create] };
	void untitled;
}

// a Pane's back is a route, its acts descriptors, its cover and wide flags
{
	// @ts-expect-error: back is a route, not a handler
	const handler: PaneProps = { title: "Deploys", back: act };
	// @ts-expect-error: an action is an icon act, not a bare label
	const label: PaneProps = { title: "Deploys", actions: ["New"] };
	// @ts-expect-error: cover is a flag
	const covering: PaneProps = { title: "Deploys", cover: "yes" };
	// @ts-expect-error: wide is a flag
	const widening: PaneProps = { title: "Deploys", wide: "yes" };
	void [handler, label, covering, widening];
}

// a Pane keeps no filled act, Details act or fill mark
{
	const acting: PaneProps = {
		title: "Deploys",
		// @ts-expect-error: a create act is one of the actions
		act: { label: "New", onAct: act },
	};
	// @ts-expect-error: the Details sheet is a deeper Pane
	const details: PaneProps = { title: "Deploys", details: "more" };
	// @ts-expect-error: the Pane's body holds a Thread by plain flex, no mark
	const fills: PaneProps = { title: "Chats", fills: true };
	void [acting, details, fills];
}

// a Pane draws its empty state and its docked sheet itself
{
	const empty: PaneProps = {
		title: "Projects",
		empty: {
			sentence: "A project holds the deploys of one app.",
			title: "None",
		},
	};
	const docked: PaneProps = {
		title: "Assistant",
		foot: "an ask field",
		sheet: {
			open: true,
			onClose: act,
			title: "Question",
			form: { bar: { acts: [{ label: "Send", onAct: act }] } },
		},
	};
	// @ts-expect-error: the empty state needs its sentence
	const wordless: PaneProps = { title: "Projects", empty: { title: "None" } };
	// @ts-expect-error: a sheet is a Sheet's props, open and titled
	const unopened: PaneProps = { title: "Assistant", sheet: { title: "x" } };
	void [empty, docked, wordless, unopened];
}
