import { Prose } from "../../components/prose/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

// Board 50's release notes: headed parts, a nested part, lists two deep, an
// ordered list with a strike, a quote with inline code, a fence, a rule and
// an emphasis.
const RELEASE_NOTES = `## Deploy previews

Every pull request now gets its own preview URL. The preview builds from the branch head and is torn down when the branch merges.

- Previews read the production database **read-only**; writes go to a branch database.
- Set \`PREVIEW_TTL\` to keep a preview past its merge:
  - \`0\` tears it down on merge, the default.
  - \`7d\` keeps it for a week.
- The pull request links to each preview’s [deploy log](#deploy-log).

### Limits

1. ~~Five~~ Ten previews per project at a time.
2. A preview sleeps after an hour without traffic and wakes on the next request.

## Breaking changes

> The \`--force\` flag is gone. A deploy that fails its checks now stops; rerun it with \`--skip-checks\` when you mean it.

Rename the flag in your CI before you upgrade:

\`\`\`
stack deploy --skip-checks
\`\`\`

---

*Released 2 October 2026.*`;

// Board 50's record description: paragraphs alone, an inline code and a link.
const SENTENCE = "Waits for the staging migration.";

const DESCRIPTION = `Moves the billing webhooks off the legacy queue. Each event is now acknowledged once its handler commits, so a retry never charges twice.

Rollout is behind \`billing.queue_v2\`; see [the runbook](#runbook) before turning it on for an enterprise workspace.`;

/** A one-line text, loaded and waiting as one line, in a Section each. */
export function Sentence(props: { loading?: boolean }) {
	return (
		<Section title="Why it waits" loading={props.loading}>
			<Prose markdown={SENTENCE} loading={props.loading ? 1 : undefined} />
		</Section>
	);
}

// The loading frames draw the description's Section waiting; the body and
// link cells draw the description, every other cell the release notes.
export function drawProse(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (frame.state === "loading")
		return (
			<Wide>
				<Section title="Description">
					<Prose markdown={DESCRIPTION} loading />
				</Section>
				<Sentence />
				<Sentence loading />
			</Wide>
		);
	if (cell === "TEXT.role.body" || cell === "LINK.fit.inline")
		return (
			<Wide>
				<Section title="Description">
					<Prose markdown={DESCRIPTION} />
				</Section>
			</Wide>
		);
	return (
		<Wide>
			<Prose markdown={RELEASE_NOTES} />
		</Wide>
	);
}
