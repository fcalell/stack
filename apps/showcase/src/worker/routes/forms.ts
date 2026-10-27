import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

// The input a `Form` story derives every control from: a line of text, a
// mono line, a numeric line, a date, a switch, a pick of one, a pick of
// several and a prose area, each required or optional.
export const forms = {
	submit: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				title: z.string().min(1),
				why: z.string().optional(),
				kind: z.enum(["change", "measurement", "question"]),
				priority: z.enum(["low", "normal", "high"]).optional(),
				seats: z.number().int(),
				budget: z.number().optional(),
				due: z.date().optional(),
				urgent: z.boolean(),
				notify: z.boolean().optional(),
				channels: z.array(z.enum(["email", "slack", "sms"])).optional(),
				owner: z.string().optional(),
				directory: z.string().optional(),
			}),
		)
		.mutation(() => ({ id: "request-1" })),

	// One required line of text: a name, a note, a rule, the source of a page.
	rename: procedure({ writes: ["forms"] })
		.input(z.object({ workspaceId: z.string(), name: z.string().min(1) }))
		.mutation(() => ({ id: "workspace-1" })),

	// A settings page: every key but the workspace optional, so a form over it
	// commits by field, each field sending itself.
	save: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				name: z.string().min(1).optional(),
				about: z.string().optional(),
				region: z.enum(["eu", "us"]).optional(),
				notify: z.boolean().optional(),
				digest: z.enum(["day", "week", "month"]).optional(),
			}),
		)
		.mutation(() => ({ id: "settings-1" })),

	// A file read into the string a field sends: text for the rows, base64 for
	// the screenshot.
	attach: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				rows: z.string().optional(),
				screenshot: z.base64().optional(),
			}),
		)
		.mutation(() => ({ id: "attachment-1" })),

	// One required pick.
	region: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				region: z.enum(["eu", "us"]),
			}),
		)
		.mutation(() => ({ id: "workspace-1" })),

	// Sheet and form stories: twenty-four optional lines of text, a form taller
	// than any viewport.
	long: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				...Object.fromEntries(
					Array.from({ length: 24 }, (_, at) => [
						`field${at + 1}`,
						z.string().optional(),
					]),
				),
			}),
		)
		.mutation(() => ({ id: "workspace-1" })),

	// Picker stories: a required line of text and a required pick of choices
	// the schema does not enumerate (a read of records, so `options` draws it).
	place: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				name: z.string().min(1),
				region: z.string().min(1),
			}),
		)
		.mutation(() => ({ id: "place-1" })),

	// A list of strings the schema does not enumerate (a read of records): the
	// field's `options` make it a pick of several.
	assign: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				projects: z.array(z.string()),
			}),
		)
		.mutation(() => ({ id: "member-1" })),

	// A list drawn as a line per item: keywords (strings), examples (strings,
	// numbers, booleans, null) and a list of integers; and an object drawn as
	// json source.
	describe: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				keywords: z.array(z.string()).nullable().optional(),
				examples: z
					.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
					.optional(),
				ports: z.array(z.number().int()).optional(),
				settings: z.record(z.string(), z.json()).optional(),
			}),
		)
		.mutation(() => ({ id: "description-1" })),

	// A file and the key that receives its name.
	upload: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				file: z.string(),
				fileName: z.string(),
			}),
		)
		.mutation(() => ({ id: "upload-1" })),

	// Two picks, the second narrowed by the first: its choices are a function
	// of the draft.
	pair: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				type: z.string().min(1),
				event: z.string().min(1),
			}),
		)
		.mutation(() => ({ id: "pair-1" })),

	// An act's sheet over it: its output is typed, so `onDone` reads `made.id`.
	made: procedure({ writes: ["forms"] })
		.input(z.object({ workspaceId: z.string(), name: z.string().min(1) }))
		.mutation(({ input }) => ({ id: `made-${input.name}` })),
};
