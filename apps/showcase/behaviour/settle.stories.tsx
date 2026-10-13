import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";

// The settle: the switch from a waiting form to the loaded one is the page's
// one authored moment. Every switch of a frame runs in one view transition,
// each Section moving from its old place to its new; under reduced motion it
// snaps. The top Section waits as four rows and loads as two, so the Section
// under it moves up; a copy of the page that never waits stands beside it as
// the place it must end at.
const ITEMS = ["Notes", "Deploys"];
const ROW = { key: (name: string) => name, title: (name: string) => name };

function Page(props: { ms?: number }) {
	const [pending, setPending] = useState(props.ms !== undefined);
	useEffect(() => {
		if (props.ms === undefined) return;
		const timer = setTimeout(() => setPending(false), props.ms);
		return () => clearTimeout(timer);
	}, [props.ms]);
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Top" loading={pending}>
				<Group
					list={{
						items: pending ? undefined : ITEMS,
						loading: pending,
						row: ROW,
					}}
				/>
			</Section>
			<Section title="Below">
				<Group list={{ items: ITEMS, row: ROW }} />
			</Section>
		</div>
	);
}

function Both(props: { ms: number }) {
	return (
		<div className="flex flex-col gap-sections">
			<div data-testid="moves">
				<Page ms={props.ms} />
			</div>
			<div data-testid="still">
				<Page />
			</div>
		</div>
	);
}

// How far the "Below" Section stands under its page's top.
function offset(box: HTMLElement): number {
	const below = box.querySelectorAll("section")[1] as HTMLElement;
	return below.getBoundingClientRect().top - box.getBoundingClientRect().top;
}

// The view transitions the document starts, and the names of the groups the
// browser animated while each ran.
function watchTransitions() {
	const seen = { started: 0, groups: new Set<string>() };
	const real = document.startViewTransition.bind(document);
	document.startViewTransition = (...args: Parameters<typeof real>) => {
		seen.started += 1;
		const moving = real(...args);
		moving.ready.then(
			() => {
				for (const one of document.getAnimations()) {
					const at = (one.effect as KeyframeEffect | null)?.pseudoElement;
					if (at?.startsWith("::view-transition-group(settle-"))
						seen.groups.add(at);
				}
			},
			() => {},
		);
		return moving;
	};
	return {
		seen,
		stop: () => {
			// Back to the prototype's own.
			delete (document as { startViewTransition?: unknown })
				.startViewTransition;
		},
	};
}

const REDUCED = "(prefers-reduced-motion: reduce)";

export default {
	title: "Behaviour/Settle",
} satisfies Meta;

// A read of 600 ms draws its waiting form, then its loaded form arrives in
// one view transition: the browser animates both Sections, and the lower one
// ends where the page that never waited holds it.
export const MovesInATransition: StoryObj = {
	render: () => <Both ms={600} />,
	play: async ({ canvas }) => {
		const watch = watchTransitions();
		try {
			const moves = canvas.getByTestId("moves");
			const still = canvas.getByTestId("still");
			// Waiting, the lower Section stands under four rows.
			await expect(offset(moves)).toBeGreaterThan(offset(still) + 20);
			await waitFor(() => expect(watch.seen.started).toBe(1), {
				timeout: 3000,
			});
			await waitFor(() => expect(watch.seen.groups.size).toBeGreaterThan(1));
			await waitFor(() =>
				expect(Math.abs(offset(moves) - offset(still))).toBeLessThan(1),
			);
		} finally {
			watch.stop();
		}
	},
};

// A read that settles inside the delay draws no waiting form, yet its switch
// goes through the same flip: one view transition, the page ending in place.
export const FastReadFlipsToo: StoryObj = {
	render: () => <Both ms={50} />,
	play: async ({ canvas }) => {
		const watch = watchTransitions();
		try {
			await waitFor(() => expect(watch.seen.started).toBe(1), {
				timeout: 3000,
			});
			await waitFor(() =>
				expect(
					Math.abs(
						offset(canvas.getByTestId("moves")) -
							offset(canvas.getByTestId("still")),
					),
				).toBeLessThan(1),
			);
		} finally {
			watch.stop();
		}
	},
};

// Under reduced motion no transition starts and the page snaps to its loaded
// place.
export const SnapsUnderReducedMotion: StoryObj = {
	render: () => <Both ms={600} />,
	play: async ({ canvas }) => {
		const watch = watchTransitions();
		const real = window.matchMedia;
		window.matchMedia = (query: string) => {
			const found = real.call(window, query);
			if (query !== REDUCED) return found;
			return {
				matches: true,
				media: query,
				addEventListener: found.addEventListener.bind(found),
				removeEventListener: found.removeEventListener.bind(found),
			} as MediaQueryList;
		};
		try {
			const moves = canvas.getByTestId("moves");
			const still = canvas.getByTestId("still");
			await waitFor(
				() => expect(Math.abs(offset(moves) - offset(still))).toBeLessThan(1),
				{ timeout: 3000 },
			);
			await expect(watch.seen.started).toBe(0);
		} finally {
			window.matchMedia = real;
			watch.stop();
		}
	},
};
