import { cn } from "@fcalell/ui-core/cn";
import { GROUP, text } from "@fcalell/ui-core/variants";
import { type ShowcaseFrame, showcaseFrames } from "./cells.ts";
import { registry } from "./registry.ts";
import { useView, ViewBar } from "./view.tsx";

export { showcaseCells } from "./cells.ts";
export { registry } from "./registry.ts";

const FRAMES = showcaseFrames();

// Every roster component's frames: each cell in every state it has, light
// and dark side by side, each frame scoped to its own mode, at the URL's
// density. A frame draws its registered component, or its component's name
// and the cell's strings.
export function Showcase() {
	const [view, change] = useView();
	const frames = FRAMES.filter((frame) => frame.density === view.density);
	const components = [...new Set(frames.map((frame) => frame.component))];

	return (
		<main className="flex flex-col gap-sections p-page min-h-screen">
			<header className="flex flex-row flex-wrap items-center gap-inside">
				<h1 className={text({ role: "title" })}>Showcase</h1>
				<ViewBar
					view={view}
					onChange={change}
					to={{ path: "/foundations", label: "Foundations" }}
				/>
				<p className={text({ role: "meta" })}>{frames.length} frames</p>
			</header>
			{components.map((component) => (
				<Component
					key={component}
					name={component}
					frames={frames.filter((frame) => frame.component === component)}
				/>
			))}
		</main>
	);
}

function Component(props: { name: string; frames: ShowcaseFrame[] }) {
	const rows = [
		...new Set(
			props.frames.map((frame) => `${frame.cell.name}/${frame.state}`),
		),
	];
	return (
		<section className="flex flex-col gap-fields">
			<h2 className={text({ role: "heading" })}>{props.name}</h2>
			<div className="flex flex-row flex-wrap gap-inside">
				{rows.map((row) => (
					<div key={row} className="flex flex-row flex-wrap gap-pair">
						{props.frames
							.filter((frame) => `${frame.cell.name}/${frame.state}` === row)
							.map((frame) => (
								<Frame key={frame.id} frame={frame} />
							))}
					</div>
				))}
			</div>
		</section>
	);
}

function Frame(props: { frame: ShowcaseFrame }) {
	const { frame } = props;
	const Drawn = registry[frame.component];
	const strings = frame.cell.classes.join(" ");
	return (
		<div
			data-cell={frame.id}
			className={cn(frame.mode, GROUP, "flex flex-col gap-pair p-card")}
		>
			<p className={text({ role: "caption" })}>
				{frame.cell.name} · {frame.state} · {frame.mode}
			</p>
			{Drawn ? (
				<Drawn frame={frame} />
			) : (
				<>
					<p className={text({ role: "body" })}>{frame.component}</p>
					<p className={text({ role: "code" })}>{strings}</p>
				</>
			)}
		</div>
	);
}
