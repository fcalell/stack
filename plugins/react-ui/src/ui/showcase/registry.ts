import type { ReactNode } from "react";
import type { ShowcaseFrame } from "./cells.ts";
import { drawActionBar } from "./frames/action-bar.tsx";
import { drawAvatar } from "./frames/avatar.tsx";
import { drawButton } from "./frames/button.tsx";
import { drawCheckbox } from "./frames/checkbox.tsx";
import { drawChip } from "./frames/chip.tsx";
import { drawColumns } from "./frames/columns.tsx";
import { drawCount } from "./frames/count.tsx";
import { drawForm } from "./frames/form.tsx";
import { drawGroup } from "./frames/group.tsx";
import { drawIcon } from "./frames/icon.tsx";
import { drawIconButton } from "./frames/icon-button.tsx";
import { drawInput } from "./frames/input.tsx";
import { drawInputOtp } from "./frames/input-otp.tsx";
import { drawLink } from "./frames/link.tsx";
import { drawList } from "./frames/list.tsx";
import { drawPlace } from "./frames/place.tsx";
import { drawScreen } from "./frames/screen.tsx";
import { drawSection } from "./frames/section.tsx";
import { drawSelect } from "./frames/select.tsx";
import { drawShell } from "./frames/shell.tsx";
import { drawSlider } from "./frames/slider.tsx";
import { drawSpinner } from "./frames/spinner.tsx";
import { drawSplit } from "./frames/split.tsx";
import { drawStatus } from "./frames/status.tsx";
import { drawSwitch } from "./frames/switch.tsx";
import { drawText } from "./frames/text.tsx";
import { drawTextArea } from "./frames/text-area.tsx";
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
};
