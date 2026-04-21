# Dialog

Modal dialog overlay. Built on Kobalte's Dialog primitive for focus trapping, backdrop click-to-close, and Escape key handling.

```tsx
import { Dialog, createDialog, createConfirmDialog, createConfirmByNameDialog } from "@fcalell/plugin-solid-ui/components/dialog";
```

## Sub-components

### Dialog (Root)

Manages open/close state. Uncontrolled by default; pass `open`/`onOpenChange` for controlled.

### Dialog.Trigger

Element that opens the dialog. Renders as the child element.

### Dialog.Content

Portal-rendered modal with overlay, close button, and entry/exit animations.

| Prop | Type | Description |
|------|------|-------------|
| `class` | `string` | Additional Tailwind classes |
| `children` | `JSX.Element` | Dialog body |

### Dialog.Header

Flex column for title + description. Centered on mobile, left-aligned on sm+.

### Dialog.Footer

Action buttons area. Column on mobile, row on sm+.

### Dialog.Title

Renders `<h2>` via Kobalte. Semibold, tight tracking.

### Dialog.Description

Muted secondary text.

### Dialog.Provider

Context provider for imperative dialog management. Place at your app root to enable `createDialog`, `createConfirmDialog`, and `createConfirmByNameDialog`.

```tsx
function App() {
  return (
    <Dialog.Provider>
      <Router />
    </Dialog.Provider>
  );
}
```

## Declarative usage

```tsx
<Dialog>
  <Dialog.Trigger as={Button}>Open dialog</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm action</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

## Imperative usage: createDialog

Factory for promise-based dialogs. Requires `<Dialog.Provider>` ancestor.

```ts
function createDialog<P = void, R = undefined>(
  render: (props: P, close: (result?: R) => void) => JSX.Element,
  options?: CreateDialogOptions,
): { open: (props: P) => Promise<R | undefined> }
```

| Option | Type | Description |
|--------|------|-------------|
| `contentClass` | `string` | Additional classes on `Dialog.Content` |
| `dialogProps` | `Partial<{ preventScroll, modal }>` | Kobalte dialog root props |

The render function receives the open props and a `close` callback. Call `close(result)` to resolve the promise. Backdrop click or Escape resolves with `undefined`. Exit animations play before the promise resolves.

Dialogs auto-mount via the provider -- no manual `<Component />` rendering needed. They auto-cleanup when the owning component unmounts.

```tsx
function MyComponent() {
  const editDialog = createDialog<Project, Project>((project, close) => (
    <>
      <Dialog.Header>
        <Dialog.Title>Edit {project.name}</Dialog.Title>
      </Dialog.Header>
      <ProjectForm
        project={project}
        onSave={(updated) => close(updated)}
        onCancel={() => close(undefined)}
      />
    </>
  ));

  const handleEdit = async (project: Project) => {
    const updated = await editDialog.open(project);
    if (updated) { /* handle result */ }
  };
}
```

## Presets

### createConfirmDialog

Simple yes/no confirmation.

```ts
type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;   // default "Confirm"
  cancelLabel?: string;    // default "Cancel"
  variant?: "default" | "destructive";
};
```

```tsx
const confirm = createConfirmDialog();

const ok = await confirm.open({
  title: "Delete project?",
  description: "This action cannot be undone.",
  confirmLabel: "Delete",
  variant: "destructive",
});
if (ok) { /* delete */ }
```

### createConfirmByNameDialog

Type-name-to-confirm for destructive actions.

```ts
type ConfirmByNameProps = {
  name: string;
  title: string;
  description: string;
  actionLabel: string;
};
```

```tsx
const confirmByName = createConfirmByNameDialog();

const confirmed = await confirmByName.open({
  name: "my-project",
  title: "Delete project",
  description: "This will permanently delete the project and all its data.",
  actionLabel: "Delete project",
});
if (confirmed) { /* delete */ }
```
