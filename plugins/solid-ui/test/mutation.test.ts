import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@fcalell/plugin-api/error";
import { captureEntityHeaders } from "@fcalell/plugin-api/query-invalidation";
import {
	type DataTag,
	MutationObserver,
	type MutationObserverOptions,
	type QueryKey,
} from "@tanstack/solid-query";
import {
	createDefaultQueryClient,
	mutationObserverOptions,
	type useMutation,
} from "../src/ui/lib/query.ts";

type Same<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

type Project = { id: string; name: string };
type Member = { id: string; role: string };

// What a better-auth client call resolves.
type Answer<T> =
	| { data: T; error: null }
	| {
			data: null;
			error: {
				code?: string;
				message?: string;
				status: number;
				statusText: string;
			};
	  };
declare const updateRole: (vars: {
	memberId: string;
}) => Promise<Answer<Member>>;
type ProjectUpdate = { projectId: string; name?: string };

// What oRPC's `.mutationOptions()` and `.queryKey()` return for
// `projects.update` and `projects.get` / `projects.list`.
declare const update: () => NoInfer<
	MutationObserverOptions<Project, Error, ProjectUpdate>
>;
declare const detailKey: () => DataTag<QueryKey, Project, Error>;
declare const listKey: () => DataTag<QueryKey, Project[], Error>;
declare const use: typeof useMutation;

// Checked by the package's type-check and never run: the call names no type,
// and each update's `old` is its own query's data.
export function inferred() {
	const mutation = use(() => ({
		mutation: update,
		updates: [
			{
				queryKey: detailKey,
				updater: (old, vars) => {
					const record: Same<typeof old, Project> = true;
					const input: Same<typeof vars, ProjectUpdate> = true;
					return record && input
						? { ...old, name: vars.name ?? old.name }
						: old;
				},
			},
			{
				queryKey: listKey,
				onSuccessUpdater: (old, data) => {
					const list: Same<typeof old, Project[]> = true;
					return list
						? old.map((each) => (each.id === data.id ? data : each))
						: old;
				},
			},
		],
	}));
	const vars: Same<Parameters<typeof mutation.mutate>[0], ProjectUpdate> = true;
	const data: Same<NonNullable<typeof mutation.data>, Project> = true;
	use(() => ({
		mutation: update,
		// @ts-expect-error a single record's updater returns the record
		updates: [{ queryKey: detailKey, updater: () => [] }],
	}));
	// A call site that names both types still compiles.
	use<ProjectUpdate, Project>(() => ({
		mutation: update,
		updates: [
			{ queryKey: detailKey, updater: (old, vars) => ({ ...old, ...vars }) },
		],
	}));
	return vars && data;
}

// Checked by the package's type-check and never run: a better-auth call's
// mutation data, and its `onSuccess`'s, is the answer's `data`.
export function answeredData() {
	const mutation = use(() => ({
		mutation: () => ({ mutationFn: updateRole, writes: ["member"] }),
		onSuccess: (member) => {
			const unwrapped: Same<typeof member, Member> = true;
			return unwrapped;
		},
	}));
	const data: Same<NonNullable<typeof mutation.data>, Member> = true;
	return data;
}

test("an optimistic update applies at once and the writes still invalidate", async () => {
	const queryClient = createDefaultQueryClient();
	captureEntityHeaders(
		"projects/get",
		new Headers({ "x-stack-reads": "project" }),
	);
	captureEntityHeaders(
		"projects/update",
		new Headers({ "x-stack-writes": "project" }),
	);
	const key = [["projects", "get"], { input: { projectId: "p1" } }] as const;
	const tagged = key as unknown as DataTag<QueryKey, Project, Error>;
	queryClient.setQueryData(tagged, { id: "p1", name: "Shop" });
	let seen: Project | undefined;
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationKey: [["projects", "update"], {}],
					mutationFn: async (vars: ProjectUpdate) => {
						seen = queryClient.getQueryData(tagged);
						return { id: vars.projectId, name: vars.name ?? "" };
					},
				}),
				updates: [
					{
						queryKey: () => tagged,
						updater: (old: Project, vars: ProjectUpdate) => ({
							...old,
							name: vars.name ?? old.name,
						}),
					},
				],
			},
			queryClient,
		),
	);
	await observer.mutate({ projectId: "p1", name: "Store" });
	assert.equal(seen?.name, "Store");
	assert.equal(queryClient.getQueryState(tagged)?.isInvalidated, true);
});

