// The closure, proven at the type layer. Every component takes its legal
// props un-annotated, then each closed channel under @ts-expect-error, so a
// reopened prop turns into an unused directive and fails tsc --noEmit (check
// b7, and the package type-check itself, since scripts/ sits inside the
// tsconfig include).

import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { AuthColumn } from "@fcalell/plugin-react-ui/components/auth-column";
import { Avatar } from "@fcalell/plugin-react-ui/components/avatar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Checkbox } from "@fcalell/plugin-react-ui/components/checkbox";
import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { Columns } from "@fcalell/plugin-react-ui/components/columns";
import { Count } from "@fcalell/plugin-react-ui/components/count";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { FileInput } from "@fcalell/plugin-react-ui/components/file-input";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Icon } from "@fcalell/plugin-react-ui/components/icon";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import { Image } from "@fcalell/plugin-react-ui/components/image";
import { StepCount } from "@fcalell/plugin-react-ui/components/step-count";
import { Stages } from "@fcalell/plugin-react-ui/components/stages";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Link } from "@fcalell/plugin-react-ui/components/link";
import { Message } from "@fcalell/plugin-react-ui/components/message";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Meter } from "@fcalell/plugin-react-ui/components/meter";
import { Stat } from "@fcalell/plugin-react-ui/components/stat";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { QrCode } from "@fcalell/plugin-react-ui/components/qr-code";
import { Rules } from "@fcalell/plugin-react-ui/components/rules";
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
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Toast } from "@fcalell/plugin-react-ui/components/toast";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Comparison } from "@fcalell/plugin-react-ui/components/comparison";
import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import { FileRow } from "@fcalell/plugin-react-ui/components/file-row";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { ProseDiff } from "@fcalell/plugin-react-ui/components/prose-diff";

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
		<FileInput value={null} onChange={() => {}} accept={[".csv"]} />
		{/* @ts-expect-error: closed channel */}
		<FileInput value={null} onChange={() => {}} accept={[".csv"]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<FileInput value={null} onChange={() => {}} accept={[".csv"]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<FileInput value={null} onChange={() => {}} accept={[".csv"]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<FileInput value={null} onChange={() => {}} accept={[".csv"]} classList={{}} />
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
		<List items={[]} row={{ key: String, title: String }} />
		{/* @ts-expect-error: a list's rows lead with one kind */}
		<List items={[1]} row={{ key: String, title: String, leading: { avatar: () => ({ name: "x" }), icon: () => "X" } }} />
		<List items={[1]} row={{ key: String, title: String, leading: { status: () => "active" } }} />
		{/* @ts-expect-error: a list takes a query or items, never both */}
		<List items={[1]} query={{ data: [1], isPending: false, isError: false, refetch: () => {} }} sentence="x" empty={{ sentence: "x" }} row={{ key: String, title: String }} />
		{/* @ts-expect-error: a list holds one row kind */}
		<List items={[1]} row={{ key: String, title: String }} file={{ key: String, path: String, added: Number, removed: Number }} />
		<List items={["a"]} empty={{ sentence: "x", act: { label: "x", onAct: () => {} } }} file={{ key: String, path: String, added: () => 1, removed: () => 0 }} />
		{/* @ts-expect-error: a list holds one row kind */}
		<List items={[1]} row={{ key: String, title: String }} meter={{ key: String, label: String, value: Number, max: Number }} />
		<List items={[1]} meter={{ key: String, label: String, value: Number, max: Number, meta: String }} />
		{/* @ts-expect-error: a list holds one row kind */}
		<List items={[1]} row={{ key: String, title: String }} definition={{ key: String, label: String }} />
		<List items={[1]} definition={{ key: String, label: String, value: String, copyable: true, description: String }} />
		{/* @ts-expect-error: a locked definition takes no description */}
		<List items={[1]} definition={{ key: String, label: String, locked: () => ({ reason: "x" }), description: String }} />
		{/* @ts-expect-error: closed channel */}
		<List items={[]} row={{ key: String, title: String }} className="x" />
		{/* @ts-expect-error: closed channel */}
		<List items={[]} row={{ key: String, title: String }} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<List items={[]} row={{ key: String, title: String }} class="x" />
		{/* @ts-expect-error: closed channel */}
		<List items={[]} row={{ key: String, title: String }} classList={{}} />
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
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={null} />
		<QueryBoundary query={{ data: 1, isPending: true, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={<List items={[]} loading row={{ key: String, title: String }} />} />
		{/* @ts-expect-error: a QueryBoundary names its loading form */}
		<QueryBoundary query={{ data: 1, isPending: true, isError: false, refetch: () => {} }} sentence="x" children={() => null} />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={null} className="x" />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={null} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={null} class="x" />
		{/* @ts-expect-error: closed channel */}
		<QueryBoundary query={{ data: 1, isPending: false, isError: false, refetch: () => {} }} sentence="x" children={() => null} loading={null} classList={{}} />
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
		<Prose markdown="x" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="x" classList={{}} />
		<Code text="x" />
		{/* @ts-expect-error: closed channel */}
		<Code text="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Code text="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Code text="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Code text="x" classList={{}} />
		<Diff label="x" hunks={[]} />
		{/* @ts-expect-error: closed channel */}
		<Diff label="x" hunks={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Diff label="x" hunks={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Diff label="x" hunks={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Diff label="x" hunks={[]} classList={{}} />
		<ProseDiff before="x" after="x" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="x" after="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="x" after="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="x" after="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="x" after="x" classList={{}} />
		<FileRow path="x" added={1} removed={1} />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="x" added={1} removed={1} className="x" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="x" added={1} removed={1} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="x" added={1} removed={1} class="x" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="x" added={1} removed={1} classList={{}} />
		<Comparison label="x" columns={["a"]} items={[]} row={{ key: String, label: String, values: () => [] }} />
		{/* @ts-expect-error: closed channel */}
		<Comparison label="x" columns={["a"]} items={[]} row={{ key: String, label: String, values: () => [] }} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Comparison label="x" columns={["a"]} items={[]} row={{ key: String, label: String, values: () => [] }} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Comparison label="x" columns={["a"]} items={[]} row={{ key: String, label: String, values: () => [] }} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Comparison label="x" columns={["a"]} items={[]} row={{ key: String, label: String, values: () => [] }} classList={{}} />
		<Rules rules={[]} />
		{/* @ts-expect-error: closed channel */}
		<Rules rules={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Rules rules={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Rules rules={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Rules rules={[]} classList={{}} />
		<BarChart label="x" items={[]} bar={{ key: String, label: String, value: Number }} />
		{/* @ts-expect-error: closed channel */}
		<BarChart label="x" items={[]} bar={{ key: String, label: String, value: Number }} className="x" />
		{/* @ts-expect-error: closed channel */}
		<BarChart label="x" items={[]} bar={{ key: String, label: String, value: Number }} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<BarChart label="x" items={[]} bar={{ key: String, label: String, value: Number }} class="x" />
		{/* @ts-expect-error: closed channel */}
		<BarChart label="x" items={[]} bar={{ key: String, label: String, value: Number }} classList={{}} />
		<Message author="you" body="x" />
		<Message author="system" body="x" detail={{ row: { title: "x", meta: ["y"] } }} />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="x" classList={{}} />
		<MessageInput value="x" onChange={() => {}} onSend={() => {}} />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="x" onChange={() => {}} onSend={() => {}} className="x" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="x" onChange={() => {}} onSend={() => {}} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="x" onChange={() => {}} onSend={() => {}} class="x" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="x" onChange={() => {}} onSend={() => {}} classList={{}} />
		<Meter label="x" value={1} max={2} />
		{/* @ts-expect-error: closed channel */}
		<Meter label="x" value={1} max={2} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="x" value={1} max={2} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Meter label="x" value={1} max={2} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="x" value={1} max={2} classList={{}} />
		<QrCode value="x" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="x" classList={{}} />
		<Stages steps={[{ label: "x", state: "done", at: "2026-09-14T09:12:00Z" }, { label: "y", state: "later" }]} ended={{ label: "x", reason: "y" }} />
		{/* @ts-expect-error: a later stage has no moment */}
		<Stages steps={[{ label: "x", state: "later", at: "2026-09-14T09:12:00Z" }]} />
		{/* @ts-expect-error: closed channel */}
		<Stages steps={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Stages steps={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Stages steps={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Stages steps={[]} classList={{}} />
		<Image src="x" alt="x" aspect={1} />
		<Image src="x" alt="x" fit="thumb" />
		{/* @ts-expect-error: a content picture has no box before its bytes without an aspect */}
		<Image src="x" alt="x" />
		{/* @ts-expect-error: a thumbnail is a square and takes no aspect */}
		<Image src="x" alt="x" fit="thumb" aspect={1} />
		{/* @ts-expect-error: closed channel */}
		<Image src="x" alt="x" aspect={1} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Image src="x" alt="x" aspect={1} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Image src="x" alt="x" aspect={1} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Image src="x" alt="x" aspect={1} classList={{}} />
		<StepCount at={1} of={3} />
		{/* @ts-expect-error: closed channel */}
		<StepCount at={1} of={3} className="x" />
		{/* @ts-expect-error: closed channel */}
		<StepCount at={1} of={3} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<StepCount at={1} of={3} class="x" />
		{/* @ts-expect-error: closed channel */}
		<StepCount at={1} of={3} classList={{}} />
		<AuthColumn product="x" title="x" />
		<AuthColumn product="x" step={{ at: 1, of: 2 }} title="x" sentence={["x", { strong: "y" }]} banner={<Banner sentence="x" />}>x</AuthColumn>
		{/* @ts-expect-error: a sentence is words or runs, never a node */}
		<AuthColumn product="x" title="x" sentence={<b />} />
		{/* @ts-expect-error: closed channel */}
		<AuthColumn product="x" title="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<AuthColumn product="x" title="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<AuthColumn product="x" title="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<AuthColumn product="x" title="x" classList={{}} />
		<Stats items={[{ label: "x", value: 1 }]} />
		<Stats items={[{ label: "x", value: 1, href: "/x" }, { label: "x", value: 1, counts: [{ label: "x", value: 1, href: "/x" }] }]} />
		{/* @ts-expect-error: a cell is a link or holds links, never both */}
		<Stats items={[{ label: "x", value: 1, href: "/x", counts: [{ label: "x", value: 1, href: "/x" }] }]} />
		{/* @ts-expect-error: closed channel */}
		<Stats items={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Stats items={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Stats items={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Stats items={[]} classList={{}} />
		<Stat label="x" value={1} />
		{/* @ts-expect-error: closed channel */}
		<Stat label="x" value={1} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Stat label="x" value={1} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Stat label="x" value={1} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Stat label="x" value={1} classList={{}} />
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }} />
		<Thread query={{ data: ["a"], isPending: false, isError: false, refetch: () => {} }} sentence="x" empty={{ sentence: "x" }} message={{ key: String, author: () => "system", body: String, onOpen: () => () => {} }} foot={null} />
		{/* @ts-expect-error: a thread takes a query or items, never both */}
		<Thread items={["a"]} query={{ data: ["a"], isPending: false, isError: false, refetch: () => {} }} sentence="x" empty={{ sentence: "x" }} message={{ key: String, author: () => "you", body: String }} />
		{/* @ts-expect-error: a thread's query names its failure and its empty form */}
		<Thread query={{ data: ["a"], isPending: false, isError: false, refetch: () => {} }} message={{ key: String, author: () => "you", body: String }} />
		{/* @ts-expect-error: a thread's messages are data, never children */}
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }}>x</Thread>
		{/* @ts-expect-error: closed channel */}
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Thread items={[]} message={{ key: String, author: () => "you", body: String }} classList={{}} />
		<Table columns={[]} items={[]} row={{ id: String }} />
		{/* @ts-expect-error: closed channel */}
		<Table columns={[]} items={[]} row={{ id: String }} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Table columns={[]} items={[]} row={{ id: String }} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Table columns={[]} items={[]} row={{ id: String }} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Table columns={[]} items={[]} row={{ id: String }} classList={{}} />
		{/* @ts-expect-error: onEdit requires onOpen */}
		<Table columns={[]} items={[]} row={{ id: String }} onEdit={() => {}} />
	</>
);
