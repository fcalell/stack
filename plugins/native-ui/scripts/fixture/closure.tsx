// The closure, proven at the type layer. Every exported component takes its
// legal props un-annotated, then className, style, its host's uniwind
// *ClassName channels and each dead prop under @ts-expect-error, so a
// reopened prop turns into an unused directive and fails tsc --noEmit (the
// b7 check, and the package type-check itself, since scripts/ sits inside
// the tsconfig include).

import { Avatar } from "@fcalell/plugin-native-ui/components/avatar";
import { AvatarStack } from "@fcalell/plugin-native-ui/components/avatar-stack";
import { Badge } from "@fcalell/plugin-native-ui/components/badge";
import { BottomSheet } from "@fcalell/plugin-native-ui/components/bottom-sheet";
import { Button } from "@fcalell/plugin-native-ui/components/button";
import { Card } from "@fcalell/plugin-native-ui/components/card";
import { Checkbox } from "@fcalell/plugin-native-ui/components/checkbox";
import { DefRow } from "@fcalell/plugin-native-ui/components/def-row";
import { Dialog } from "@fcalell/plugin-native-ui/components/dialog";
import { Field } from "@fcalell/plugin-native-ui/components/field";
import { FilterChip } from "@fcalell/plugin-native-ui/components/filter-chip";
import { Footbar } from "@fcalell/plugin-native-ui/components/footbar";
import { Input } from "@fcalell/plugin-native-ui/components/input";
import { NavBar } from "@fcalell/plugin-native-ui/components/nav-bar";
import { Pair } from "@fcalell/plugin-native-ui/components/pair";
import { ProgressBar } from "@fcalell/plugin-native-ui/components/progress-bar";
import { Row } from "@fcalell/plugin-native-ui/components/row";
import { RowItem } from "@fcalell/plugin-native-ui/components/row-item";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Segmented } from "@fcalell/plugin-native-ui/components/segmented";
import { Separator } from "@fcalell/plugin-native-ui/components/separator";
import { Skeleton } from "@fcalell/plugin-native-ui/components/skeleton";
import { Spinner } from "@fcalell/plugin-native-ui/components/spinner";
import { Stack } from "@fcalell/plugin-native-ui/components/stack";
import { Stepper } from "@fcalell/plugin-native-ui/components/stepper";
import { TabBar } from "@fcalell/plugin-native-ui/components/tab-bar";
import { Text } from "@fcalell/plugin-native-ui/components/text";
import { Textarea } from "@fcalell/plugin-native-ui/components/textarea";
import { Toast } from "@fcalell/plugin-native-ui/components/toast";
import { Toggle } from "@fcalell/plugin-native-ui/components/toggle";
import type { Action } from "@fcalell/ui-core/descriptors";
import { CircleAlert } from "lucide-react-native";
import type { ComponentProps } from "react";

const noop = () => {};
const confirm: Action<never> = { label: "Conferma", onSelect: noop };
const badAction: Action<never> = {
	...confirm,
	// @ts-expect-error Action<never> keeps the icon field unpassable until M7
	icon: CircleAlert,
};
// A props object rather than a JSX attribute: biome's react domain bans the
// JSX spelling (noChildrenProp), and the excess-property error is the same.
const deadDialogChildren: ComponentProps<typeof Dialog> = {
	visible: true,
	onClose: noop,
	title: "t",
	// @ts-expect-error the actions region is Action data, not children
	children: <Button>x</Button>,
};

