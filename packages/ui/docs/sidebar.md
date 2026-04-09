# Sidebar

Collapsible sidebar layout with responsive mobile sheet, keyboard shortcut (Cmd/Ctrl+B), and icon-only mode. Extensive compound API for menus, groups, and actions.

```tsx
import { Sidebar, useSidebar } from "@fcalell/ui/components/sidebar";
```

## Key sub-components

| Sub-component | Description |
|---------------|-------------|
| `Sidebar.Provider` | Context provider. Sets sidebar width CSS variables. Wrap your layout |
| `Sidebar` (Root) | The sidebar panel. Props: `side`, `variant`, `collapsible` |
| `Sidebar.Trigger` | Toggle button (ghost icon button) |
| `Sidebar.Rail` | Invisible drag/click rail on the edge |
| `Sidebar.Inset` | Main content area next to the sidebar |
| `Sidebar.Header` / `Sidebar.Footer` | Top/bottom sections |
| `Sidebar.Content` | Scrollable body |
| `Sidebar.Separator` | Horizontal divider |
| `Sidebar.Input` | Search input |
| `Sidebar.Group` | Section group |
| `Sidebar.GroupLabel` | Group heading (polymorphic) |
| `Sidebar.GroupAction` | Action button in the group header |
| `Sidebar.GroupContent` | Group body |
| `Sidebar.Menu` | Menu list (`<ul>`) |
| `Sidebar.MenuItem` | Menu item (`<li>`) |
| `Sidebar.MenuButton` | Interactive menu button with tooltip in collapsed mode |
| `Sidebar.MenuAction` | Hover-reveal action button |
| `Sidebar.MenuBadge` | Counter badge |
| `Sidebar.MenuLoader` | Loading state with scramble animation |
| `Sidebar.MenuSub` | Nested sub-menu |
| `Sidebar.MenuSubItem` | Sub-menu item |
| `Sidebar.MenuSubButton` | Sub-menu interactive button (polymorphic, defaults to `<a>`) |

## Basic usage

```tsx
<Sidebar.Provider>
  <Sidebar side="left" collapsible="icon">
    <Sidebar.Header>
      <Logo icon={<AppIcon />} text="My App" />
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltip="Dashboard" isActive>
                <LayoutDashboard /> <span>Dashboard</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
  </Sidebar>
  <Sidebar.Inset>
    <main>Page content</main>
  </Sidebar.Inset>
</Sidebar.Provider>
```

## Hooks

- `useSidebar()` — returns `{ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }`
- `useIsMobile()` — returns a signal for `< 768px` viewport
