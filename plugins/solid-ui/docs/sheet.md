# Sheet

Slide-in panel from any edge. Built on Kobalte's Dialog primitive. Use for navigation, settings, or detail views that overlay the page.

```tsx
import { Sheet, createSheet, createConfirmSheet } from "@fcalell/plugin-solid-ui/components/sheet";
```

## Sub-components

### Sheet (Root)

Dialog root. Manages open/close state.

### Sheet.Trigger

Element that opens the sheet.

### Sheet.Close

Element that closes the sheet.

### Sheet.Content

Portal-rendered panel with overlay and close button. Slides in from the specified edge.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"top" \| "bottom" \| "left" \| "right"` | `"right"` | Slide-in direction |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Max width (for left/right) |
| `class` | `string` | -- | Additional Tailwind classes |

### Sheet.Header / Sheet.Footer / Sheet.Title / Sheet.Description

Same layout components as Dialog.

### Sheet.Provider

Context provider for imperative sheet management. Place at your app root to enable `createSheet` and `createConfirmSheet`.

```tsx
function App() {
  return (
    <Sheet.Provider>
      <Router />
    </Sheet.Provider>
  );
}
```

## Declarative usage

```tsx
<Sheet>
  <Sheet.Trigger as={Button}>Open sheet</Sheet.Trigger>
  <Sheet.Content position="right" size="md">
    <Sheet.Header>
      <Sheet.Title>Settings</Sheet.Title>
      <Sheet.Description>Manage your preferences.</Sheet.Description>
    </Sheet.Header>
    <p>Sheet body content.</p>
  </Sheet.Content>
</Sheet>
```

## Imperative usage: createSheet

Factory for promise-based sheets. Requires `<Sheet.Provider>` ancestor.

```ts
function createSheet<P = void, R = undefined>(
  render: (props: P, close: (result?: R) => void) => JSX.Element,
  options?: CreateSheetOptions,
): { open: (props: P) => Promise<R | undefined> }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `"top" \| "bottom" \| "left" \| "right"` | `"right"` | Slide-in direction |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Max width |
| `contentClass` | `string` | -- | Additional classes on content |
| `sheetProps` | `Partial<{ preventScroll, modal }>` | -- | Kobalte dialog root props |

```tsx
function MyComponent() {
  const editSheet = createSheet<Project, Project>((project, close) => (
    <>
      <Sheet.Header>
        <Sheet.Title>Edit {project.name}</Sheet.Title>
      </Sheet.Header>
      <ProjectForm
        project={project}
        onSave={(updated) => close(updated)}
        onCancel={() => close(undefined)}
      />
    </>
  ), { position: "right", size: "md" });

  const handleEdit = async (project: Project) => {
    const updated = await editSheet.open(project);
    if (updated) { /* handle result */ }
  };
}
```

## Presets

### createConfirmSheet

Simple yes/no confirmation in a sheet panel.

```ts
type ConfirmSheetProps = {
  title: string;
  description: string;
  confirmLabel?: string;   // default "Confirm"
  cancelLabel?: string;    // default "Cancel"
  variant?: "default" | "destructive";
};
```

```tsx
const confirm = createConfirmSheet({ position: "right" });

const ok = await confirm.open({
  title: "Delete project?",
  description: "This action cannot be undone.",
  confirmLabel: "Delete",
  variant: "destructive",
});
if (ok) { /* delete */ }
```
