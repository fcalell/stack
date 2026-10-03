import { readFileSync } from "node:fs";

// The guide pages the UI plugins index for this package. Node-only: the name is
// read from the package's own package.json, one level above `src/` and `dist/`.
const { name } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string };

export const uiCoreGuide = [
	{
		page: "screen",
		trigger: "Building or redesigning a screen, page or route",
	},
	{
		page: "design-critique",
		trigger:
			"Judging a rendered screen or component before it is shown for sign-off",
	},
	{
		page: "rubric",
		trigger:
			"Looking up the design standard: the system constants, the floors, the bans",
	},
	{
		page: "judging",
		trigger:
			"Judging a render's type, hierarchy, structure, colour, motion or composition",
	},
	{
		page: "references",
		trigger: "Picking reference executions for a screen",
	},
	// One page per pattern, so a step loads only the pattern it builds.
	{
		page: "patterns/sidebar",
		trigger: "Composing or judging a sidebar or a scope switcher",
	},
	{
		page: "patterns/settings-form",
		trigger: "Composing or judging a settings form",
	},
	{
		page: "patterns/data-table",
		trigger: "Composing or judging a data table or an inline cell edit",
	},
	{
		page: "patterns/record-pane",
		trigger: "Composing or judging a record or its pane beside a list",
	},
	{
		page: "patterns/command-palette",
		trigger: "Composing or judging a command palette",
	},
	{
		page: "patterns/picker-and-menu",
		trigger: "Composing or judging a picker, a select or a menu",
	},
	{
		page: "patterns/sheet-and-confirm",
		trigger: "Composing or judging a sheet or a confirm",
	},
	{
		page: "patterns/toast-and-banner",
		trigger: "Composing or judging a toast or a banner",
	},
	{
		page: "patterns/empty-state",
		trigger: "Composing or judging an empty state",
	},
	{
		page: "patterns/onboarding",
		trigger: "Composing or judging an onboarding flow",
	},
	{
		page: "patterns/login-and-otp",
		trigger: "Composing or judging a sign-in or a one-time code step",
	},
	{
		page: "patterns/page-header",
		trigger: "Composing or judging a page header with its acts or tabs",
	},
	{
		page: "patterns/diff-and-code",
		trigger: "Composing or judging a diff or a code block",
	},
	{
		page: "patterns/activity-feed",
		trigger: "Composing or judging an activity feed or a timeline",
	},
	{
		page: "patterns/board-columns",
		trigger: "Composing or judging a board of columns",
	},
	{
		page: "patterns/node-canvas",
		trigger: "Composing or judging a node canvas",
	},
	{
		page: "patterns/chips-and-statuses",
		trigger: "Composing or judging chips or statuses",
	},
	{
		page: "patterns/filters-and-toolbars",
		trigger: "Composing or judging filters or a toolbar",
	},
	{
		page: "patterns/members",
		trigger: "Composing or judging members or invitations",
	},
	{
		page: "patterns/version-picker",
		trigger: "Composing or judging a version picker or a history",
	},
	{
		page: "patterns/keyboard-navigation",
		trigger: "Composing or judging keyboard navigation",
	},
	{ page: "patterns/dark-mode", trigger: "Composing or judging dark mode" },
	{
		page: "patterns/density",
		trigger: "Composing or judging a dense data view",
	},
	{
		page: "patterns/loading-and-pending",
		trigger: "Composing or judging a loading or pending state",
	},
].map((p) => ({ domain: "ui-core", package: name, ...p }));