export function closure() {
	return (
		<>
			<Avatar initials="AB" size={40} tint="navy" />
			<Avatar
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Avatar
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<AvatarStack>
				<Avatar />
			</AvatarStack>
			<AvatarStack
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<AvatarStack
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Badge tone="ok">Pagato</Badge>
			<Badge
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Badge
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<BottomSheet snapPoints={["50%"]} onDismiss={noop}>
				<Text>contenuto</Text>
			</BottomSheet>
			<BottomSheet
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<BottomSheet
				// @ts-expect-error gorhom's style prop is closed
				style={{ width: 1 }}
			/>
			<BottomSheet
				// @ts-expect-error gorhom's backgroundStyle is closed
				backgroundStyle={{ backgroundColor: "red" }}
			/>
			<BottomSheet
				// @ts-expect-error gorhom's handleStyle is closed
				handleStyle={{ backgroundColor: "red" }}
			/>
			<BottomSheet
				// @ts-expect-error gorhom's handleIndicatorStyle is closed
				handleIndicatorStyle={{ backgroundColor: "red" }}
			/>
			<BottomSheet
				// @ts-expect-error gorhom's containerStyle is closed
				containerStyle={{ backgroundColor: "red" }}
			/>
			<BottomSheet
				// @ts-expect-error the backgroundComponent takeover slot is closed
				backgroundComponent={null}
			/>
			<BottomSheet
				// @ts-expect-error the handleComponent takeover slot is closed
				handleComponent={null}
			/>
			{/* These three carry no `| null` in gorhom's type, so the probe value
			    must be a component that would be LEGAL if the prop reopened, or
			    the directive never turns unused. */}
			<BottomSheet
				// @ts-expect-error the backdropComponent takeover slot is closed
				backdropComponent={() => null}
			/>
			<BottomSheet
				// @ts-expect-error the footerComponent takeover slot is closed
				footerComponent={() => null}
			/>
			<BottomSheet
				// @ts-expect-error the containerComponent takeover slot is closed
				containerComponent={() => null}
			/>
			<Button emphasis="secondary" tone="danger" size="lg" loading>
				Elimina
			</Button>
			<Button
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Button
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Card padding="none" ring="warn" />
			<Card
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Card
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Checkbox checked onChange={noop} disabled />
			<Checkbox
				checked
				onChange={noop}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Checkbox
				checked
				onChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Checkbox
				checked
				onChange={noop}
				// @ts-expect-error the icon override is deleted: the tick is anatomy
				icon={<CircleAlert />}
			/>
			<Checkbox
				checked
				onChange={noop}
				// @ts-expect-error the handler is onChange (canon law 1)
				onCheckedChange={noop}
			/>
			<DefRow label="Rotta">12 nm</DefRow>
			<DefRow
				label="Rotta"
				// @ts-expect-error the className prop is closed
				className="x"
			>
				x
			</DefRow>
			<DefRow
				label="Rotta"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			>
				x
			</DefRow>
			<Dialog
				visible
				onClose={noop}
				title="Eliminare?"
				description="Non si torna indietro."
				icon={CircleAlert}
				tone="danger"
				primary={confirm}
				secondary={{ label: "Annulla", onSelect: noop, loading: true }}
			/>
			<Dialog
				visible
				onClose={noop}
				title="t"
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Dialog
				visible
				onClose={noop}
				title="t"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Dialog
				visible
				onClose={noop}
				title="t"
				// @ts-expect-error the icon is a component param, not an element
				icon={<CircleAlert />}
			/>
			<Field>
				<Field.Label>Nome</Field.Label>
				<Field.Description>Come sul documento.</Field.Description>
				<Field.Error>Obbligatorio</Field.Error>
			</Field>
			<Field
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Field
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Field.Label
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Field.Label
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Field.Label
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<Field.Description
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Field.Description
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Field.Description
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<Field.Error
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Field.Error
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Field.Error
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<FilterChip label="Tutti" active icon={CircleAlert} onPress={noop} />
			<FilterChip
				label="Tutti"
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<FilterChip
				label="Tutti"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<FilterChip
				label="Tutti"
				// @ts-expect-error the leading slot collapsed to the icon param
				leading={<CircleAlert />}
			/>
			<FilterChip
				label="Tutti"
				// @ts-expect-error the icon is a component param, not an element
				icon={<CircleAlert />}
			/>
			<Footbar>
				<Button onPress={noop}>Avanti</Button>
			</Footbar>
			<Footbar
				// @ts-expect-error the className prop is closed
				className="x"
			>
				x
			</Footbar>
			<Footbar
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			>
				x
			</Footbar>
			<Input placeholder="Nome" state="error" onChangeText={noop} />
			<Input
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Input
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Input
				// @ts-expect-error uniwind's placeholder channel is closed
				placeholderTextColorClassName="text-ink-1"
			/>
			<Input
				// @ts-expect-error uniwind's cursor channel is closed
				cursorColorClassName="text-ink-1"
			/>
			<Input
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<Input
				// @ts-expect-error uniwind's selection-handle channel is closed
				selectionHandleColorClassName="text-ink-1"
			/>
			<Input
				// @ts-expect-error uniwind's android-underline channel is closed
				underlineColorAndroidClassName="text-ink-1"
			/>
			<NavBar
				title="Rotta"
				onBack={noop}
				backVariant="close"
				action={{ label: "Salva", onSelect: noop, loading: true }}
				center
			/>
			<NavBar
				title="t"
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<NavBar
				title="t"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<NavBar
				title="t"
				// @ts-expect-error the leading slot collapsed to onBack
				leading={<Button>x</Button>}
			/>
			<NavBar
				title="t"
				// @ts-expect-error the trailing slot collapsed to the action
				trailing={<Button>x</Button>}
			/>
			<Pair row>
				<Text>Etichetta</Text>
			</Pair>
			<Pair
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Pair
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<ProgressBar value={0.5} />
			<ProgressBar
				value={0.5}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<ProgressBar
				value={0.5}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Row>
				<Text>a</Text>
			</Row>
			<Row
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Row
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<RowItem
				label="Diesel"
				description="Serbatoio pieno"
				icon={CircleAlert}
				value="42 L"
				badge={{ label: "Ok", tone: "ok" }}
				chevron
				onPress={noop}
			/>
			<RowItem
				label="t"
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<RowItem
				label="t"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<RowItem
				label="t"
				// @ts-expect-error the leading slot collapsed to the icon param
				leading={<CircleAlert />}
			/>
			<RowItem
				label="t"
				// @ts-expect-error the trailing slot collapsed to value/badge/chevron
				trailing={<CircleAlert />}
			/>
			<RowItem
				label="t"
				// @ts-expect-error the icon is a component param, not an element
				icon={<CircleAlert />}
			/>
			<Section>
				<Card />
			</Section>
			<Section
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Section
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Segmented
				options={[{ value: "a", label: "A" }]}
				value="a"
				onValueChange={noop}
			/>
			<Segmented
				options={[{ value: "a", label: "A" }]}
				value="a"
				onValueChange={noop}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Segmented
				options={[{ value: "a", label: "A" }]}
				value="a"
				onValueChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Separator orientation="vertical" />
			<Separator
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Separator
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Skeleton width={120} height={16} />
			<Skeleton
				// @ts-expect-error className was the sizing API; width/height replace it
				className="h-4 w-32"
			/>
			<Skeleton
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Spinner tone="accent-ink" size="large" />
			<Spinner
				// @ts-expect-error the arbitrary color prop collapsed to tone
				color="#fff"
			/>
			<Spinner
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Spinner
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Spinner
				// @ts-expect-error uniwind's colorClassName channel is closed
				colorClassName="text-ink-1"
			/>
			<Stack>
				<Card />
			</Stack>
			<Stack
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Stack
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Stepper value={2} onChange={noop} min={0} max={8} />
			<Stepper
				value={2}
				onChange={noop}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Stepper
				value={2}
				onChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<TabBar
				tabs={[{ key: "oggi", label: "Oggi", icon: CircleAlert }]}
				active="oggi"
				onChange={noop}
			/>
			<TabBar
				tabs={[]}
				active="a"
				onChange={noop}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<TabBar
				tabs={[]}
				active="a"
				onChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<TabBar
				// @ts-expect-error the icon render prop collapsed to the icon param
				tabs={[{ key: "a", label: "A", icon: (_active: boolean) => null }]}
				active="a"
				onChange={noop}
			/>
			<Text variant="h3" tone="ink-2" strong mono>
				12 kn
			</Text>
			<Text
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Text
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Text
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<Textarea placeholder="Note" state="focused" />
			<Textarea
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Textarea
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Textarea
				// @ts-expect-error uniwind's placeholder channel is closed
				placeholderTextColorClassName="text-ink-1"
			/>
			<Textarea
				// @ts-expect-error uniwind's cursor channel is closed
				cursorColorClassName="text-ink-1"
			/>
			<Textarea
				// @ts-expect-error uniwind's selection channel is closed
				selectionColorClassName="text-ink-1"
			/>
			<Textarea
				// @ts-expect-error uniwind's selection-handle channel is closed
				selectionHandleColorClassName="text-ink-1"
			/>
			<Textarea
				// @ts-expect-error uniwind's android-underline channel is closed
				underlineColorAndroidClassName="text-ink-1"
			/>
			<Toast message="Salvato" tone="ok" />
			<Toast
				message="x"
				// @ts-expect-error the axis is tone (decision 25)
				variant="success"
			/>
			<Toast
				message="x"
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Toast
				message="x"
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Toggle checked onChange={noop} disabled />
			<Toggle
				checked
				onChange={noop}
				// @ts-expect-error the className prop is closed
				className="x"
			/>
			<Toggle
				checked
				onChange={noop}
				// @ts-expect-error the style prop is closed
				style={{ width: 1 }}
			/>
			<Toggle
				checked
				onChange={noop}
				// @ts-expect-error the handler is onChange (canon law 1)
				onValueChange={noop}
			/>
		</>
	);
}

export const carried = [badAction, deadDialogChildren];
