// The closure, proven at the type layer. Every component takes its legal
// props un-annotated, then each closed channel under @ts-expect-error, so a
// reopened prop turns into an unused directive and fails tsc --noEmit (check
// b7, and the package type-check itself, since scripts/ sits inside the
// tsconfig include).

import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Avatar } from "@fcalell/plugin-react-ui/components/avatar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Checkbox } from "@fcalell/plugin-react-ui/components/checkbox";
import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { Columns } from "@fcalell/plugin-react-ui/components/columns";
import { Count } from "@fcalell/plugin-react-ui/components/count";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Icon } from "@fcalell/plugin-react-ui/components/icon";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Link } from "@fcalell/plugin-react-ui/components/link";
import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { SegmentedControl } from "@fcalell/plugin-react-ui/components/segmented-control";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Spinner } from "@fcalell/plugin-react-ui/components/spinner";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { Status } from "@fcalell/plugin-react-ui/components/status";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { TextArea } from "@fcalell/plugin-react-ui/components/text-area";
import { Toast } from "@fcalell/plugin-react-ui/components/toast";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";

const slider = { label: "x", value: 1, onChange: () => {}, min: 0, max: 2 };

export const closure = (
	<>
		<Text role="body" />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" classList={{}} />
		<Icon name="X" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="X" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="X" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Icon name="X" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="X" classList={{}} />
		<Button label="x" />
		<Button label="x" icon="X" />
		<Button label="x" count={2} />
		{/* @ts-expect-error: closed channel */}
		<Button label="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Button label="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Button label="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Button label="x" classList={{}} />
		<IconButton icon="X" label="x" onAct={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="X" label="x" onAct={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="X" label="x" onAct={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="X" label="x" onAct={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="X" label="x" onAct={() => {}} classList={{}} />
		<Count value={1} />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} classList={{}} />
		<Status state="active" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" classList={{}} />
		<Chip label="x" family="red" />
		{/* @ts-expect-error: closed channel */}
		<Chip label="x" family="red" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Chip label="x" family="red" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Chip label="x" family="red" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Chip label="x" family="red" classList={{}} />
		<Input value="x" onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<Input value="x" onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Input value="x" onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Input value="x" onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Input value="x" onChange={() => {}} classList={{}} />
		<Select value="x" onChange={() => {}} options={[{ value: "x", label: "x" }]} placeholder="x" />
		<Select onChange={() => {}} options={[{ label: "x", options: [{ value: null, label: "x" }] }]} />
		{/* @ts-expect-error: a value outside the options */}
		<Select value="y" onChange={() => {}} options={[{ value: "x", label: "x" }]} />
		{/* @ts-expect-error: closed channel */}
		<Select onChange={() => {}} options={[{ value: "x", label: "x" }]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Select onChange={() => {}} options={[{ value: "x", label: "x" }]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Select onChange={() => {}} options={[{ value: "x", label: "x" }]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Select onChange={() => {}} options={[{ value: "x", label: "x" }]} classList={{}} />
		<TextArea value="x" onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="x" onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="x" onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="x" onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="x" onChange={() => {}} classList={{}} />
		<InputOtp length={6} value="1" onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<InputOtp length={6} value="1" onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<InputOtp length={6} value="1" onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<InputOtp length={6} value="1" onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<InputOtp length={6} value="1" onChange={() => {}} classList={{}} />
		<Slider {...slider} />
		{/* @ts-expect-error: closed channel */}
		<Slider {...slider} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Slider {...slider} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Slider {...slider} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Slider {...slider} classList={{}} />
		<Switch checked onChange={() => {}} label="x" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={() => {}} label="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={() => {}} label="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={() => {}} label="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={() => {}} label="x" classList={{}} />
		<Checkbox checked="mixed" onChange={() => {}} label="x" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked="mixed" onChange={() => {}} label="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked="mixed" onChange={() => {}} label="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked="mixed" onChange={() => {}} label="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked="mixed" onChange={() => {}} label="x" classList={{}} />
		<Spinner />
		{/* @ts-expect-error: closed channel */}
		<Spinner className="x" />
		{/* @ts-expect-error: closed channel */}
		<Spinner style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Spinner class="x" />
		{/* @ts-expect-error: closed channel */}
		<Spinner classList={{}} />
		<Avatar name="x" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="x" classList={{}} />
		<Link href="#" />
		{/* @ts-expect-error: closed channel */}
		<Link href="#" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Link href="#" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Link href="#" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Link href="#" classList={{}} />
		<Place title="x" />
		{/* @ts-expect-error: closed channel */}
		<Place title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Place title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Place title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Place title="x" classList={{}} />
		<Screen title="x" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Screen title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="x" classList={{}} />
		<Split />
		{/* @ts-expect-error: closed channel */}
		<Split className="x" />
		{/* @ts-expect-error: closed channel */}
		<Split style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Split class="x" />
		{/* @ts-expect-error: closed channel */}
		<Split classList={{}} />
		<Section title="x" />
		{/* @ts-expect-error: closed channel */}
		<Section title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Section title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Section title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Section title="x" classList={{}} />
		<Section title="x" act={{ icon: "Plus", label: "x", onAct: () => {} }} />
		<Group />
		{/* @ts-expect-error: closed channel */}
		<Group className="x" />
		{/* @ts-expect-error: closed channel */}
		<Group style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Group class="x" />
		{/* @ts-expect-error: closed channel */}
		<Group classList={{}} />
		<List />
		{/* @ts-expect-error: closed channel */}
		<List className="x" />
		{/* @ts-expect-error: closed channel */}
		<List style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<List class="x" />
		{/* @ts-expect-error: closed channel */}
		<List classList={{}} />
		<Columns />
		{/* @ts-expect-error: closed channel */}
		<Columns className="x" />
		{/* @ts-expect-error: closed channel */}
		<Columns style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Columns class="x" />
		{/* @ts-expect-error: closed channel */}
		<Columns classList={{}} />
		<Form />
		{/* @ts-expect-error: closed channel */}
		<Form className="x" />
		{/* @ts-expect-error: closed channel */}
		<Form style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Form class="x" />
		{/* @ts-expect-error: closed channel */}
		<Form classList={{}} />
		<Toolbar />
		{/* @ts-expect-error: closed channel */}
		<Toolbar className="x" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Toolbar class="x" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar classList={{}} />
		<ActionBar acts={[]} />
		{/* @ts-expect-error: closed channel */}
		<ActionBar acts={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar acts={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ActionBar acts={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar acts={[]} classList={{}} />
		<Shell places={[]} />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} classList={{}} />
		<ListRow title="x" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="x" classList={{}} />
		<FormField label="x" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<FormField label="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="x" classList={{}} />
		<SegmentedControl label="x" options={[]} value="x" onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl label="x" options={[]} value="x" onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl label="x" options={[]} value="x" onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl label="x" options={[]} value="x" onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl label="x" options={[]} value="x" onChange={() => {}} classList={{}} />
		<Sheet open onClose={() => {}} title="x" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={() => {}} title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={() => {}} title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={() => {}} title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={() => {}} title="x" classList={{}} />
		<Picker label="x" options={[]} onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<Picker label="x" options={[]} onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="x" options={[]} onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Picker label="x" options={[]} onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="x" options={[]} onChange={() => {}} classList={{}} />
		<Menu label="x" items={[]} />
		{/* @ts-expect-error: closed channel */}
		<Menu label="x" items={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Menu label="x" items={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Menu label="x" items={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Menu label="x" items={[]} classList={{}} />
		<OptionList options={[]} value={[]} onChange={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} value={[]} onChange={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} value={[]} onChange={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} value={[]} onChange={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} value={[]} onChange={() => {}} classList={{}} />
		<Toast sentence="x" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="x" classList={{}} />
		<DefinitionRow label="x" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="x" classList={{}} />
		<ItemHeader title="x" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="x" classList={{}} />
		<EmptyState sentence="x" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="x" classList={{}} />
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} className="x" />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} class="x" />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} classList={{}} />
		<Banner sentence="x" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="x" classList={{}} />
		<PendingBar sentence="x" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="x" classList={{}} />
	</>
);
