import assert from "node:assert/strict";
import { test } from "node:test";
import { captureEntityHeaders } from "@fcalell/plugin-api/query-invalidation";
import { FormApi } from "@tanstack/solid-form";
import {
	type DataTag,
	MutationObserver,
	type MutationObserverOptions,
	type QueryKey,
} from "@tanstack/solid-query";
import { z } from "zod";
import {
	apiFormMutation,
	apiFormOptions,
	changeField,
	type UseApiFormOptions,
	type useApiForm,
} from "../src/ui/lib/api-form.ts";
import {
	createDefaultQueryClient,
	mutationObserverOptions,
} from "../src/ui/lib/query.ts";

type Project = { id: string; name: string; domain: string };
type ProjectUpdate = { projectId: string; name?: string; domain?: string };
type Details = { name: string; domain: string };

const schema = z.object({ name: z.string(), domain: z.string() });

// What oRPC's `.mutationOptions()` returns for `projects.update`.
declare const update: () => NoInfer<
	MutationObserverOptions<Project, Error, ProjectUpdate>
>;
declare const use: typeof useApiForm;

// Checked by the package's type-check and never run: a form whose values are
// not the procedure's input must say how they become it, and a call outside
// the API is a bare `mutationFn` typed by the form.
export function inferred() {
	use({
		schema,
		defaultValues: { name: "", domain: "" },
		mutation: update,
		input: (values) => ({ projectId: "p1", ...values }),
	});
	// @ts-expect-error the form's values lack the procedure's `projectId`
	use({ schema, defaultValues: { name: "", domain: "" }, mutation: update });
	use({
		schema,
		defaultValues: { name: "", domain: "" },
		mutation: () => ({ mutationFn: async ({ name }) => name.length }),
	});
	use({
		schema,
		defaultValues: { name: "", domain: "" },
		mutation: () => ({
			mutationFn: async ({ name }) => name.length,
			writes: ["organization"],
		}),
	});
	use({
		schema,
		defaultValues: { name: "", domain: "" },
		mutation: () => ({
			mutationFn: async ({ name }) => name.length,
			// @ts-expect-error writes are a list of entity names
			writes: "organization",
		}),
	});
}

// A form driven as `useApiForm` drives it: the TanStack options over a plain
// `FormApi`, submitting through a `MutationObserver` on the default client.
function drive(
	options: UseApiFormOptions<Details, ProjectUpdate, Project>,
	queryClient = createDefaultQueryClient(),
) {
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(apiFormMutation(options), queryClient),
	);
	const form = new FormApi(
		apiFormOptions(options, (values) => observer.mutate(values)),
	);
	form.mount();
	return form;
}

test("a submit invalidates what the procedure's writes touch", async () => {
	const queryClient = createDefaultQueryClient();
	captureEntityHeaders(
		"projects/get",
		new Headers({ "x-stack-reads": "project" }),
	);
	captureEntityHeaders(
		"projects/update",
		new Headers({ "x-stack-writes": "project" }),
	);
	const detail = [
		["projects", "get"],
		{ input: { projectId: "p1" } },
	] as unknown as DataTag<QueryKey, Project, Error>;
	queryClient.setQueryData(detail, { id: "p1", name: "Shop", domain: "a" });
	let sent: ProjectUpdate | undefined;
	const form = drive(
		{
			schema,
			defaultValues: { name: "Shop", domain: "a" },
			mutation: () => ({
				mutationKey: [["projects", "update"], {}],
				mutationFn: async (input: ProjectUpdate) => {
					sent = input;
					return { id: "p1", name: input.name ?? "", domain: "a" };
				},
			}),
			input: (values) => ({ projectId: "p1", ...values }),
		},
		queryClient,
	);
	changeField(form, "name", "Store");
	await form.handleSubmit();
	assert.deepEqual(sent, { projectId: "p1", name: "Store", domain: "a" });
	assert.equal(queryClient.getQueryState(detail)?.isInvalidated, true);
});

test("a submit outside the API invalidates the writes it names", async () => {
	const queryClient = createDefaultQueryClient();
	captureEntityHeaders(
		"organization/bySlug",
		new Headers({ "x-stack-reads": "organization" }),
	);
	const scope = [["organization", "bySlug"], { input: { slug: "acme" } }];
	queryClient.setQueryData(scope, { id: "o1", name: "Acme" });
	const form = drive(
		{
			schema,
			defaultValues: { name: "Acme", domain: "a" },
			mutation: () => ({
				mutationFn: async () => ({ id: "p1", name: "", domain: "a" }),
				writes: ["organization"],
			}),
			input: (values) => ({ projectId: "p1", ...values }),
		},
		queryClient,
	);
	changeField(form, "name", "Acme Labs");
	await form.handleSubmit();
	assert.equal(queryClient.getQueryState(scope)?.isInvalidated, true);
});

test("a field the server refused submits again once it changes", async () => {
	const sent: ProjectUpdate[] = [];
	const form = drive({
		schema,
		defaultValues: { name: "Shop", domain: "taken.com" },
		mutation: () => ({
			mutationFn: async (input: ProjectUpdate) => {
				sent.push(input);
				if (input.domain === "taken.com") {
					throw Object.assign(new Error("Taken"), {
						data: { fieldErrors: { domain: "That domain has a project." } },
					});
				}
				return { id: "p1", name: input.name ?? "", domain: input.domain ?? "" };
			},
		}),
		input: (values) => ({ projectId: "p1", ...values }),
	});
	await form.handleSubmit();
	assert.equal(sent.length, 1);
	assert.equal(
		form.getFieldMeta("domain")?.errorMap.onSubmit,
		"That domain has a project.",
	);
	changeField(form, "domain", "free.com");
	assert.equal(form.getFieldMeta("domain")?.errorMap.onSubmit, undefined);
	changeField(form, "name", "Store");
	await form.handleSubmit();
	assert.equal(sent.length, 2);
	assert.equal(sent[1]?.domain, "free.com");
});
