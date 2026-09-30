// The closure, proven at the type layer. Every component takes its legal
// props un-annotated, then each closed channel under @ts-expect-error, so a
// reopened prop turns into an unused directive and fails tsc --noEmit (check
// b7, and the package type-check itself, since scripts/ sits inside the
// tsconfig include).

import { Avatar } from "@fcalell/plugin-react-ui/components/avatar";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Checkbox } from "@fcalell/plugin-react-ui/components/checkbox";
import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { Count } from "@fcalell/plugin-react-ui/components/count";
import { Icon } from "@fcalell/plugin-react-ui/components/icon";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import { Link } from "@fcalell/plugin-react-ui/components/link";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Spinner } from "@fcalell/plugin-react-ui/components/spinner";
import { Status } from "@fcalell/plugin-react-ui/components/status";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { TextArea } from "@fcalell/plugin-react-ui/components/text-area";

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
	</>
);
