import type { ReactNode } from "react";
import type { ShowcaseFrame } from "./cells.ts";
import { drawActionBar } from "./frames/action-bar.tsx";
import { drawAvatar } from "./frames/avatar.tsx";
import { drawBanner } from "./frames/banner.tsx";
import { drawBarChart } from "./frames/bar-chart.tsx";
import { drawButton } from "./frames/button.tsx";
import { drawCheckbox } from "./frames/checkbox.tsx";
import { drawChip } from "./frames/chip.tsx";
import { drawCode } from "./frames/code.tsx";
import { drawColumns } from "./frames/columns.tsx";
import { drawComparison } from "./frames/comparison.tsx";
import { drawCount } from "./frames/count.tsx";
import { drawDefinitionRow } from "./frames/definition-row.tsx";
import { drawDiff } from "./frames/diff.tsx";
import { drawEmptyState } from "./frames/empty-state.tsx";
import { drawFileInput } from "./frames/file-input.tsx";
import { drawFileRow } from "./frames/file-row.tsx";
import { drawForm } from "./frames/form.tsx";
import { drawFormField } from "./frames/form-field.tsx";
import { drawGroup } from "./frames/group.tsx";
import { drawIcon } from "./frames/icon.tsx";
import { drawIconButton } from "./frames/icon-button.tsx";
import { drawImage } from "./frames/image.tsx";
import { drawInput } from "./frames/input.tsx";
import { drawInputOtp } from "./frames/input-otp.tsx";
import { drawItemHeader } from "./frames/item-header.tsx";
import { drawLink } from "./frames/link.tsx";
import { drawList } from "./frames/list.tsx";
import { drawListRow } from "./frames/list-row.tsx";
import { drawMenu } from "./frames/menu.tsx";
import { drawMessage } from "./frames/message.tsx";
import { drawMessageInput } from "./frames/message-input.tsx";
import { drawMeter } from "./frames/meter.tsx";
import { drawOptionList } from "./frames/option-list.tsx";
import { drawPendingBar } from "./frames/pending-bar.tsx";
import { drawPicker } from "./frames/picker.tsx";
import { drawPlace } from "./frames/place.tsx";
import { drawProse } from "./frames/prose.tsx";
import { drawProseDiff } from "./frames/prose-diff.tsx";
import { drawQrCode } from "./frames/qr-code.tsx";
import { drawQueryBoundary } from "./frames/query-boundary.tsx";
import { drawRules } from "./frames/rules.tsx";
import { drawScreen } from "./frames/screen.tsx";
import { drawSection } from "./frames/section.tsx";
import { drawSegmentedControl } from "./frames/segmented-control.tsx";
import { drawSelect } from "./frames/select.tsx";
import { drawSheet } from "./frames/sheet.tsx";
import { drawShell } from "./frames/shell.tsx";
import { drawSlider } from "./frames/slider.tsx";
import { drawSpinner } from "./frames/spinner.tsx";
import { drawSplit } from "./frames/split.tsx";
import { drawStages } from "./frames/stages.tsx";
import { drawStat } from "./frames/stat.tsx";
import { drawStats } from "./frames/stats.tsx";
import { drawStatus } from "./frames/status.tsx";
import { drawStepCount } from "./frames/step-count.tsx";
import { drawSwitch } from "./frames/switch.tsx";
import { drawTable } from "./frames/table.tsx";
import { drawText } from "./frames/text.tsx";
import { drawTextArea } from "./frames/text-area.tsx";
import { drawThread } from "./frames/thread.tsx";
import { drawToast } from "./frames/toast.tsx";
import { drawToolbar } from "./frames/toolbar.tsx";

// A roster name to the function that draws its frames with the real
// component, one module per component under `./frames/`. A name missing
// here, or a draw that returns undefined for a cell, draws the frame with
// the component's name and the cell's strings.
export const registry: Partial<
	Record<string, (frame: ShowcaseFrame) => ReactNode | undefined>
> = {
	Text: drawText,
	Icon: drawIcon,
	Button: drawButton,
	IconButton: drawIconButton,
	Count: drawCount,
	Status: drawStatus,
	Chip: drawChip,
	Input: drawInput,
	TextArea: drawTextArea,
	InputOtp: drawInputOtp,
	FileInput: drawFileInput,
	Select: drawSelect,
	Slider: drawSlider,
	Switch: drawSwitch,
	Checkbox: drawCheckbox,
	Spinner: drawSpinner,
	Avatar: drawAvatar,
	Link: drawLink,
	Place: drawPlace,
	Screen: drawScreen,
	Split: drawSplit,
	Section: drawSection,
	Group: drawGroup,
	List: drawList,
	Columns: drawColumns,
	Form: drawForm,
	Toolbar: drawToolbar,
	ActionBar: drawActionBar,
	Shell: drawShell,
	ListRow: drawListRow,
	DefinitionRow: drawDefinitionRow,
	FormField: drawFormField,
	ItemHeader: drawItemHeader,
	SegmentedControl: drawSegmentedControl,
	Sheet: drawSheet,
	Picker: drawPicker,
	Menu: drawMenu,
	OptionList: drawOptionList,
	EmptyState: drawEmptyState,
	QueryBoundary: drawQueryBoundary,
	Toast: drawToast,
	Banner: drawBanner,
	PendingBar: drawPendingBar,
	Table: drawTable,
	Message: drawMessage,
	MessageInput: drawMessageInput,
	Thread: drawThread,
	Meter: drawMeter,
	Stages: drawStages,
	Stats: drawStats,
	Stat: drawStat,
	BarChart: drawBarChart,
	QrCode: drawQrCode,
	Image: drawImage,
	StepCount: drawStepCount,
	Prose: drawProse,
	Code: drawCode,
	Diff: drawDiff,
	ProseDiff: drawProseDiff,
	FileRow: drawFileRow,
	Comparison: drawComparison,
	Rules: drawRules,
};
