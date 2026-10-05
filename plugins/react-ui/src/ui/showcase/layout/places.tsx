import type { StatusState } from "@fcalell/ui-core/tokens";
import { useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Button } from "../../components/button/index.tsx";
import { Columns } from "../../components/columns/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { InputOtp } from "../../components/input-otp/index.tsx";
import { Link } from "../../components/link/index.tsx";
import { List } from "../../components/list/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Screen } from "../../components/screen/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import { Text } from "../../components/text/index.tsx";
import { navigate } from "../../lib/navigate.ts";
import { toast } from "../../lib/toast.ts";
import { ago } from "../ago.ts";
import { act, settle, useFixture, useTo } from "./here.ts";

// ── Projects: a board, a column per stage ───────────────────────────

const STAGES = [
	{
		title: "Building",
		projects: [
			{ name: "acme-web", meta: "main · a41c9e2", age: ago(2) },
			{ name: "acme-api", meta: "main · 3f8b1d0", age: ago(6) },
		],
	},
	{
		title: "Preview",
		projects: [
			{ name: "acme-docs", meta: "preview/search", age: ago(60) },
			{ name: "acme-admin", meta: "preview/roles", age: ago(180) },
			{ name: "acme-mail", meta: "preview/mjml", age: ago(1440) },
		],
	},
	{
		title: "Production",
		projects: [
			{ name: "acme-cdn", meta: "main · e93a6c0", age: ago(1440) },
			{ name: "acme-status", meta: "main · 51aa7e3", age: ago(5760) },
		],
	},
];

type Project = (typeof STAGES)[number]["projects"][number];

// A stage's projects, from their own query, on the stage's card.
function Stage(props: { title: string; projects: readonly Project[] }) {
	const projects = useFixture(props.projects);
	return (
		<Section title={props.title}>
			<Group>
				<List
					query={projects}
					sentence="Projects did not load."
					empty={{ sentence: `No project is in ${props.title}.` }}
					row={{
						key: (project) => project.name,
						leading: { icon: () => "Folder" },
						title: (project) => project.name,
						meta: (project) => [project.meta],
						trailing: (project) => ({ age: project.age }),
						href: (project) => `#${project.name}`,
					}}
				/>
			</Group>
		</Section>
	);
}

export function Projects() {
	return (
		<Place title="Projects" act={{ label: "New project", onAct: act }}>
			<Columns>
				{STAGES.map((stage) => (
					<Stage
						key={stage.title}
						title={stage.title}
						projects={stage.projects}
					/>
				))}
			</Columns>
		</Place>
	);
}

// ── Logs: a page with nothing in it yet ─────────────────────────────

export function Logs() {
	return (
		<Place title="Logs">
			<EmptyState
				icon="Logs"
				title="No logs yet"
				sentence="Logs stream here once a deploy serves its first request."
				act={{ label: "Deploy", onAct: act }}
			/>
		</Place>
	);
}

// ── Domains: a list with nothing open ───────────────────────────────

const DOMAINS: Array<{ name: string; state: StatusState; meta: string }> = [
	{ name: "acme.dev", state: "done", meta: "Primary · certificate valid" },
	{ name: "www.acme.dev", state: "done", meta: "Redirects to acme.dev" },
	{ name: "shop.acme.dev", state: "waiting", meta: "Waiting for DNS" },
];

export function Domains() {
	const to = useTo();
	return (
		<Place title="Domains" act={{ label: "Add domain", onAct: act }} bleed>
			<Split
				list={
					<List
						items={DOMAINS}
						row={{
							key: (domain) => domain.name,
							leading: { status: (domain) => domain.state },
							title: (domain) => domain.name,
							meta: (domain) => [domain.meta],
							href: (domain) => `#${domain.name}`,
							more: (domain) => [
								...(domain.state === "waiting"
									? [
											{
												label: "Verify",
												icon: "ShieldCheck" as const,
												onAct: () =>
													navigate(to({ place: "domains", screen: "verify" })),
											},
										]
									: []),
								{
									label: "Copy name",
									icon: "Copy",
									onAct: () => toast("Name copied"),
								},
							],
						}}
					/>
				}
				empty={
					<EmptyState
						icon="Globe"
						title="No domain open"
						sentence="Pick a domain from the list to read its records."
					/>
				}
			/>
		</Place>
	);
}

// ── Verify domain: a Screen pushed over Domains ─────────────────────

// The form is about one domain, so it opens on that domain: one ListRow in a
// Group, its glyph, name and project, opening Domains to change it.

export function Verify() {
	const to = useTo();
	const [code, setCode] = useState("482913");
	return (
		<Screen title="Verify domain" back={to({ place: "domains" })}>
			<Form>
				<Group>
					<ListRow
						leading={{ icon: "Globe" }}
						title="shop.acme.dev"
						meta={["acme-web", "Production"]}
						href={to({ place: "domains" })}
					/>
				</Group>
				<Text>
					Enter the six-digit code from the TXT record we added to
					shop.acme.dev.
				</Text>
				<FormField label="Code">
					<InputOtp length={6} value={code} onChange={setCode} />
				</FormField>
				<Link href="#record" fit="standalone">
					Show the DNS record again
				</Link>
				<ActionBar
					acts={[
						{
							label: "Verify",
							onAct: async () => {
								await settle();
								toast("shop.acme.dev verified", { state: "done" });
							},
						},
					]}
				/>
			</Form>
		</Screen>
	);
}

// ── First run: outside the shell ────────────────────────────────────

export function Welcome() {
	return (
		<main className="flex flex-col items-center justify-center p-sections bg-canvas min-h-dvh">
			<EmptyState
				icon="Rocket"
				title="Deploy your first app"
				sentence="Connect a repository and Acme builds and deploys every push to main."
				act={{ label: "Connect a repository", onAct: act }}
			>
				<Button act="secondary" label="Start from a template" onAct={act} />
			</EmptyState>
		</main>
	);
}
