# Sidebar and scope switcher

The range a sidebar or a scope switcher is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

sidebar 205–245 (or a 45 icon rail); rows 26–36; body 12–13 + one 11–12 muted section label; radius 4–6; hairline edge only; selection grey fill; accent absent.

## References

Queries: `app sidebar with workspace switcher dropdown at the top and navigation links` · `left navigation sidebar with team or organization selector menu open showing list of workspaces` · `dark mode dashboard with collapsible sidebar navigation and project switcher`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/2679ae03-f852-47c3-a880-480c493c1369) | the densest, quietest sidebar: workspace name as a plain text-and-caret switcher, sections as 12px labels, team tree indented one icon | sidebar ≈ 235; row ≈ 28; body 13/400, section label 12/400 muted, workspace name 13/500; 2 type sizes; radius 4 on the selected row; sidebar separated from canvas by a hairline only; selection = light gray fill, no accent; accent absent (team icon color is the only chroma); ≈3.5 rows/100 px |
| Vercel | [screen](https://mobbin.com/screens/5bb75d66-7572-4f2e-a229-ebc54627343b) | dark shell where the team switcher is a top-left pill and the account menu is a full sidebar-width dropdown | sidebar ≈ 245; nav row ≈ 36; account menu ≈ 270 wide, item ≈ 38; body 13/400, name 13/500, email 12 muted; 3 sizes; radius 6; hairline `#333`-class separates sidebar and menu; selected "Projects" = surface-step fill; accent only on the status dot and the blue link; ≈2.8 rows/100 px |
| Height | [screen](https://mobbin.com/screens/6aa284f9-6ca0-4d37-888a-e0c4a6bf9196) | team as a bordered pill row ("SLMobbin + ⌄") that both scopes and expands the tree; tightest rows in the set | sidebar ≈ 205; row ≈ 26; body 12/400, team pill 12/500; 2 sizes; radius 6 on the pill, 4 on rows; hairline sidebar edge; no fill on hover visible; accent absent (orange only on project icons); ≈3.8 rows/100 px |
| Supabase | [screen](https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9) | scope lives in the top bar as org › project › branch breadcrumb switchers; the sidebar is a 45 px icon rail | icon rail ≈ 45; top bar ≈ 45; switcher text 12/400 with caret, badges FREE/PRODUCTION as 10/600 pills; radius 6 on Connect button, pill on badges; surface separation by hairline `#2e2e2e`-class; accent green on charts and Connect only; rail items ≈ 40 tall |
| GitBook | [screen](https://mobbin.com/screens/49527874-e5f9-4d86-b582-a2bfb263e17b) | workspace switcher opens a compact menu with a nested Theme submenu | sidebar ≈ 245; row ≈ 30; menu ≈ 195 wide, item ≈ 34, submenu ≈ 34; body 12/400, section label 11/400 muted; 2 sizes; radius 6 on menu and rows; menu lifted by shadow + hairline; selected theme = checkmark right; accent pink only on Upgrade; ≈3.3 rows/100 px |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, button 14/500, eyebrow 13/500; radius xs 4, sm 6, md 8, lg 12; hairline `#23252a`, strong `#34343a`; spacing 4/8/12/16/24/32/48. `vercel`: type body-sm 14/400, body-sm-strong 14/500, caption 12/400; radius xs 4, sm 6, md 8, lg 12; hairline `#ebebeb`, strong `#a1a1a1`; spacing 4/8/12/16/24/32; nav-bar height 64, form-input-sm 32. `supabase`: type button-md 14/500, caption 13/400, micro 12/400; radius xs 4, sm 6, md 8, lg 12; hairline `#dfdfdf`, cool `#ededed`; spacing 2/4/8/12/16/24/32.

The references span: sidebar 205–245 (Supabase collapses to a 45 rail); rows 26–36; body 12–13 with one 11–12 muted section label, no third size; radius 4–6; separation is a hairline everywhere, never a shadow, with dropdowns lifted by shadow + hairline; selection is a gray fill, accent never touches the sidebar.
