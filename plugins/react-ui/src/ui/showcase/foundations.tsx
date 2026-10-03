import { cn } from "@fcalell/ui-core/cn";
import { deriveTheme } from "@fcalell/ui-core/derive";
import {
	AVATAR_STEPS,
	CHIP_FAMILIES,
	COLOR_GROUPS,
	COLOR_NAMES,
	type ColorGroup,
	type ColorName,
	MODES,
	type Mode,
	RADIUS_ROLES,
	SHADOW_LEVELS,
	SIZES,
	SPACING_ROLES,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	WIDTHS,
} from "@fcalell/ui-core/tokens";
import {
	button,
	buttonLabel,
	field,
	switchThumb,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useView, type View, ViewBar } from "./view.tsx";

// Every class this page builds from a token's name (`bg-${name}`) is one
// react-ui's sheet generates for every token, so no source has to spell it.
const THEME = deriveTheme();

const SAMPLE: Record<TypeRole, string> = {
	display: "1,284,302",
	title: "Workspace settings",
	heading: "Members and invitations",
	body: "Invite teammates by email. They join as Members until an owner changes their role.",
	meta: "Used in links, invitations and the API base path.",
	caption: "v2.4.1",
	code: "npx wrangler d1 migrations apply acme-prod --remote",
};

// The roles drawn with their emphasis: a field label, a table header.
const STRONG: readonly TypeRole[] = ["body", "meta"];

const RUNNING =
	"The workspace owns every project, database and deployment you create here. Its name appears in invitations, in the browser tab and at the top of every email the product sends on your behalf. Renaming it is safe at any time. Changing its address is not: links already shared with clients, API keys scoped to the old address and webhooks pointed at it stop resolving until they are updated.";

// The grounds the contract measures its two text inks on.
const INK_GROUNDS: readonly ColorName[] = ["canvas", "surface", "group"];

// Each ink over the ground it is measured on: the text inks on the page's
// grounds, a fill's `on-` ink on it, a chip's ink on its soft, an avatar's
// initial on its fill.
const PAIRS: ReadonlyArray<readonly [ColorName, ColorName]> = [
	...[...new Set(Object.values(TYPE_SCALE).map((spec) => spec.ink))].flatMap(
		(ink) => INK_GROUNDS.map((ground) => [ink, ground] as const),
	),
	...COLOR_NAMES.flatMap((ground) => {
		const on = COLOR_NAMES.find((name) => name === `on-${ground}`);
		return on ? [[on, ground] as const] : [];
	}),
	...CHIP_FAMILIES.map(
		(family) => [`chip-${family}-ink`, `chip-${family}-soft`] as const,
	),
	...AVATAR_STEPS.map(
		(step) => [`avatar-${step}-ink`, `avatar-${step}`] as const,
	),
];

// A group's colors in rows: the chips and the avatars one row per family or
// step, every other group one row.
function colorRows(group: ColorGroup): ColorName[][] {
	const names: readonly ColorName[] = COLOR_GROUPS[group];
	const by = (prefix: string) =>
		names.filter((name) => name === prefix || name.startsWith(`${prefix}-`));
	if (group === "chips") return CHIP_FAMILIES.map((f) => by(`chip-${f}`));
	if (group === "avatars") return AVATAR_STEPS.map((s) => by(`avatar-${s}`));
	return [[...names]];
}

// The act fills, each the one with an `on-` ink, and every state of it.
const ACT_FILLS = COLOR_GROUPS.acts.filter((name) =>
	COLOR_NAMES.includes(`on-${name}` as ColorName),
);
const WASHES = COLOR_GROUPS.washes.filter((name) => name.startsWith("wash-"));
const SWITCH_TRACKS = COLOR_GROUPS.switch.filter(
	(name) => name !== "switch-thumb",
);

// A field's static states. FIELD carries rest and error; hover and disabled
// are drawn by their overlay classes.
const FIELD_STATES: ReadonlyArray<readonly [string, string]> = [
	["rest", field()],
	["hover", cn(field(), "border-edge-hover")],
	["error", field({ state: "error" })],
	["disabled", cn(field(), "bg-fill-disabled text-ink-disabled")],
];

// Every foundation of the contract on the real emitted sheet: type, colour,
// space, sizes, radii, widths, elevation and states, light and dark side by
// side, each column scoped to its own mode, at the URL's density.
export function Foundations() {
	const [view, change] = useView();
	return (
		<main className="flex flex-col gap-sections p-page min-h-screen">
			<header className="flex flex-row flex-wrap items-center gap-inside">
				<h1 className={text({ role: "title" })}>Foundations</h1>
				<ViewBar view={view} onChange={change} />
			</header>
			<Section title="Type">
				<Modes>
					<Type view={view} />
				</Modes>
			</Section>
			<Section title="Colour">
				<Modes>
					<Colour />
				</Modes>
			</Section>
			<Section title="Space, sizes and radii">
				<Modes>
					<Space view={view} />
				</Modes>
				<Panel>
					<Widths />
				</Panel>
			</Section>
			<Section title="Elevation and states">
				<Modes>
					<States />
				</Modes>
			</Section>
		</main>
	);
}

