import type { ReactNode } from "react";
import type { ShowcaseFrame } from "./cells.ts";
import { drawAvatar } from "./frames/avatar.tsx";
import { drawButton } from "./frames/button.tsx";
import { drawCheckbox } from "./frames/checkbox.tsx";
import { drawChip } from "./frames/chip.tsx";
import { drawCount } from "./frames/count.tsx";
import { drawIcon } from "./frames/icon.tsx";
import { drawIconButton } from "./frames/icon-button.tsx";
import { drawInput } from "./frames/input.tsx";
import { drawInputOtp } from "./frames/input-otp.tsx";
import { drawLink } from "./frames/link.tsx";
import { drawSelect } from "./frames/select.tsx";
import { drawSlider } from "./frames/slider.tsx";
import { drawSpinner } from "./frames/spinner.tsx";
import { drawStatus } from "./frames/status.tsx";
import { drawSwitch } from "./frames/switch.tsx";
import { drawText } from "./frames/text.tsx";
import { drawTextArea } from "./frames/text-area.tsx";

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
};