test("an update that finds nothing cached leaves the cache alone", async () => {
	const queryClient = createDefaultQueryClient();
	const tagged = [
		["projects", "get"],
		{ input: { projectId: "p2" } },
	] as unknown as DataTag<QueryKey, Project, Error>;
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationFn: async (vars: ProjectUpdate) => ({
						id: vars.projectId,
						name: "",
					}),
				}),
				updates: [
					{
						queryKey: () => tagged,
						updater: (old: Project) => ({ ...old, name: "Store" }),
					},
				],
			},
			queryClient,
		),
	);
	await observer.mutate({ projectId: "p2" });
	assert.equal(queryClient.getQueryData(tagged), undefined);
});

test("a source outside the API invalidates the writes it names", async () => {
	const queryClient = createDefaultQueryClient();
	captureEntityHeaders(
		"organization/bySlug",
		new Headers({ "x-stack-reads": "organization" }),
	);
	captureEntityHeaders(
		"projects/list",
		new Headers({ "x-stack-reads": "project" }),
	);
	const organizationKey = [
		["organization", "bySlug"],
		{ input: { slug: "acme" } },
	] as const;
	const projectsKey = [["projects", "list"], {}] as const;
	queryClient.setQueryData(organizationKey, { id: "o1", name: "Acme" });
	queryClient.setQueryData(projectsKey, []);
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationFn: async (name: string) => ({ id: "o1", name }),
					writes: ["organization"],
				}),
			},
			queryClient,
		),
	);
	await observer.mutate("Acme Labs");
	assert.equal(queryClient.getQueryState(organizationKey)?.isInvalidated, true);
	assert.equal(queryClient.getQueryState(projectsKey)?.isInvalidated, false);
});

test("a better-auth refusal fails the mutation with its phrased ApiError", async () => {
	const queryClient = createDefaultQueryClient();
	let succeeded = false;
	let shown: string | undefined;
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationFn: async (): Promise<Answer<Member>> => ({
						data: null,
						error: {
							code: "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER",
							message: "You cannot leave the organization as the only owner",
							status: 400,
							statusText: "BAD_REQUEST",
						},
					}),
					writes: ["member"],
				}),
				onSuccess: () => {
					succeeded = true;
				},
				errorHandler: (message) => {
					shown = message;
				},
			},
			queryClient,
		),
	);
	await assert.rejects(observer.mutate(undefined), (error) => {
		assert.ok(error instanceof ApiError);
		assert.equal(
			error.code,
			"YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER",
		);
		return true;
	});
	assert.equal(succeeded, false);
	assert.equal(shown, "You cannot leave the organization as the only owner");
});

test("a better-auth success unwraps to its data for the caller", async () => {
	const queryClient = createDefaultQueryClient();
	let received: Member | undefined;
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationFn: async (): Promise<Answer<Member>> => ({
						data: { id: "m1", role: "editor" },
						error: null,
					}),
				}),
				onSuccess: (member) => {
					received = member;
				},
			},
			queryClient,
		),
	);
	const result = await observer.mutate(undefined);
	assert.deepEqual(result, { id: "m1", role: "editor" });
	assert.deepEqual(received, { id: "m1", role: "editor" });
});

test("a query outside the API that declares its reads refetches on those writes", async () => {
	const queryClient = createDefaultQueryClient();
	const membersKey = ["organization", "full", "acme"] as const;
	const settingsKey = ["organization", "settings", "acme"] as const;
	await queryClient.prefetchQuery({
		queryKey: membersKey,
		queryFn: async () => [{ id: "m1", role: "editor" }],
		meta: { reads: ["member", "invitation"] },
	});
	await queryClient.prefetchQuery({
		queryKey: settingsKey,
		queryFn: async () => ({ name: "Acme" }),
		meta: { reads: ["organization"] },
	});
	const observer = new MutationObserver(
		queryClient,
		mutationObserverOptions(
			{
				mutation: () => ({
					mutationFn: async (): Promise<Answer<Member>> => ({
						data: { id: "m1", role: "admin" },
						error: null,
					}),
					writes: ["member"],
				}),
			},
			queryClient,
		),
	);
	await observer.mutate(undefined);
	assert.equal(queryClient.getQueryState(membersKey)?.isInvalidated, true);
	assert.equal(queryClient.getQueryState(settingsKey)?.isInvalidated, false);
});