function Section(props: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-fields">
			<h2 className={text({ role: "heading" })}>{props.title}</h2>
			{props.children}
		</section>
	);
}

function Panel(props: { mode?: Mode; children: ReactNode }) {
	return (
		<div
			data-mode={props.mode}
			className={cn(
				props.mode,
				"flex flex-col gap-fields min-w-0 p-card rounded-card border border-edge bg-canvas",
			)}
		>
			{props.mode && <p className={text({ role: "meta" })}>{props.mode}</p>}
			{props.children}
		</div>
	);
}

// The same foundations twice, each panel scoped to its own mode.
function Modes(props: { children: ReactNode }) {
	return (
		<div className="grid grid-cols-2 gap-fields">
			{MODES.map((mode) => (
				<Panel key={mode} mode={mode}>
					{props.children}
				</Panel>
			))}
		</div>
	);
}

function Group(props: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-pair">
			<p className={cn(text({ role: "meta" }), textStrong({ role: "meta" }))}>
				{props.title}
			</p>
			{props.children}
		</div>
	);
}

function Label(props: { name: string; value?: string }) {
	return (
		<div className="flex flex-row justify-between gap-inside">
			<p className={text({ role: "caption" })}>{props.name}</p>
			{props.value && (
				<p className={text({ role: "caption" })}>{props.value}</p>
			)}
		</div>
	);
}

// ── Type ────────────────────────────────────────────────────────────

function Type(props: { view: View }) {
	const scale = THEME.type[props.view.density];
	const line = (role: TypeRole) =>
		`${scale[role].size} / ${scale[role].leading}`;
	return (
		<>
			{TYPE_ROLES.map((role) => (
				<div key={role} data-role={role} className="flex flex-col gap-rows">
					<Label name={role} value={line(role)} />
					<p className={text({ role })}>{SAMPLE[role]}</p>
				</div>
			))}
			{STRONG.map((role) => (
				<div
					key={role}
					data-role={`${role} strong`}
					className="flex flex-col gap-rows"
				>
					<Label name={`${role} strong`} value={line(role)} />
					<p className={cn(text({ role }), textStrong({ role }))}>
						{SAMPLE[role]}
					</p>
				</div>
			))}
			<div data-role="measure" className="flex flex-col gap-rows">
				<Label name="body at measure" value={THEME.widths.measure} />
				<p className={cn(text({ role: "body" }), "max-w-measure")}>{RUNNING}</p>
			</div>
		</>
	);
}

// ── Colour ──────────────────────────────────────────────────────────

function Colour() {
	return (
		<>
			{(Object.keys(COLOR_GROUPS) as ColorGroup[]).map((group) => (
				<Group key={group} title={group}>
					{colorRows(group).map((row) => (
						<div key={row.join()} className="grid grid-cols-4 gap-pair">
							{row.map((name) => (
								<Swatch key={name} name={name} />
							))}
						</div>
					))}
				</Group>
			))}
			<Group title="inks on their grounds">
				<div className="grid grid-cols-3 gap-pair">
					{PAIRS.map(([ink, ground]) => (
						<div
							key={`${ink}/${ground}`}
							data-pair={`${ink}/${ground}`}
							className={cn(
								"flex flex-col gap-rows p-card rounded-control border border-edge",
								`bg-${ground}`,
							)}
						>
							<p className={cn(text({ role: "body" }), `text-${ink}`)}>{ink}</p>
							<p className={cn(text({ role: "caption" }), `text-${ink}`)}>
								on {ground}
							</p>
						</div>
					))}
				</div>
			</Group>
		</>
	);
}

function Swatch(props: { name: ColorName }) {
	return (
		<div className="flex flex-col gap-rows min-w-0">
			<div
				data-swatch={props.name}
				className={cn(
					"h-row-2 w-full rounded-control border border-edge",
					`bg-${props.name}`,
				)}
			/>
			<p className={text({ role: "caption" })}>{props.name}</p>
		</div>
	);
}

// ── Space, sizes, radii, widths ─────────────────────────────────────

