import type { AnyFieldApi } from "@tanstack/solid-form";
import type { JSX } from "solid-js";
import { createUniqueId, Show } from "solid-js";
import { Checkbox } from "#components/checkbox";
import { EnumInput } from "#components/enum-input";
import { Field } from "#components/field";
import { Input } from "#components/input";
import { InputOTP, REGEXP_ONLY_DIGITS } from "#components/input-otp";
import { Select, type SelectOptions } from "#components/select";
import { Textarea } from "#components/textarea";

// ─── Helpers ───

function hasErrors(field: AnyFieldApi): boolean {
	return field.state.meta.errors.length > 0;
}

function firstError(field: AnyFieldApi): string | undefined {
	const err = field.state.meta.errors[0];
	if (!err) return undefined;
	if (typeof err === "string") return err;
	if (typeof err === "object" && "message" in err)
		return (err as { message?: string }).message;
	return String(err);
}

// ─── FormField ───

type FormFieldProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	class?: string;
	htmlFor?: string;
	children: JSX.Element;
};

function FormField(props: FormFieldProps) {
	return (
		<Field class={props.class}>
			<Field.Label for={props.htmlFor}>{props.label}</Field.Label>
			<Show when={props.description}>
				<Field.Description>{props.description}</Field.Description>
			</Show>
			<Field.Content>
				{props.children}
				<Show when={hasErrors(props.field())}>
					<Field.Error>{firstError(props.field())}</Field.Error>
				</Show>
			</Field.Content>
		</Field>
	);
}

// ─── FormInput ───

type FormInputProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	placeholder?: string;
	type?: string;
	disabled?: boolean;
	autofocus?: boolean;
	class?: string;
	onBlur?: () => void;
	onInput?: (value: string) => void;
};

function FormInput(props: FormInputProps) {
	const id = createUniqueId();
	return (
		<FormField
			field={props.field}
			label={props.label}
			description={props.description}
			htmlFor={id}
			class={props.class}
		>
			<Input
				id={id}
				name={props.field().name}
				value={props.field().state.value}
				onBlur={() => {
					props.field().handleBlur();
					props.onBlur?.();
				}}
				onInput={(e) => {
					const v = e.currentTarget.value;
					props.field().handleChange(v);
					props.onInput?.(v);
				}}
				placeholder={props.placeholder}
				type={props.type}
				disabled={props.disabled}
				autofocus={props.autofocus}
				aria-invalid={hasErrors(props.field()) ? true : undefined}
			/>
		</FormField>
	);
}

// ─── FormTextarea ───

type FormTextareaProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	placeholder?: string;
	disabled?: boolean;
	class?: string;
	onBlur?: () => void;
	onInput?: (value: string) => void;
};

function FormTextarea(props: FormTextareaProps) {
	const id = createUniqueId();
	return (
		<FormField
			field={props.field}
			label={props.label}
			description={props.description}
			htmlFor={id}
			class={props.class}
		>
			<Textarea
				id={id}
				name={props.field().name}
				value={props.field().state.value}
				onBlur={() => {
					props.field().handleBlur();
					props.onBlur?.();
				}}
				onInput={(e) => {
					const v = e.currentTarget.value;
					props.field().handleChange(v);
					props.onInput?.(v);
				}}
				placeholder={props.placeholder}
				disabled={props.disabled}
				aria-invalid={hasErrors(props.field()) ? true : undefined}
			/>
		</FormField>
	);
}

// ─── FormSelect ───

type FormSelectProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	options: SelectOptions;
	placeholder?: string;
	disabled?: boolean;
	size?: "sm" | "default" | "lg";
	class?: string;
	children?: (option: import("#components/select").SelectOption) => JSX.Element;
};

function FormSelect(props: FormSelectProps) {
	return (
		<FormField
			field={props.field}
			label={props.label}
			description={props.description}
			class={props.class}
		>
			<Select
				options={props.options}
				value={props.field().state.value}
				onValueChange={(v) => {
					props.field().handleChange(v);
					props.field().handleBlur();
				}}
				placeholder={props.placeholder}
				disabled={props.disabled}
				size={props.size}
				aria-invalid={hasErrors(props.field()) ? true : undefined}
			>
				{props.children}
			</Select>
		</FormField>
	);
}

// ─── FormCheckbox ───

type FormCheckboxProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	disabled?: boolean;
	class?: string;
};

function FormCheckbox(props: FormCheckboxProps) {
	return (
		<Field class={props.class}>
			<Field.Content>
				<Checkbox
					label={props.label}
					checked={props.field().state.value}
					onChange={(checked: boolean) => {
						props.field().handleChange(checked);
						props.field().handleBlur();
					}}
					disabled={props.disabled}
				/>
				<Show when={props.description}>
					<Field.Description>{props.description}</Field.Description>
				</Show>
				<Show when={hasErrors(props.field())}>
					<Field.Error>{firstError(props.field())}</Field.Error>
				</Show>
			</Field.Content>
		</Field>
	);
}

// ─── FormInputOTP ───

type FormInputOTPProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	maxLength: number;
	onComplete?: () => void;
	class?: string;
};

function FormInputOTP(props: FormInputOTPProps) {
	const id = createUniqueId();

	return (
		<FormField
			field={props.field}
			label={props.label}
			description={props.description}
			htmlFor={id}
			class={props.class}
		>
			<InputOTP
				id={id}
				maxLength={props.maxLength}
				pattern={REGEXP_ONLY_DIGITS}
				value={props.field().state.value}
				onValueChange={(v: string) => props.field().handleChange(v)}
				onComplete={props.onComplete}
				aria-invalid={hasErrors(props.field()) ? true : undefined}
			/>
		</FormField>
	);
}

// ─── FormEnumInput ───

type FormEnumInputProps = {
	field: () => AnyFieldApi;
	label: string;
	description?: string;
	placeholder?: string;
	disabled?: boolean;
	class?: string;
};

function FormEnumInput(props: FormEnumInputProps) {
	return (
		<FormField
			field={props.field}
			label={props.label}
			description={props.description}
			class={props.class}
		>
			<EnumInput
				values={props.field().state.value ?? []}
				onChange={(values) => {
					props.field().handleChange(values);
					props.field().handleBlur();
				}}
				placeholder={props.placeholder}
				disabled={props.disabled}
			/>
		</FormField>
	);
}

// ─── Exports ───

export const Form = {
	Field: FormField,
	Input: FormInput,
	Textarea: FormTextarea,
	Select: FormSelect,
	Checkbox: FormCheckbox,
	InputOTP: FormInputOTP,
	EnumInput: FormEnumInput,
};

export type {
	FormCheckboxProps,
	FormEnumInputProps,
	FormFieldProps,
	FormInputOTPProps,
	FormInputProps,
	FormSelectProps,
	FormTextareaProps,
};
