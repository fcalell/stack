// The closure, proven at the type layer. Every exported component takes its
// legal props un-annotated, then class, style, classList and each dead hatch
// under @ts-expect-error, so a reopened prop turns into an unused directive
// and fails tsc --noEmit (the b8 check, and the package type-check itself,
// since scripts/ sits inside the tsconfig include).
import type { Action } from "@fcalell/ui-core/descriptors";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { CircleAlert } from "lucide-solid";
import { Avatar } from "@fcalell/plugin-solid-ui/components/avatar";
import { Badge } from "@fcalell/plugin-solid-ui/components/badge";
import { Button } from "@fcalell/plugin-solid-ui/components/button";
import { Card } from "@fcalell/plugin-solid-ui/components/card";
import { Checkbox } from "@fcalell/plugin-solid-ui/components/checkbox";
import { ContextMenu } from "@fcalell/plugin-solid-ui/components/context-menu";
import { DangerZone } from "@fcalell/plugin-solid-ui/components/danger-zone";
import { DataTable } from "@fcalell/plugin-solid-ui/components/data-table";
import {
	createDialog,
	Dialog,
} from "@fcalell/plugin-solid-ui/components/dialog";
import type { MenuItem } from "@fcalell/plugin-solid-ui/components/dropdown-menu";
import { DropdownMenu } from "@fcalell/plugin-solid-ui/components/dropdown-menu";
import { EmptyState } from "@fcalell/plugin-solid-ui/components/empty-state";
import { EnumInput } from "@fcalell/plugin-solid-ui/components/enum-input";
import { Field } from "@fcalell/plugin-solid-ui/components/field";
import { Form } from "@fcalell/plugin-solid-ui/components/form";
import { Frame } from "@fcalell/plugin-solid-ui/components/frame";
import { Input } from "@fcalell/plugin-solid-ui/components/input";
import { InputGroup } from "@fcalell/plugin-solid-ui/components/input-group";
import { InputOTP } from "@fcalell/plugin-solid-ui/components/input-otp";
import { Inset } from "@fcalell/plugin-solid-ui/components/inset";
import { Item } from "@fcalell/plugin-solid-ui/components/item";
import { Label } from "@fcalell/plugin-solid-ui/components/label";
import { Loader } from "@fcalell/plugin-solid-ui/components/loader";
import { Logo } from "@fcalell/plugin-solid-ui/components/logo";
import { NavigationProgress } from "@fcalell/plugin-solid-ui/components/navigation-progress";
import { Pair } from "@fcalell/plugin-solid-ui/components/pair";
import { QueryBoundary } from "@fcalell/plugin-solid-ui/components/query-boundary";
import { Row } from "@fcalell/plugin-solid-ui/components/row";
import { ScrollArea } from "@fcalell/plugin-solid-ui/components/scroll-area";
import { Section } from "@fcalell/plugin-solid-ui/components/section";
import { SectionToolbar } from "@fcalell/plugin-solid-ui/components/section-toolbar";
import { Select } from "@fcalell/plugin-solid-ui/components/select";
import { Separator } from "@fcalell/plugin-solid-ui/components/separator";
import { createSheet, Sheet } from "@fcalell/plugin-solid-ui/components/sheet";
import { Sidebar } from "@fcalell/plugin-solid-ui/components/sidebar";
import { Stack } from "@fcalell/plugin-solid-ui/components/stack";
import { Table } from "@fcalell/plugin-solid-ui/components/table";
import { Tabs } from "@fcalell/plugin-solid-ui/components/tabs";
import { Text } from "@fcalell/plugin-solid-ui/components/text";
import { Textarea } from "@fcalell/plugin-solid-ui/components/textarea";
import { Toaster } from "@fcalell/plugin-solid-ui/components/toast";
import { Tooltip } from "@fcalell/plugin-solid-ui/components/tooltip";

const noop = () => {};
const anchor = () => <span>a</span>;
const fakeField = () => ({}) as AnyFieldApi;
const retry: Action<never> = { label: "Retry", onSelect: noop };
const menuItems: MenuItem[] = [
	{ label: "a", icon: CircleAlert, onSelect: noop },
	// @ts-expect-error a menu icon is a component param, not an element
	{ label: "b", icon: anchor() },
];
const fakeQuery = {
	data: undefined as string | undefined,
	isPending: true,
	isError: false,
	error: null,
	refetch: noop,
};
const badMeta: import("@tanstack/solid-table").ColumnMeta<unknown, unknown> = {
	// @ts-expect-error the ColumnMeta class key is deleted
	class: "x",
};
const badAction: Action<never> = {
	...retry,
	// @ts-expect-error Action<never> keeps the icon field unpassable until M7
	icon: CircleAlert,
};