function Space(props: { view: View }) {
	const { density } = props.view;
	return (
		<>
			<Group title="spacing roles">
				{SPACING_ROLES.map((role) => (
					<div key={role} className="flex flex-col gap-rows">
						<Label name={role} value={THEME.spacing[density][role]} />
						<div
							data-spacing={role}
							className={cn("h-1 bg-edge-strong", `w-${role}`)}
						/>
					</div>
				))}
			</Group>
			<Group title="sizes">
				<div className="flex flex-row flex-wrap items-end gap-fields">
					{SIZES.map((size) => (
						<div key={size} className="flex flex-col items-start gap-rows">
							<div
								data-size={size}
								className={cn(
									"border border-edge-strong",
									`min-h-${size} min-w-${size}`,
								)}
							/>
							<Label name={size} value={THEME.sizes[density][size]} />
						</div>
					))}
				</div>
			</Group>
			<Group title="radii">
				<div className="flex flex-row flex-wrap gap-fields">
					{RADIUS_ROLES.map((role) => (
						<div key={role} className="flex flex-col items-start gap-rows">
							<div
								data-radius={role}
								className={cn(
									"size-row-2 bg-group border border-edge-strong",
									`rounded-${role}`,
								)}
							/>
							<Label name={role} value={THEME.radii[role]} />
						</div>
					))}
				</div>
			</Group>
		</>
	);
}

// A layer's width is wider than half the page, so the widths draw once, at
// the page's own mode.
function Widths() {
	return (
		<Group title="widths">
			{WIDTHS.map((width) => (
				<div key={width} className="flex flex-col gap-rows">
					<Label name={width} value={THEME.widths[width]} />
					<div
						data-width={width}
						className={cn("h-1 bg-edge-strong", `w-${width}`)}
					/>
				</div>
			))}
		</Group>
	);
}

// ── Elevation and states ────────────────────────────────────────────

function States() {
	return (
		<>
			<Group title="elevation over surface">
				<div className="flex flex-row flex-wrap gap-fields p-card rounded-card bg-surface border border-edge">
					{SHADOW_LEVELS.map((level) => (
						<div
							key={level}
							data-shadow={level}
							className={cn(
								"flex flex-col p-card rounded-card bg-raised border border-edge-raised",
								`shadow-${level}`,
							)}
						>
							<p className={text({ role: "body" })}>raised</p>
							<p className={text({ role: "caption" })}>shadow-{level}</p>
						</div>
					))}
				</div>
			</Group>
			<Group title="washes over surface">
				<div className="flex flex-col rounded-card bg-surface border border-edge">
					<div className="flex items-center min-h-row px-control-x">
						<p className={text({ role: "body" })}>surface</p>
					</div>
					{WASHES.map((wash) => (
						<div
							key={wash}
							data-wash={wash}
							className={cn(
								"flex items-center min-h-row px-control-x",
								`bg-${wash}`,
							)}
						>
							<p className={text({ role: "body" })}>{wash}</p>
						</div>
					))}
				</div>
			</Group>
			<Group title="acts">
				{ACT_FILLS.map((fill) => (
					<div key={fill} className="flex flex-row flex-wrap gap-pair">
						{[
							fill,
							...COLOR_GROUPS.acts.filter((name) =>
								name.startsWith(`${fill}-`),
							),
						].map((state) => (
							<div
								key={state}
								data-act={state}
								className={cn(
									"flex items-center justify-center",
									button(),
									`bg-${state}`,
								)}
							>
								<p className={cn(buttonLabel(), `text-on-${fill}`)}>
									{state === fill ? "rest" : state.slice(fill.length + 1)}
								</p>
							</div>
						))}
						<div
							data-act={`${fill}-disabled`}
							className={cn(
								"flex items-center justify-center",
								button(),
								"bg-fill-disabled",
							)}
						>
							<p className={cn(buttonLabel(), "text-ink-disabled")}>disabled</p>
						</div>
					</div>
				))}
			</Group>
			<Group title="field">
				<div className="grid grid-cols-2 gap-pair">
					{FIELD_STATES.map(([state, classes]) => (
						<div
							key={state}
							data-field={state}
							className={cn("flex items-center", classes)}
						>
							<p>{state}</p>
						</div>
					))}
				</div>
			</Group>
			<Group title="focus ring">
				<div className="flex flex-row gap-fields p-card">
					<div
						data-focus="act"
						className={cn(
							"flex items-center justify-center",
							button(),
							"outline-2 outline-offset-2 outline-ring",
						)}
					>
						<p className={buttonLabel()}>focus</p>
					</div>
					<div
						data-focus="field"
						className={cn(
							"flex flex-1 items-center",
							field(),
							"outline-2 outline-offset-2 outline-ring",
						)}
					>
						<p>focus</p>
					</div>
				</div>
			</Group>
			<Group title="switch">
				<div className="flex flex-row flex-wrap gap-fields">
					{SWITCH_TRACKS.map((track) => (
						<div key={track} className="flex flex-col items-start gap-rows">
							<div
								data-switch={track}
								className={cn(
									"flex items-center w-switch-w h-switch-h p-switch-inset rounded-full",
									track.startsWith("toggle-on")
										? "justify-end"
										: "justify-start",
									`bg-${track}`,
								)}
							>
								<div className={switchThumb()} />
							</div>
							<p className={text({ role: "caption" })}>{track}</p>
						</div>
					))}
				</div>
			</Group>
		</>
	);
}
