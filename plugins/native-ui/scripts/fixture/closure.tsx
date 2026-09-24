// The closure, proven at the type layer. Every roster component takes its
// legal props un-annotated, then each closed channel under @ts-expect-error,
// so a reopened prop turns into an unused directive and fails tsc --noEmit
// (check b7, and the package type-check itself, since scripts/ sits inside
// the tsconfig include).

import { Text } from "@fcalell/plugin-native-ui/components/text";
import { Icon } from "@fcalell/plugin-native-ui/components/icon";
import { Button } from "@fcalell/plugin-native-ui/components/button";
import { IconButton } from "@fcalell/plugin-native-ui/components/icon-button";
import { Count } from "@fcalell/plugin-native-ui/components/count";
import { Status } from "@fcalell/plugin-native-ui/components/status";
import { Input } from "@fcalell/plugin-native-ui/components/input";
import { TextArea } from "@fcalell/plugin-native-ui/components/text-area";
import { Slider } from "@fcalell/plugin-native-ui/components/slider";
import { Switch } from "@fcalell/plugin-native-ui/components/switch";
import { Checkbox } from "@fcalell/plugin-native-ui/components/checkbox";
import { Spinner } from "@fcalell/plugin-native-ui/components/spinner";
import { Avatar } from "@fcalell/plugin-native-ui/components/avatar";
import { Link } from "@fcalell/plugin-native-ui/components/link";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Screen } from "@fcalell/plugin-native-ui/components/screen";
import { Split } from "@fcalell/plugin-native-ui/components/split";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Group } from "@fcalell/plugin-native-ui/components/group";
import { List } from "@fcalell/plugin-native-ui/components/list";
import { Form } from "@fcalell/plugin-native-ui/components/form";
import { Toolbar } from "@fcalell/plugin-native-ui/components/toolbar";
import { ActionBar } from "@fcalell/plugin-native-ui/components/action-bar";
import { Columns } from "@fcalell/plugin-native-ui/components/columns";
import { Shell } from "@fcalell/plugin-native-ui/components/shell";
import { ListRow } from "@fcalell/plugin-native-ui/components/list-row";
import { DefinitionRow } from "@fcalell/plugin-native-ui/components/definition-row";
import { FormField } from "@fcalell/plugin-native-ui/components/form-field";
import { ItemHeader } from "@fcalell/plugin-native-ui/components/item-header";
import { SegmentedControl } from "@fcalell/plugin-native-ui/components/segmented-control";
import { Sheet } from "@fcalell/plugin-native-ui/components/sheet";
import { Picker } from "@fcalell/plugin-native-ui/components/picker";
import { OptionList } from "@fcalell/plugin-native-ui/components/option-list";
import { EmptyState } from "@fcalell/plugin-native-ui/components/empty-state";
import { Toast } from "@fcalell/plugin-native-ui/components/toast";
import { Banner } from "@fcalell/plugin-native-ui/components/banner";
import { PendingBar } from "@fcalell/plugin-native-ui/components/pending-bar";
import { Prose } from "@fcalell/plugin-native-ui/components/prose";
import { Code } from "@fcalell/plugin-native-ui/components/code";
import { Diff } from "@fcalell/plugin-native-ui/components/diff";
import { FileRow } from "@fcalell/plugin-native-ui/components/file-row";
import { ProseDiff } from "@fcalell/plugin-native-ui/components/prose-diff";
import { Comparison } from "@fcalell/plugin-native-ui/components/comparison";
import { Message } from "@fcalell/plugin-native-ui/components/message";
import { MessageInput } from "@fcalell/plugin-native-ui/components/message-input";
import { Meter } from "@fcalell/plugin-native-ui/components/meter";
import { BarChart } from "@fcalell/plugin-native-ui/components/bar-chart";
import { QrCode } from "@fcalell/plugin-native-ui/components/qr-code";

