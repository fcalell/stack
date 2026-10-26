import { registeredScope } from "@fcalell/plugin-api/scope";
import {
	ability,
	type Datum,
	drew,
	type Issue,
	isPlaceholder,
	isSelection,
	issues,
	refusal,
	type Selection,
	schemaOf,
	useMutation,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	InputOf,
	OutputOf,
	ProcedureCall,
} from "@fcalell/plugin-api/types";
import type { Option, PickedFile } from "@fcalell/ui-core/descriptors";
import {
	type Can,
	type Derived,
	derive,
	type FieldSpec,
	type FormFields,
	type FormGroupOf,
	type Held,
	isEmpty,
	type ProcedureSchema,
	readPicked,
	requiredReason,
	toHeld,
	toInput,
} from "@fcalell/ui-core/form";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useState } from "react";
import { type Act, placed } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { toast } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { FormField } from "../form-field/index.tsx";
import { Input } from "../input/index.tsx";
import { FormBody, type FormFrameProps } from "./base.tsx";

// A field's `options` may be a selection, which paints the pick until its read lands.
type Options = Selection<readonly Option<string>[]>;
type Fields<P extends ProcedureCall> = FormFields<InputOf<P>, Options>;
type Spec = FieldSpec<unknown, Options, Record<string, string>>;

/** The submit act's words and what follows it. `done` and `to` are the `Act`'s: the bar's act hands them to its host, which toasts and navigates once the procedure resolves. A form that commits by field draws no bar: it toasts `done` per field commit, and `label` and `to` have no place. */
export interface FormSubmit {
	/** The act's text (default "Save"). */
	label?: string;
	/** What the toast says once the procedure resolves (a sentence). */
	done?: string;
	/** The route the form goes to once the procedure resolves. */
	to?: string;
	/** The bar's filled act draws destructive (a form that rejects, abandons or closes something). */
	destructive?: boolean;
}