export function hooks() {
	const dialog = createDialog(() => null, {
		// @ts-expect-error the createDialog contentClass hatch is dead
		contentClass: "x",
	});
	const sheet = createSheet(() => null, {
		// @ts-expect-error the createSheet contentClass hatch is dead
		contentClass: "x",
	});
	return [dialog, sheet, badMeta, badAction];
}

export function closure() {
	return (
		<>
			<Avatar
			/>
			<Avatar
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Avatar
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Avatar
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Avatar.Image
				alt="a" src="/x.png"
			/>
			<Avatar.Image
				alt="a" src="/x.png"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Avatar.Image
				alt="a" src="/x.png"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Avatar.Image
				alt="a" src="/x.png"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Avatar.Fallback
			>
				A
			</Avatar.Fallback>
			<Avatar.Fallback
				// @ts-expect-error the class prop is closed
				class="x"
			>
				A
			</Avatar.Fallback>
			<Avatar.Fallback
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				A
			</Avatar.Fallback>
			<Avatar.Fallback
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				A
			</Avatar.Fallback>
			<Badge
				tone="ok"
			>
				B
			</Badge>
			<Badge
				tone="ok"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				B
			</Badge>
			<Badge
				tone="ok"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				B
			</Badge>
			<Badge
				tone="ok"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				B
			</Badge>
			<Button
				loading
			>
				ok
			</Button>
			<Button
				loading
				// @ts-expect-error the class prop is closed
				class="x"
			>
				ok
			</Button>
			<Button
				loading
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				ok
			</Button>
			<Button
				loading
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				ok
			</Button>
			<Card
				padding="none" ring="warn"
			>
				c
			</Card>
			<Card
				padding="none" ring="warn"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Card>
			<Card
				padding="none" ring="warn"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Card>
			<Card
				padding="none" ring="warn"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Card>
			<Card.Header
			>
				h
			</Card.Header>
			<Card.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Card.Header>
			<Card.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Card.Header>
			<Card.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Card.Header>
			<Card.Title
			>
				t
			</Card.Title>
			<Card.Title
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Card.Title>
			<Card.Title
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Card.Title>
			<Card.Title
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Card.Title>
			<Card.Description
			>
				d
			</Card.Description>
			<Card.Description
				// @ts-expect-error the class prop is closed
				class="x"
			>
				d
			</Card.Description>
			<Card.Description
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				d
			</Card.Description>
			<Card.Description
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				d
			</Card.Description>
			<Card.Content
			>
				c
			</Card.Content>
			<Card.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Card.Content>
			<Card.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Card.Content>
			<Card.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Card.Content>
			<Card.Footer
			>
				f
			</Card.Footer>
			<Card.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Card.Footer>
			<Card.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Card.Footer>
			<Card.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Card.Footer>
			<Checkbox
				label="ok"
			/>
			<Checkbox
				label="ok"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Checkbox
				label="ok"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Checkbox
				label="ok"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Checkbox
				// @ts-expect-error label narrowed to string
				label={anchor()}
			/>
			<ContextMenu
				items={[]}
			>
				area
			</ContextMenu>
			<ContextMenu
				items={[]}
				// @ts-expect-error the class prop is closed
				class="x"
			>
				area
			</ContextMenu>
			<ContextMenu
				items={[]}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				area
			</ContextMenu>
			<ContextMenu
				items={[]}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				area
			</ContextMenu>
			<ContextMenu
				items={[]}
				// @ts-expect-error the contentClass hatch is dead
				contentClass="x"
			>
				area
			</ContextMenu>
			<DangerZone
				description="d" actionLabel="a" onAction={noop}
			/>
			<DangerZone
				description="d" actionLabel="a" onAction={noop}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<DangerZone
				description="d" actionLabel="a" onAction={noop}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<DangerZone
				description="d" actionLabel="a" onAction={noop}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<DataTable
				columns={[]} data={[]}
			/>
			<DataTable
				columns={[]} data={[]}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<DataTable
				columns={[]} data={[]}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<DataTable
				columns={[]} data={[]}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Dialog.Trigger
			>
				t
			</Dialog.Trigger>
			<Dialog.Trigger
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Dialog.Trigger>
			<Dialog.Trigger
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Dialog.Trigger>
			<Dialog.Trigger
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Dialog.Trigger>
			<Dialog.Content
			>
				c
			</Dialog.Content>
			<Dialog.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Dialog.Content>
			<Dialog.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Dialog.Content>
			<Dialog.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Dialog.Content>
			<Dialog.Header
			>
				h
			</Dialog.Header>
			<Dialog.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Dialog.Header>
			<Dialog.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Dialog.Header>
			<Dialog.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Dialog.Header>
			<Dialog.Footer
			>
				f
			</Dialog.Footer>
			<Dialog.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Dialog.Footer>
			<Dialog.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Dialog.Footer>
			<Dialog.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Dialog.Footer>
			<Dialog.Title
			>
				t
			</Dialog.Title>
			<Dialog.Title
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Dialog.Title>
			<Dialog.Title
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Dialog.Title>
			<Dialog.Title
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Dialog.Title>
			<Dialog.Description
			>
				d
			</Dialog.Description>
			<Dialog.Description
				// @ts-expect-error the class prop is closed
				class="x"
			>
				d
			</Dialog.Description>
			<Dialog.Description
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				d
			</Dialog.Description>
			<Dialog.Description
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				d
			</Dialog.Description>
			<DropdownMenu
				trigger={anchor()} items={menuItems}
			/>
			<DropdownMenu
				trigger={anchor()} items={menuItems}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<DropdownMenu
				trigger={anchor()} items={menuItems}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<DropdownMenu
				trigger={anchor()} items={menuItems}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<DropdownMenu
				trigger={anchor()} items={menuItems}
				// @ts-expect-error the contentClass hatch is dead
				contentClass="x"
			/>
			<EmptyState
				title="t" icon={CircleAlert} action={retry}
			/>
			<EmptyState
				title="t" icon={CircleAlert} action={retry}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<EmptyState
				title="t" icon={CircleAlert} action={retry}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<EmptyState
				title="t" icon={CircleAlert} action={retry}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<EmptyState
				title="t"
				// @ts-expect-error icon is a component param, not an element
				icon={anchor()}
			/>
			<EmptyState
				title="t" icon={CircleAlert} action={retry}
				// @ts-expect-error the element children region is collapsed into action
				children={anchor()}
			/>
			<EnumInput
				values={[]} onChange={noop}
			/>
			<EnumInput
				values={[]} onChange={noop}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<EnumInput
				values={[]} onChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<EnumInput
				values={[]} onChange={noop}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Field
			>
				f
			</Field>
			<Field
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Field>
			<Field
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Field>
			<Field
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Field>
			<Field.Content
			>
				c
			</Field.Content>
			<Field.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Field.Content>
			<Field.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Field.Content>
			<Field.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Field.Content>
			<Field.Label
				for="x"
			>
				l
			</Field.Label>
			<Field.Label
				for="x"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				l
			</Field.Label>
			<Field.Label
				for="x"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				l
			</Field.Label>
			<Field.Label
				for="x"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				l
			</Field.Label>
			<Field.Description
			>
				d
			</Field.Description>
			<Field.Description
				// @ts-expect-error the class prop is closed
				class="x"
			>
				d
			</Field.Description>
			<Field.Description
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				d
			</Field.Description>
			<Field.Description
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				d
			</Field.Description>
			<Field.Value
			>
				v
			</Field.Value>
			<Field.Value
				// @ts-expect-error the class prop is closed
				class="x"
			>
				v
			</Field.Value>
			<Field.Value
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				v
			</Field.Value>
			<Field.Value
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				v
			</Field.Value>
			<Field.Error
			>
				e
			</Field.Error>
			<Field.Error
				// @ts-expect-error the class prop is closed
				class="x"
			>
				e
			</Field.Error>
			<Field.Error
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				e
			</Field.Error>
			<Field.Error
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				e
			</Field.Error>
			<Form.Field
				field={fakeField} label="l"
			>
				x
			</Form.Field>
			<Form.Field
				field={fakeField} label="l"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				x
			</Form.Field>
			<Form.Field
				field={fakeField} label="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				x
			</Form.Field>
			<Form.Field
				field={fakeField} label="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				x
			</Form.Field>
			<Form.Input
				field={fakeField} label="l"
			/>
			<Form.Input
				field={fakeField} label="l"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.Input
				field={fakeField} label="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.Input
				field={fakeField} label="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Form.Textarea
				field={fakeField} label="l"
			/>
			<Form.Textarea
				field={fakeField} label="l"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.Textarea
				field={fakeField} label="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.Textarea
				field={fakeField} label="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Form.Select
				field={fakeField} label="l" options={[]}
			/>
			<Form.Select
				field={fakeField} label="l" options={[]}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.Select
				field={fakeField} label="l" options={[]}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.Select
				field={fakeField} label="l" options={[]}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Form.Checkbox
				field={fakeField} label="l"
			/>
			<Form.Checkbox
				field={fakeField} label="l"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.Checkbox
				field={fakeField} label="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.Checkbox
				field={fakeField} label="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Form.InputOTP
				field={fakeField} label="l" maxLength={6}
			/>
			<Form.InputOTP
				field={fakeField} label="l" maxLength={6}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.InputOTP
				field={fakeField} label="l" maxLength={6}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.InputOTP
				field={fakeField} label="l" maxLength={6}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Form.EnumInput
				field={fakeField} label="l"
			/>
			<Form.EnumInput
				field={fakeField} label="l"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Form.EnumInput
				field={fakeField} label="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Form.EnumInput
				field={fakeField} label="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Input
				value="v"
			/>
			<Input
				value="v"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Input
				value="v"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Input
				value="v"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<InputGroup
				legend="g"
			>
				g
			</InputGroup>
			<InputGroup
				legend="g"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				g
			</InputGroup>
			<InputGroup
				legend="g"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				g
			</InputGroup>
			<InputGroup
				legend="g"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				g
			</InputGroup>
			<InputGroup.Addon
				align="inline-end"
			>
				a
			</InputGroup.Addon>
			<InputGroup.Addon
				align="inline-end"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				a
			</InputGroup.Addon>
			<InputGroup.Addon
				align="inline-end"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				a
			</InputGroup.Addon>
			<InputGroup.Addon
				align="inline-end"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				a
			</InputGroup.Addon>
			<InputGroup.Button
				size="icon-xs"
			>
				b
			</InputGroup.Button>
			<InputGroup.Button
				size="icon-xs"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				b
			</InputGroup.Button>
			<InputGroup.Button
				size="icon-xs"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				b
			</InputGroup.Button>
			<InputGroup.Button
				size="icon-xs"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				b
			</InputGroup.Button>
			<InputGroup.Text
			>
				t
			</InputGroup.Text>
			<InputGroup.Text
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</InputGroup.Text>
			<InputGroup.Text
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</InputGroup.Text>
			<InputGroup.Text
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</InputGroup.Text>
			<InputGroup.Input
			/>
			<InputGroup.Input
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<InputGroup.Input
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<InputGroup.Input
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<InputGroup.Textarea
			/>
			<InputGroup.Textarea
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<InputGroup.Textarea
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<InputGroup.Textarea
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<InputOTP
				maxLength={6}
			/>
			<InputOTP
				maxLength={6}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<InputOTP
				maxLength={6}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<InputOTP
				maxLength={6}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Inset
				tone="danger"
			>
				i
			</Inset>
			<Inset
				tone="danger"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				i
			</Inset>
			<Inset
				tone="danger"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				i
			</Inset>
			<Inset
				tone="danger"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				i
			</Inset>
			<Item
				variant="outline" size="sm"
			>
				i
			</Item>
			<Item
				variant="outline" size="sm"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				i
			</Item>
			<Item
				variant="outline" size="sm"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				i
			</Item>
			<Item
				variant="outline" size="sm"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				i
			</Item>
			<Item.Group
			/>
			<Item.Group
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Item.Group
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Item.Group
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Item.Separator
			/>
			<Item.Separator
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Item.Separator
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Item.Separator
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Item.Media
				variant="icon"
			/>
			<Item.Media
				variant="icon"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Item.Media
				variant="icon"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Item.Media
				variant="icon"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Item.Content
			>
				c
			</Item.Content>
			<Item.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Item.Content>
			<Item.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Item.Content>
			<Item.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Item.Content>
			<Item.Title
			>
				t
			</Item.Title>
			<Item.Title
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Item.Title>
			<Item.Title
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Item.Title>
			<Item.Title
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Item.Title>
			<Item.Description
			>
				d
			</Item.Description>
			<Item.Description
				// @ts-expect-error the class prop is closed
				class="x"
			>
				d
			</Item.Description>
			<Item.Description
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				d
			</Item.Description>
			<Item.Description
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				d
			</Item.Description>
			<Item.Actions
			/>
			<Item.Actions
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Item.Actions
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Item.Actions
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Item.Header
			>
				h
			</Item.Header>
			<Item.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Item.Header>
			<Item.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Item.Header>
			<Item.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Item.Header>
			<Item.Footer
			>
				f
			</Item.Footer>
			<Item.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Item.Footer>
			<Item.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Item.Footer>
			<Item.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Item.Footer>
			<Label
				for="x"
			>
				l
			</Label>
			<Label
				for="x"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				l
			</Label>
			<Label
				for="x"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				l
			</Label>
			<Label
				for="x"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				l
			</Label>
			<Loader
				text="t"
			/>
			<Loader
				text="t"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Loader
				text="t"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Loader
				text="t"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Logo
				icon={anchor()}
			/>
			<Logo
				icon={anchor()}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Logo
				icon={anchor()}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Logo
				icon={anchor()}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<NavigationProgress
				loading
			/>
			<NavigationProgress
				loading
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<NavigationProgress
				loading
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<NavigationProgress
				loading
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<QueryBoundary
				query={fakeQuery}
			>
				{(data) => <span>{data()}</span>}
			</QueryBoundary>
			<QueryBoundary
				query={fakeQuery}
				// @ts-expect-error the class prop is closed
				class="x"
			>
				{(data) => <span>{data()}</span>}
			</QueryBoundary>
			<QueryBoundary
				query={fakeQuery}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				{(data) => <span>{data()}</span>}
			</QueryBoundary>
			<QueryBoundary
				query={fakeQuery}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				{(data) => <span>{data()}</span>}
			</QueryBoundary>
			<Section
			>
				s
			</Section>
			<Section
				// @ts-expect-error the class prop is closed
				class="x"
			>
				s
			</Section>
			<Section
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				s
			</Section>
			<Section
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				s
			</Section>
			<Section.Header
			>
				h
			</Section.Header>
			<Section.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Section.Header>
			<Section.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Section.Header>
			<Section.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Section.Header>
			<Section.Title
			>
				t
			</Section.Title>
			<Section.Title
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Section.Title>
			<Section.Title
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Section.Title>
			<Section.Title
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Section.Title>
			<Section.Content
			>
				c
			</Section.Content>
			<Section.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Section.Content>
			<Section.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Section.Content>
			<Section.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Section.Content>
			<Section.Table
			/>
			<Section.Table
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Section.Table
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Section.Table
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<SectionToolbar
			>
				t
			</SectionToolbar>
			<SectionToolbar
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</SectionToolbar>
			<SectionToolbar
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</SectionToolbar>
			<SectionToolbar
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</SectionToolbar>
			<SectionToolbar.Left
			>
				l
			</SectionToolbar.Left>
			<SectionToolbar.Left
				// @ts-expect-error the class prop is closed
				class="x"
			>
				l
			</SectionToolbar.Left>
			<SectionToolbar.Left
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				l
			</SectionToolbar.Left>
			<SectionToolbar.Left
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				l
			</SectionToolbar.Left>
			<SectionToolbar.Right
			>
				r
			</SectionToolbar.Right>
			<SectionToolbar.Right
				// @ts-expect-error the class prop is closed
				class="x"
			>
				r
			</SectionToolbar.Right>
			<SectionToolbar.Right
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				r
			</SectionToolbar.Right>
			<SectionToolbar.Right
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				r
			</SectionToolbar.Right>
			<Select
				options={[]}
			/>
			<Select
				options={[]}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Select
				options={[]}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Select
				options={[]}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Select
				options={[]}
				// @ts-expect-error the contentClass hatch is dead
				contentClass="x"
			/>
			<Separator
				orientation="vertical"
			/>
			<Separator
				orientation="vertical"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Separator
				orientation="vertical"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Separator
				orientation="vertical"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sheet.Trigger
			>
				t
			</Sheet.Trigger>
			<Sheet.Trigger
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Sheet.Trigger>
			<Sheet.Trigger
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Sheet.Trigger>
			<Sheet.Trigger
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Sheet.Trigger>
			<Sheet.Close
			>
				c
			</Sheet.Close>
			<Sheet.Close
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Sheet.Close>
			<Sheet.Close
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Sheet.Close>
			<Sheet.Close
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Sheet.Close>
			<Sheet.Content
				position="left" size="lg"
			>
				c
			</Sheet.Content>
			<Sheet.Content
				position="left" size="lg"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Sheet.Content>
			<Sheet.Content
				position="left" size="lg"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Sheet.Content>
			<Sheet.Content
				position="left" size="lg"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Sheet.Content>
			<Sheet.Header
			>
				h
			</Sheet.Header>
			<Sheet.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Sheet.Header>
			<Sheet.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Sheet.Header>
			<Sheet.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Sheet.Header>
			<Sheet.Footer
			>
				f
			</Sheet.Footer>
			<Sheet.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Sheet.Footer>
			<Sheet.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Sheet.Footer>
			<Sheet.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Sheet.Footer>
			<Sheet.Title
			>
				t
			</Sheet.Title>
			<Sheet.Title
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Sheet.Title>
			<Sheet.Title
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Sheet.Title>
			<Sheet.Title
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Sheet.Title>
			<Sheet.Description
			>
				d
			</Sheet.Description>
			<Sheet.Description
				// @ts-expect-error the class prop is closed
				class="x"
			>
				d
			</Sheet.Description>
			<Sheet.Description
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				d
			</Sheet.Description>
			<Sheet.Description
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				d
			</Sheet.Description>
			<Sidebar.Provider
			>
				p
			</Sidebar.Provider>
			<Sidebar.Provider
				// @ts-expect-error the class prop is closed
				class="x"
			>
				p
			</Sidebar.Provider>
			<Sidebar.Provider
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				p
			</Sidebar.Provider>
			<Sidebar.Provider
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				p
			</Sidebar.Provider>
			<Sidebar
				side="right" variant="floating"
			>
				s
			</Sidebar>
			<Sidebar
				side="right" variant="floating"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				s
			</Sidebar>
			<Sidebar
				side="right" variant="floating"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				s
			</Sidebar>
			<Sidebar
				side="right" variant="floating"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				s
			</Sidebar>
			<Sidebar.Trigger
			/>
			<Sidebar.Trigger
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.Trigger
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.Trigger
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.Rail
			/>
			<Sidebar.Rail
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.Rail
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.Rail
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.Inset
			>
				i
			</Sidebar.Inset>
			<Sidebar.Inset
				// @ts-expect-error the class prop is closed
				class="x"
			>
				i
			</Sidebar.Inset>
			<Sidebar.Inset
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				i
			</Sidebar.Inset>
			<Sidebar.Inset
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				i
			</Sidebar.Inset>
			<Sidebar.Header
			>
				h
			</Sidebar.Header>
			<Sidebar.Header
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Sidebar.Header>
			<Sidebar.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Sidebar.Header>
			<Sidebar.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Sidebar.Header>
			<Sidebar.Footer
			>
				f
			</Sidebar.Footer>
			<Sidebar.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Sidebar.Footer>
			<Sidebar.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Sidebar.Footer>
			<Sidebar.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Sidebar.Footer>
			<Sidebar.Separator
			/>
			<Sidebar.Separator
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.Separator
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.Separator
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.Content
			>
				c
			</Sidebar.Content>
			<Sidebar.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Sidebar.Content>
			<Sidebar.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Sidebar.Content>
			<Sidebar.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Sidebar.Content>
			<Sidebar.Input
			/>
			<Sidebar.Input
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.Input
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.Input
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.Group
			>
				g
			</Sidebar.Group>
			<Sidebar.Group
				// @ts-expect-error the class prop is closed
				class="x"
			>
				g
			</Sidebar.Group>
			<Sidebar.Group
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				g
			</Sidebar.Group>
			<Sidebar.Group
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				g
			</Sidebar.Group>
			<Sidebar.GroupLabel
			>
				l
			</Sidebar.GroupLabel>
			<Sidebar.GroupLabel
				// @ts-expect-error the class prop is closed
				class="x"
			>
				l
			</Sidebar.GroupLabel>
			<Sidebar.GroupLabel
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				l
			</Sidebar.GroupLabel>
			<Sidebar.GroupLabel
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				l
			</Sidebar.GroupLabel>
			<Sidebar.GroupAction
			/>
			<Sidebar.GroupAction
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.GroupAction
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.GroupAction
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.GroupContent
			>
				c
			</Sidebar.GroupContent>
			<Sidebar.GroupContent
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Sidebar.GroupContent>
			<Sidebar.GroupContent
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Sidebar.GroupContent>
			<Sidebar.GroupContent
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Sidebar.GroupContent>
			<Sidebar.Menu
			>
				m
			</Sidebar.Menu>
			<Sidebar.Menu
				// @ts-expect-error the class prop is closed
				class="x"
			>
				m
			</Sidebar.Menu>
			<Sidebar.Menu
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				m
			</Sidebar.Menu>
			<Sidebar.Menu
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				m
			</Sidebar.Menu>
			<Sidebar.MenuItem
			>
				i
			</Sidebar.MenuItem>
			<Sidebar.MenuItem
				// @ts-expect-error the class prop is closed
				class="x"
			>
				i
			</Sidebar.MenuItem>
			<Sidebar.MenuItem
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				i
			</Sidebar.MenuItem>
			<Sidebar.MenuItem
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				i
			</Sidebar.MenuItem>
			<Sidebar.MenuButton
				size="lg" isActive
			>
				b
			</Sidebar.MenuButton>
			<Sidebar.MenuButton
				size="lg" isActive
				// @ts-expect-error the class prop is closed
				class="x"
			>
				b
			</Sidebar.MenuButton>
			<Sidebar.MenuButton
				size="lg" isActive
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				b
			</Sidebar.MenuButton>
			<Sidebar.MenuButton
				size="lg" isActive
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				b
			</Sidebar.MenuButton>
			<Sidebar.MenuAction
				showOnHover
			/>
			<Sidebar.MenuAction
				showOnHover
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.MenuAction
				showOnHover
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.MenuAction
				showOnHover
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.MenuBadge
			>
				b
			</Sidebar.MenuBadge>
			<Sidebar.MenuBadge
				// @ts-expect-error the class prop is closed
				class="x"
			>
				b
			</Sidebar.MenuBadge>
			<Sidebar.MenuBadge
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				b
			</Sidebar.MenuBadge>
			<Sidebar.MenuBadge
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				b
			</Sidebar.MenuBadge>
			<Sidebar.MenuLoader
				text="l"
			/>
			<Sidebar.MenuLoader
				text="l"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Sidebar.MenuLoader
				text="l"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Sidebar.MenuLoader
				text="l"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Sidebar.MenuSub
			>
				s
			</Sidebar.MenuSub>
			<Sidebar.MenuSub
				// @ts-expect-error the class prop is closed
				class="x"
			>
				s
			</Sidebar.MenuSub>
			<Sidebar.MenuSub
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				s
			</Sidebar.MenuSub>
			<Sidebar.MenuSub
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				s
			</Sidebar.MenuSub>
			<Sidebar.MenuSubItem
			>
				i
			</Sidebar.MenuSubItem>
			<Sidebar.MenuSubItem
				// @ts-expect-error the class prop is closed
				class="x"
			>
				i
			</Sidebar.MenuSubItem>
			<Sidebar.MenuSubItem
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				i
			</Sidebar.MenuSubItem>
			<Sidebar.MenuSubItem
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				i
			</Sidebar.MenuSubItem>
			<Sidebar.MenuSubButton
				size="sm"
			>
				b
			</Sidebar.MenuSubButton>
			<Sidebar.MenuSubButton
				size="sm"
				// @ts-expect-error the class prop is closed
				class="x"
			>
				b
			</Sidebar.MenuSubButton>
			<Sidebar.MenuSubButton
				size="sm"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				b
			</Sidebar.MenuSubButton>
			<Sidebar.MenuSubButton
				size="sm"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				b
			</Sidebar.MenuSubButton>
			<Stack
			>
				s
			</Stack>
			<Stack
				// @ts-expect-error the class prop is closed
				class="x"
			>
				s
			</Stack>
			<Stack
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				s
			</Stack>
			<Stack
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				s
			</Stack>
			<Row
			>
				r
			</Row>
			<Row
				// @ts-expect-error the class prop is closed
				class="x"
			>
				r
			</Row>
			<Row
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				r
			</Row>
			<Row
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				r
			</Row>
			<Pair
				row
			>
				p
			</Pair>
			<Pair
				row
				// @ts-expect-error the class prop is closed
				class="x"
			>
				p
			</Pair>
			<Pair
				row
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				p
			</Pair>
			<Pair
				row
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				p
			</Pair>
			<Frame
			>
				f
			</Frame>
			<Frame
				// @ts-expect-error the class prop is closed
				class="x"
			>
				f
			</Frame>
			<Frame
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				f
			</Frame>
			<Frame
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				f
			</Frame>
			<ScrollArea
				axis="both"
				pinToBottom
			>
				s
			</ScrollArea>
			<ScrollArea
				axis="both"
				pinToBottom
				// @ts-expect-error the class prop is closed
				class="x"
			>
				s
			</ScrollArea>
			<ScrollArea
				axis="both"
				pinToBottom
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				s
			</ScrollArea>
			<ScrollArea
				axis="both"
				pinToBottom
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				s
			</ScrollArea>
			<Table
				bordered
			>
				t
			</Table>
			<Table
				bordered
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Table>
			<Table
				bordered
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Table>
			<Table
				bordered
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Table>
			<Table
				bordered
				// @ts-expect-error the containerClass hatch is dead
				containerClass="x"
			>
				t
			</Table>
			<Table.Header
			/>
			<Table.Header
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Table.Header
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Table.Header
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Table.Body
			/>
			<Table.Body
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Table.Body
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Table.Body
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Table.Footer
			/>
			<Table.Footer
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Table.Footer
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Table.Footer
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Table.Row
			/>
			<Table.Row
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Table.Row
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Table.Row
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Table.Head
			>
				h
			</Table.Head>
			<Table.Head
				// @ts-expect-error the class prop is closed
				class="x"
			>
				h
			</Table.Head>
			<Table.Head
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				h
			</Table.Head>
			<Table.Head
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				h
			</Table.Head>
			<Table.Cell
			>
				c
			</Table.Cell>
			<Table.Cell
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Table.Cell>
			<Table.Cell
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Table.Cell>
			<Table.Cell
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Table.Cell>
			<Table.Caption
			>
				c
			</Table.Caption>
			<Table.Caption
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Table.Caption>
			<Table.Caption
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Table.Caption>
			<Table.Caption
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Table.Caption>
			<Tabs
				tabs={[]}
			/>
			<Tabs
				tabs={[]}
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Tabs
				tabs={[]}
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Tabs
				tabs={[]}
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Tabs
				tabs={[]}
				// @ts-expect-error the listClass hatch is dead
				listClass="x"
			/>
			<Tabs
				tabs={[]}
				// @ts-expect-error the contentClass hatch is dead
				contentClass="x"
			/>
			<Text
				variant="h1" tone="ink-2" strong mono
			>
				t
			</Text>
			<Text
				variant="h1" tone="ink-2" strong mono
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Text>
			<Text
				variant="h1" tone="ink-2" strong mono
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Text>
			<Text
				variant="h1" tone="ink-2" strong mono
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Text>
			<Textarea
				value="v"
			/>
			<Textarea
				value="v"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Textarea
				value="v"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Textarea
				value="v"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Toaster
				position="top-right"
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error the class prop is closed
				class="x"
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error the toastOptions design-overwrite slot is closed
				toastOptions={{}}
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error the icons element slots are closed
				icons={{}}
			/>
			<Toaster
				position="top-right"
				// @ts-expect-error className never existed on the web and stays closed
				className="x"
			/>
			<Tooltip.Trigger
			>
				t
			</Tooltip.Trigger>
			<Tooltip.Trigger
				// @ts-expect-error the class prop is closed
				class="x"
			>
				t
			</Tooltip.Trigger>
			<Tooltip.Trigger
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				t
			</Tooltip.Trigger>
			<Tooltip.Trigger
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				t
			</Tooltip.Trigger>
			<Tooltip.Content
			>
				c
			</Tooltip.Content>
			<Tooltip.Content
				// @ts-expect-error the class prop is closed
				class="x"
			>
				c
			</Tooltip.Content>
			<Tooltip.Content
				// @ts-expect-error the style prop is closed
				style={{ color: "red" }}
			>
				c
			</Tooltip.Content>
			<Tooltip.Content
				// @ts-expect-error the classList prop is closed
				classList={{ x: true }}
			>
				c
			</Tooltip.Content>
		</>
	);
}
