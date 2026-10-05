import { Code } from "../../components/code/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const ENV = `DATABASE_URL=postgres://app@db.internal:5432/app
STACK_ACCOUNT_ID=7f3k9q2m4x
STACK_API_TOKEN=sk_live_51NcQ2rTb8w`;
const CODES = `7k2m-9xq4
4tpw-h8nz
c3vd-2rfj
9bqe-m6yk
x5ha-t7cs
r2wn-4djp`;
const INSTALL = "pnpm add @fcalell/stack\npnpm stack init";
const CURL = `curl -X POST https://api.stack.dev/v1/projects/7f3k9q2m4x/deploys -H "Authorization: Bearer $STACK_API_TOKEN" -d '{"branch":"main"}'`;
// Board 50's build log: 18 lines, the last 4 shown.
const BUILD_LOG = `[12:04:20] pnpm install --frozen-lockfile
[12:04:24] Lockfile is up to date, resolution step is skipped
[12:04:26] Packages: +412
[12:04:27] Done in 6.8s
[12:04:27] stack generate
[12:04:28] wrote .stack/app.css
[12:04:28] wrote .stack/worker.ts
[12:04:28] wrote .stack/wrangler.jsonc
[12:04:29] tsc --noEmit
[12:04:30] 0 errors
[12:04:30] vite build
[12:04:31] loading stack.config.ts
[12:04:31] resolving 10 plugins
[12:04:31] 3 environment variables bound
[12:04:31] vite v6.2.0 building for production
[12:04:33] 214 modules transformed
[12:04:34] dist/index.html  0.46 kB
[12:04:34] built in 3.18s`;

// Board 50's head forms: title and copy, title alone, neither, copy without
// a title, a long line; the recovery codes with copy and download, titled and
// without a title.
function Heads() {
	return (
		<>
			<Code text={ENV} title=".env" copy />
			<Code text={INSTALL} title="Terminal" />
			<Code text={INSTALL} />
			<Code text={INSTALL} copy />
			<Code text={CURL} title="Terminal" copy />
			<Code
				text={CODES}
				title="Recovery codes"
				copy
				download="recovery-codes.txt"
			/>
			<Code text={CODES} copy download="recovery-codes.txt" />
		</>
	);
}

function Tail(props: { copy?: boolean }) {
	return <Code text={BUILD_LOG} title="Build log" tail={4} copy={props.copy} />;
}

// The pointer frames draw the fold alone among the acts, so only it takes
// the forced state; the focus frames draw the part their cell names (the
// fold, the copy act, else the text) beside the text, which a forced focus
// rings too.
export function drawCode(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (frame.state === "loading")
		return (
			<Wide>
				<Code text="" title=".env" loading />
				<Code text="" loading />
			</Wide>
		);
	if (frame.state === "hover" || frame.state === "active")
		return (
			<Wide>
				<Tail />
			</Wide>
		);
	if (frame.state === "focus") {
		if (cell === "ICON.fit.meta")
			return (
				<Wide>
					<Tail />
				</Wide>
			);
		if (cell === "ICON_BUTTON.fit.body" || cell === "ICON.fit.control")
			return (
				<Wide>
					<Code text={INSTALL} copy download="install.txt" />
				</Wide>
			);
		return (
			<Wide>
				<Code text={CURL} title="Terminal" />
			</Wide>
		);
	}
	if (cell === "ICON.fit.meta")
		return (
			<Wide>
				<Tail copy />
			</Wide>
		);
	return (
		<Wide>
			<Heads />
		</Wide>
	);
}