interface FormBase<P extends ProcedureCall> extends Closed {
	/** The procedure the form submits: its input schema gives every field its control, its optionality and its issue line, and its mutation is the submit. */
	act: P;
	/** The input keys the screen supplies (a scope id, a record id): sent with the input, never drawn. */
	given?: Partial<InputOf<P>>;
	/** The fields' first values (a form about a record). A selection paints the controls until its read lands and follows it until the viewer types; it is the form's `read` unless one is given. A submit that resolves puts the fields back to it. */
	values?: Datum<Partial<InputOf<P>>>;
	/** How the form commits. `submit` (the default): the bar's filled act sends every field at once. `field`: no bar; each field sends `given` and its own key when the viewer commits it (a text on leaving it or on Enter, a switch or a pick on its change, a file as it is picked) and draws its own refusal under it, so a settings page is a form that commits by field. The `submit`'s `done` is toasted per field commit and `onDone` hears each output; `label` and `to` have no place. Every required key the form does not show must be `given`, or the form throws. */
	commit?: "submit" | "field";
	/** The submit act's words and what follows it. */
	submit?: FormSubmit;
	/** Called with the output once the procedure resolves, and the input it was sent (once per field commit, when the form commits by field): the `given` keys and the fields' values as the procedure took them, a file as the string it was read into. */
	onDone?: (output: OutputOf<P>, input: InputOf<P>) => void;
	/** Other acts standing in the form's bar before the filled submit (a Cancel, a destructive Decline with `confirm`), drawn and run as any act of an `ActionBar`, through the same `useAct`. The last act of a bar is the filled one, so with `commit: "field"` (no submit) they stand in a bar of their own under the fields, the last of them filled. */
	acts?: readonly Act[];
	/** What the caller must be allowed to do to submit, as an ability's `[action, subject]` in the registered scope's organization. A caller who may not stands the fields disabled and the submit blocked with the reason (the word `denied`). The act paints the form, inert, until the ability's read lands. */
	can?: Can;
	/** What the form's fields hold, read once for the form's frame. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

/** A form is its procedure and its field labels: `fields` or `groups`, never both. */
export type FormProps<P extends ProcedureCall = ProcedureCall> = FormBase<P> &
	(
		| { fields: Fields<P>; groups?: never }
		| { fields?: never; groups: readonly FormGroupOf<InputOf<P>, Options>[] }
	);

// The path a procedure goes by: its mutation key's first part.
function pathOf(act: ProcedureCall): string {
	const [path] = act.mutationKey();
	if (!Array.isArray(path) || path.length === 0) {
		throw new Error("Form: `act` is not a procedure of the client");
	}
	return path.join(".");
}

type Draft = Readonly<Record<string, Held>>;
type Values = Readonly<Record<string, unknown>>;

// The options of a pick: the schema's values (or the consumer's), with the
// empty choice first on a field that may be left empty.
function optionsOf(
	derived: Derived,
	given: Datum<readonly Option<string>[]> | undefined,
	none: string,
): Datum<readonly Option<string | null>[]> {
	const listed: Datum<readonly Option<string>[]> =
		given ?? (derived.values ?? []).map((value) => ({ value, label: value }));
	if (derived.required || derived.control === "several") return listed;
	const empty: Option<string | null> = { value: null, label: none };
	return isSelection(listed)
		? listed.at((all) => (isPlaceholder(all) ? all : [empty, ...all]))
		: [empty, ...listed];
}

/** A form over a procedure: a card of the fields `fields` names, each drawn from the procedure's input schema (a string a line of text, an enum a pick, a boolean a switch, a number a numeric line, a list of an enum, or of strings with `options`, a pick of several, a date a date line, a string with the `file` hint a file pick whose file is read into the string, a list with the `lines` hint a line per item, an object with the `json` hint mono JSON source), required unless the schema makes it optional (an optional one says so under its label), with the server's refusal of its value under it, over a bar whose filled act submits the procedure. The act is pending while the procedure runs; once it resolves the fields go back to `values` and `onDone` hears the output; a rejection stands in the bar, and the issues the server's schema refused under their fields until the viewer changes them. A field with a `locked` reason stands inert with it under the control. With `commit: "field"` the form draws no bar and each field sends itself. `groups` partition the fields under bands. While the form stands edited, leaving its page asks once, "Discard your edit?". A form over no procedure (a filter, a local setting) is not a `Form`: a filter is a `Toolbar`, a setting a `Switch` in a row. A form in a sheet is that `Sheet`'s `form`, these same props. */
export function Form<P extends ProcedureCall>(props: FormProps<P>) {
	const { frame, outer } = useDerivedForm(props);
	return <FormBody {...frame} in="page" outer={outer} />;
}

/** What a derived form draws: the structure `FormBody` takes, and the reads its bar paints under besides the form's own (the ability its `can` asks). */
export interface DerivedFrame {
	frame: FormFrameProps;
	outer: readonly unknown[];
}

/** The derivation of a form over its procedure: its fields, its bar and its read, as the structure a `Form` or a `Sheet` draws. Without props (a sheet with no form) it holds nothing and returns nothing. A sheet passes its `open`: the viewer's edits are dropped as it opens again. Outside the package's exports. */
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P>,
	open?: boolean,
): DerivedFrame;
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P> | undefined,
	open?: boolean,
): DerivedFrame | undefined;
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P> | undefined,
	open?: boolean,
): DerivedFrame | undefined {
	const words = useWords();
	const mutation = useMutation(
		(props?.act.mutationOptions() ?? {}) as UseMutationOptions<
			OutputOf<P>,
			Error,
			InputOf<P>
		>,
	);
	const [draft, setDraft] = useState<Draft>({});
	const [refused, setRefused] = useState<readonly Issue[]>([]);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraft({});
			setRefused([]);
		}
	}
	// The caller's ability in the route's organization, a read the form paints
	// under until it lands; no organization answers no.
	const can = props?.can;
	const organizationId = registeredScope().organizationId;
	const mayHere = can
		? ability(organizationId).at((rules) =>
				rules.can(can[0], can[1]) ? (true as const) : words.denied,
			)
		: true;
	const [loaded, allowed] = useSelections([props?.values, mayHere] as const);
	if (!props) return undefined;

	const { act, given, values, submit, onDone, read, empty } = props;
	const byField = props.commit === "field";
	const path = pathOf(act);
	const entry = schemaOf(path) as ProcedureSchema | undefined;
	if (!entry) {
		throw new Error(`Form: no schema for ${path}; run \`stack generate\``);
	}
	if (entry.kind !== "mutation" || !entry.input) {
		throw new Error(`Form: ${path} is not a mutation over an object`);
	}
	const input = entry.input;
	const base: Values = loaded.painted ? {} : ((loaded.value as Values) ?? {});
	const denied =
		allowed.painted || allowed.value === true
			? undefined
			: String(allowed.value);

	const groups = props.groups ?? [{ title: undefined, fields: props.fields }];
	const specs = groups.flatMap((group) =>
		Object.entries(group.fields as Record<string, Spec>),
	);
	const given_ = (given ?? {}) as Values;
	// The keys a file field's name goes to are the form's, not the screen's.
	const named = new Set(
		specs.flatMap(([, spec]) => (spec.name ? [spec.name] : [])),
	);
	const shown = new Map<string, Derived>();
	for (const [key, spec] of specs) {
		try {
			if (spec.control === "file" && !spec.accept) {
				throw new Error("is a file field with no `accept`");
			}
			if (spec.name !== undefined) {
				if (spec.control !== "file") {
					throw new Error("names a file's name but is not a file field");
				}
				if (!input.properties?.[spec.name]) {
					throw new Error(
						`names "${spec.name}" for the file's name, which the input lacks`,
					);
				}
			}
			shown.set(
				key,
				derive(input, key, spec.control, spec.options !== undefined),
			);
		} catch (error) {
			throw new Error(
				`Form: ${path}.${key} ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	// The scope's key comes from the route's boundary, never from the form.
	for (const key of input.required ?? []) {
		if (
			key === entry.scope ||
			key in given_ ||
			named.has(key) ||
			shown.has(key)
		) {
			continue;
		}
		throw new Error(
			byField
				? `Form: ${path} commits by field, so it needs "${key}" given`
				: `Form: ${path} needs "${key}": make it a field or give it`,
		);
	}

	// A held pick or picks cut to the choices that stand; a value no longer among
	// them is cleared.
	const within = (
		value: Held | undefined,
		among: Datum<readonly Option<string>[]> | undefined,
	): Held | undefined => {
		if (value === undefined || value === null || isSelection(among) || !among) {
			return value;
		}
		const has = (one: string) => among.some((option) => option.value === one);
		if (typeof value === "string") return has(value) ? value : undefined;
		return Array.isArray(value) ? value.filter(has) : value;
	};
	// What a field holds: the viewer's, else the form's first value.
	const holds = (key: string): Held | undefined => {
		const derived = shown.get(key);
		if (!derived) return undefined;
		return key in draft ? draft[key] : toHeld(derived, base[key]);
	};
	const clear = (key: string) =>
		setRefused((all) => all.filter((issue) => issue.path[0] !== key));
	const change = (key: string, next: Held) => {
		setDraft((all) => ({ ...all, [key]: next }));
		clear(key);
	};

	// The input the fields make, or why they cannot make one yet.
	let blocked: string | undefined = denied;
	const sent: Record<string, unknown> = { ...given_ };
	// What a typed text says is wrong with it, by field.
	const wrong = new Map<string, string>();
	// The choices each field with options draws, a function of the fields before it.
	const choices = new Map<string, Datum<readonly Option<string>[]>>();
	const specOf = new Map(specs);
	for (const [key, derived] of shown) {
		const listed = specOf.get(key)?.options;
		const narrowed = typeof listed === "function";
		if (narrowed) {
			choices.set(key, listed(sent as Partial<Record<string, string>>));
		} else if (listed) {
			choices.set(key, listed as Datum<readonly Option<string>[]>);
		}
		let value = narrowed ? within(holds(key), choices.get(key)) : holds(key);
		if (
			value === undefined &&
			derived.control === "switch" &&
			derived.required
		) {
			value = false;
		}
		if (value === undefined || isEmpty(derived, value)) {
			if (derived.nullable) sent[key] = null;
			else if (derived.required) {
				blocked ??= requiredReason(
					words,
					specOf.get(key)?.label ?? key,
					derived.control === "pick" || derived.control === "file",
				);
			}
			continue;
		}
		const made = toInput(derived, value, words);
		if (made === "invalid") {
			blocked ??= words.typeValue;
			continue;
		}
		if ("issue" in made) {
			wrong.set(key, made.issue);
			blocked ??= made.issue;
			continue;
		}
		sent[key] = made.value;
	}

	// A picked file goes as the string it is read into.
	const wire = async (made: Record<string, unknown>): Promise<InputOf<P>> => {
		const out = { ...made };
		for (const [key, derived] of shown) {
			const file = out[key] as PickedFile | undefined;
			if (derived.control === "file" && file) {
				out[key] = await readPicked(file, derived.base64);
				const name = specOf.get(key)?.name;
				if (name) out[name] = file.name;
			}
		}
		return out as InputOf<P>;
	};

	// A form that commits by field sends `given` and the one field's key.
	const commitField = async (key: string, derived: Derived, next: Held) => {
		const made: Record<string, unknown> = { ...given_ };
		if (isEmpty(derived, next)) {
			// An optional pick's empty choice sends the key absent.
			if (derived.nullable) made[key] = null;
			else if (derived.control === "several" || derived.control === "lines")
				made[key] = [];
			else if (["text", "prose", "source", "code"].includes(derived.control))
				made[key] = "";
			else if (derived.control !== "pick" || derived.required) {
				throw new Error(words.typeValue);
			}
		} else {
			const one = toInput(derived, next, words);
			if (one === "invalid") throw new Error(words.typeValue);
			if ("issue" in one) {
				setRefused([{ path: [key], message: one.issue }]);
				return undefined;
			}
			made[key] = one.value;
		}
		const input = await wire(made);
		const output = await mutation.mutateAsync(input);
		if (!isSelection(values)) setDraft((all) => ({ ...all, [key]: next }));
		if (submit?.done) toast(submit.done);
		onDone?.(output, input);
		return output;
	};
	// A file's, a list's and json's commit is no draft's save, so its refusal stands under it here.
	const commitCaught = async (key: string, derived: Derived, next: Held) => {
		try {
			await commitField(key, derived, next);
		} catch (error) {
			drew(error);
			setRefused([{ path: [key], message: refusal(error) ?? words.actFailed }]);
		}
	};

	const onAct = async () => {
		try {
			const input = await wire(sent);
			const output = await mutation.mutateAsync(input);
			setDraft({});
			setRefused([]);
			onDone?.(output, input);
			return output;
		} catch (error) {
			const found = issues(error);
			if (found.length > 0) {
				setRefused(found);
				drew(error);
				// A value refusal stands under its field: where every issue names a
				// field the form shows, the bar draws none of them again.
				if (found.every((issue) => shown.has(String(issue.path[0]))))
					placed(error);
			}
			throw error;
		}
	};

	const drawn = (key: string, spec: Spec) => {
		const derived = shown.get(key);
		if (!derived) return null;
		const held = key in draft ? draft[key] : initial(key, derived);
		const value =
			typeof spec.options === "function"
				? within(held as Held | undefined, choices.get(key))
				: held;
		// A typed text's own issue stands once the viewer has typed it.
		const error =
			refused.find((issue) => issue.path[0] === key)?.message ??
			(key in draft ? wrong.get(key) : undefined);
		const file = derived.control === "file";
		const caught =
			file || derived.control === "lines" || derived.control === "json";
		// By field, a typed control keeps its own draft until it commits.
		const set = (next: Held) =>
			byField && !file ? (caught ? clear(key) : undefined) : change(key, next);
		const commit = byField
			? (next: Held) =>
					caught
						? commitCaught(key, derived, next)
						: commitField(key, derived, next)
			: undefined;
		return (
			<FormField
				key={key}
				label={spec.label}
				description={spec.locked ?? spec.description}
				error={error}
				optional={!derived.required}
				disabled={denied !== undefined || spec.locked !== undefined}
				{...(controlOf(
					derived,
					spec,
					value as Datum<Held | undefined>,
					choices.get(key),
					set,
					commit,
					words.none,
				) as object)}
			/>
		);
	};
	// A selection of the form's values hands each control its own slice, so it
	// paints until the read lands.
	const initial = (key: string, derived: Derived): Datum<Held | undefined> =>
		isSelection(values)
			? (values as Selection<Values | undefined>).at((all) =>
					isPlaceholder(all) ? (all as never) : toHeld(derived, all?.[key]),
				)
			: toHeld(derived, base[key]);

	const others = props.acts ?? [];
	const bar =
		byField && others.length === 0
			? undefined
			: {
					acts: byField
						? [...others]
						: [
								...others,
								{
									...submit,
									label: submit?.label ?? "Save",
									blocked,
									onAct,
								},
							],
				};
	const frame = read ?? (isSelection(values) ? values : undefined);
	const outer = [mayHere] as const;
	const commit = props.commit;
	return {
		outer,
		frame: props.groups
			? {
					bar,
					commit,
					read: frame,
					empty,
					groups: props.groups.map((group) => ({
						title: group.title,
						description: group.description,
						fields: Object.entries(group.fields as Record<string, Spec>).map(
							([key, spec]) => drawn(key, spec),
						),
					})),
				}
			: {
					bar,
					commit,
					read: frame,
					empty,
					children: Object.entries(props.fields as Record<string, Spec>).map(
						([key, spec]) => drawn(key, spec),
					),
				},
	};
}

// The descriptor of the control a field draws, which `FormField` draws in its
// value line. A form that commits by field hands each control `commit`: a
// typed control (a line, a text area) calls it on leaving the field, any other
// control on its change, and each returns the save's promise for the field to
// hold.
function controlOf(
	derived: Derived,
	spec: Spec,
	value: Datum<Held | undefined>,
	choices: Datum<readonly Option<string>[]> | undefined,
	set: (next: Held) => unknown,
	commit: ((next: Held) => unknown) | undefined,
	none: string,
) {
	const text = (value ?? "") as Datum<string>;
	const onText = (next: string) => set(next);
	const onCommit = commit && ((next: string) => commit(next));
	const done = commit ?? set;
	switch (derived.control) {
		case "switch":
			return {
				switch: {
					checked: (value ?? false) as Datum<boolean>,
					onChange: (next: boolean) => done(next),
				},
			};
		case "prose":
		case "source":
		case "lines":
		case "json":
			return {
				textArea: {
					value: text,
					onChange: onText,
					onCommit,
					source: derived.control === "source" || derived.control === "json",
				},
			};
		case "code":
			return {
				children: (
					<Input
						label={spec.label}
						kind="code"
						length={derived.length ?? 0}
						value={(value ?? "") as string}
						onChange={set}
						onComplete={onCommit}
					/>
				),
			};
		case "number":
			return {
				input: {
					kind: "number" as const,
					value: text,
					onChange: onText,
					onCommit,
				},
			};
		case "date":
			return {
				input: {
					kind: "date" as const,
					value: text,
					onChange: onText,
					onCommit,
				},
			};
		case "file":
			return {
				children: (
					<Input
						label={spec.label}
						kind="file"
						value={(value ?? null) as PickedFile | null}
						onChange={(file) => {
							set(file);
							commit?.(file);
						}}
						accept={spec.accept ?? []}
					/>
				),
			};
		case "several":
			return {
				picker: {
					options: optionsOf(derived, choices, none),
					value: value as Datum<readonly string[]>,
					onChange: (next: string[]) => done(next),
				},
			};
		case "pick":
			return {
				picker: {
					options: optionsOf(derived, choices, none),
					value: value as Datum<string | null>,
					onChange: (next: string | null) => done(next),
				},
			};
		default:
			return spec.options
				? {
						picker: {
							options: optionsOf(derived, choices, none),
							value: value as Datum<string | null>,
							onChange: (next: string | null) => done(next),
						},
					}
				: {
						input: { value: text, onChange: onText, onCommit },
					};
	}
}