const noop = () => {};

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
		{/* @ts-expect-error: closed channel */}
		<Text role="body" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Text role="body" placeholderTextColorClassName="text-ink" />
		<Icon name="x" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Icon name="x" placeholderTextColorClassName="text-ink" />
		<Button label="a" onAct={noop} />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Button label="a" onAct={noop} placeholderTextColorClassName="text-ink" />
		<IconButton icon="x" label="a" onAct={noop} />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<IconButton icon="x" label="a" onAct={noop} placeholderTextColorClassName="text-ink" />
		<Count value={1} />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Count value={1} placeholderTextColorClassName="text-ink" />
		<Status state="active" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Status state="active" placeholderTextColorClassName="text-ink" />
		<Input value="" onChange={noop} />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Input value="" onChange={noop} placeholderTextColorClassName="text-ink" />
		<TextArea value="" onChange={noop} />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<TextArea value="" onChange={noop} placeholderTextColorClassName="text-ink" />
		<Slider label="a" value={1} onChange={noop} min={0} max={2} />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Slider label="a" value={1} onChange={noop} min={0} max={2} placeholderTextColorClassName="text-ink" />
		<Switch checked onChange={noop} label="a" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Switch checked onChange={noop} label="a" placeholderTextColorClassName="text-ink" />
		<Checkbox checked onChange={noop} label="a" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Checkbox checked onChange={noop} label="a" placeholderTextColorClassName="text-ink" />
		<Spinner />
		{/* @ts-expect-error: closed channel */}
		<Spinner className="x" />
		{/* @ts-expect-error: closed channel */}
		<Spinner style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Spinner class="x" />
		{/* @ts-expect-error: closed channel */}
		<Spinner classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Spinner colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Spinner selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Spinner placeholderTextColorClassName="text-ink" />
		<Avatar name="a" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Avatar name="a" placeholderTextColorClassName="text-ink" />
		<Link href="https://x" />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Link href="https://x" placeholderTextColorClassName="text-ink" />
		<Place title="a" />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Place title="a" placeholderTextColorClassName="text-ink" />
		<Screen title="a" back="/" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Screen title="a" back="/" placeholderTextColorClassName="text-ink" />
		<Split main={<Text />} />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Split main={<Text />} placeholderTextColorClassName="text-ink" />
		<Section title="a" />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Section title="a" placeholderTextColorClassName="text-ink" />
		<Group />
		{/* @ts-expect-error: closed channel */}
		<Group className="x" />
		{/* @ts-expect-error: closed channel */}
		<Group style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Group class="x" />
		{/* @ts-expect-error: closed channel */}
		<Group classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Group colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Group selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Group placeholderTextColorClassName="text-ink" />
		<List />
		{/* @ts-expect-error: closed channel */}
		<List className="x" />
		{/* @ts-expect-error: closed channel */}
		<List style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<List class="x" />
		{/* @ts-expect-error: closed channel */}
		<List classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<List colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<List selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<List placeholderTextColorClassName="text-ink" />
		<Form onSubmit={noop} />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Form onSubmit={noop} placeholderTextColorClassName="text-ink" />
		<Toolbar />
		{/* @ts-expect-error: closed channel */}
		<Toolbar className="x" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Toolbar class="x" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Toolbar colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Toolbar placeholderTextColorClassName="text-ink" />
		<ActionBar />
		{/* @ts-expect-error: closed channel */}
		<ActionBar className="x" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ActionBar class="x" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<ActionBar colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ActionBar placeholderTextColorClassName="text-ink" />
		<Columns />
		{/* @ts-expect-error: closed channel */}
		<Columns className="x" />
		{/* @ts-expect-error: closed channel */}
		<Columns style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Columns class="x" />
		{/* @ts-expect-error: closed channel */}
		<Columns classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Columns colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Columns selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Columns placeholderTextColorClassName="text-ink" />
		<Shell places={[]} />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Shell places={[]} placeholderTextColorClassName="text-ink" />
		<ListRow title="a" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ListRow title="a" placeholderTextColorClassName="text-ink" />
		<DefinitionRow label="a" value="b" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" className="x" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" class="x" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<DefinitionRow label="a" value="b" placeholderTextColorClassName="text-ink" />
		<FormField label="a" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<FormField label="a" placeholderTextColorClassName="text-ink" />
		<ItemHeader title="a" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ItemHeader title="a" placeholderTextColorClassName="text-ink" />
		<SegmentedControl options={[]} value="a" onChange={noop} />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<SegmentedControl options={[]} value="a" onChange={noop} placeholderTextColorClassName="text-ink" />
		<Sheet open onClose={noop} title="a" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Sheet open onClose={noop} title="a" placeholderTextColorClassName="text-ink" />
		<Picker label="a" options={[]} onChange={noop} />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Picker label="a" options={[]} onChange={noop} placeholderTextColorClassName="text-ink" />
		<OptionList options={[]} onChange={noop} />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<OptionList options={[]} onChange={noop} placeholderTextColorClassName="text-ink" />
		<EmptyState sentence="a" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<EmptyState sentence="a" placeholderTextColorClassName="text-ink" />
		<Toast sentence="a" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Toast sentence="a" placeholderTextColorClassName="text-ink" />
		<Banner sentence="a" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Banner sentence="a" placeholderTextColorClassName="text-ink" />
		<PendingBar sentence="a" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<PendingBar sentence="a" placeholderTextColorClassName="text-ink" />
		<Prose markdown="a" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Prose markdown="a" placeholderTextColorClassName="text-ink" />
		<Code text="a" />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Code text="a" placeholderTextColorClassName="text-ink" />
		<Diff hunks={[]} />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Diff hunks={[]} placeholderTextColorClassName="text-ink" />
		<FileRow path="a" added={1} removed={0} />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} className="x" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} class="x" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<FileRow path="a" added={1} removed={0} placeholderTextColorClassName="text-ink" />
		<ProseDiff before="a" after="b" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" className="x" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" class="x" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<ProseDiff before="a" after="b" placeholderTextColorClassName="text-ink" />
		<Comparison rows={[]} />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Comparison rows={[]} placeholderTextColorClassName="text-ink" />
		<Message author="you" body="a" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Message author="you" body="a" placeholderTextColorClassName="text-ink" />
		<MessageInput value="" onChange={noop} onSend={noop} />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} className="x" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} class="x" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<MessageInput value="" onChange={noop} onSend={noop} placeholderTextColorClassName="text-ink" />
		<Meter label="a" value={1} max={2} />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} className="x" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} class="x" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<Meter label="a" value={1} max={2} placeholderTextColorClassName="text-ink" />
		<BarChart series={[]} />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} className="x" />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} class="x" />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<BarChart series={[]} placeholderTextColorClassName="text-ink" />
		<QrCode value="a" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" className="x" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" style={{ flex: 1 }} />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" class="x" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" classList={{}} />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" colorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" selectionColorClassName="text-ink" />
		{/* @ts-expect-error: closed channel */}
		<QrCode value="a" placeholderTextColorClassName="text-ink" />
	</>
);
