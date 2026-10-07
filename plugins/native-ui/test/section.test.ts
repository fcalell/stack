import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement, Fragment, type ReactNode } from "react";
import { type SectionKinds, sectionPartsOf } from "../src/ui/lib/section.ts";

// Stand-ins for the components the Section reads its body by.
const List = () => null;
const Table = () => null;
const Chart = () => null;
const Prose = () => null;
const Boundary = () => null;
const Group = () => null;
const Field = () => null;
const Own = (props: { children?: ReactNode }) => props.children;
const KINDS: SectionKinds = {
	lists: [List, Table],
	waits: [Chart],
	forms: [Prose],
	boundary: Boundary,
	group: Group,
	field: Field,
};

const el = (type: unknown, props: object = {}, ...children: ReactNode[]) =>
	// The stand-ins are components; `createElement` takes them as such.
	createElement(type as () => null, props, ...children);
const pending = { isPending: true, isError: false, data: undefined };
const answered = { isPending: false, isError: false, data: [1, 2] };

test("a Section reads the collections standing as its children, in a fragment, in a direct Group or as a direct QueryBoundary's props", () => {
	const parts = sectionPartsOf(
		[
			el(List, { query: answered }),
			el(Fragment, {}, el(Table, { items: [1] })),
			el(Group, {}, el(List, { items: [1, 2, 3] }), el(Field)),
			el(Chart, { loading: true }),
			el(Boundary, { query: [answered, pending], loading: el(Field) }),
			el(Field),
			el(Prose),
		],
		KINDS,
	);
	assert.equal(parts.lists.length, 3);
	assert.deepEqual(parts.lists[1], {
		query: undefined,
		items: [1],
		loading: undefined,
		definition: false,
	});
	assert.deepEqual(parts.waits, [true, true]);
	assert.equal(parts.groups, 1);
	// The direct field, the Group's field and the waiting boundary's loading form.
	assert.equal(parts.fields, 3);
	// The Prose is a part with its own waiting form.
	assert.equal(parts.forms, 1);
});

test("a list taking a definition map is flagged for ui-core, which counts it as no collection", () => {
	const parts = sectionPartsOf(
		el(Group, {}, el(List, { query: pending, definition: {} })),
		KINDS,
	);
	assert.deepEqual(parts, {
		lists: [
			{
				query: pending,
				items: undefined,
				loading: undefined,
				definition: true,
			},
		],
		waits: [],
		groups: 1,
		fields: 0,
		forms: 0,
	});
});

test("nothing deeper is read: an app's own component, a settled QueryBoundary's loading form, a Group in a Group", () => {
	const parts = sectionPartsOf(
		[
			el(Own, {}, el(List, { items: [1] })),
			el(Boundary, { query: answered, loading: el(List, { items: [] }) }),
			el(Group, {}, el(Group, {}, el(List, { items: [1] }))),
		],
		KINDS,
	);
	assert.deepEqual(parts, {
		lists: [],
		waits: [false],
		groups: 1,
		fields: 0,
		forms: 0,
	});
});

test("no registration, no layout effect in lib/section.ts", () => {
	const lib = readFileSync(
		new URL("../src/ui/lib/section.ts", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(
		lib,
		/useLayoutEffect|useEffect|useState|export function useSection/,
	);
	const components = new URL("../src/ui/components/", import.meta.url);
	for (const dir of readdirSync(components)) {
		for (const file of readdirSync(new URL(`${dir}/`, components))) {
			const code = readFileSync(new URL(`${dir}/${file}`, components), "utf8");
			assert.doesNotMatch(
				code,
				/useSection(Wait|Count|Rows|Field|Registry)/,
				`${dir}/${file}`,
			);
		}
	}
	const section = readFileSync(
		new URL("../src/ui/components/section/index.tsx", import.meta.url),
		"utf8",
	);
	assert.match(section, /sectionState\(sectionPartsOf\(children, KINDS\)/);
	assert.doesNotMatch(section, /loadingNow|setFields|useLayoutEffect/);
});
