# Vakil Setu web design

The interface helps people describe a legal concern, review a private summary, find an approved advocate, and request a consultation. Prioritize readable information and explicit actions. Do not imply legal validation, guaranteed connections, or language accuracy.

## Visual system

- Public Sans is the self-hosted Latin face. Existing Noto script fonts and Nirmala UI provide fallbacks. Use the same family for headings and controls.
- Light background `#fafbf9`, dark ink `#192f36`, teal primary `#346d65`, dividers `#dce3df`. White panels identify editable or independently actionable content.
- Headings use weight 600, normal upright text, and balanced wrapping. Display type is capped at 4.75rem. Non-English headings retain normal tracking and comfortable line height.
- Teal marks actions and selected navigation. Preserve distinct error and disabled states.
- Use spacing and thin rules for page structure. Cards belong to forms, advocate records, and task groups. Avoid decorative icon tiles, ornamental labels above headings, floating captions, and repeated call-to-action panels.
- The scales mark identifies the brand. It is not a hero illustration.

## Surfaces

- Homepage: translated concern heading and introduction, one primary intake link, advocate discovery link, preparation guidance, an ordered workflow, and sharing facts.
- Guide: a single reading column with ruled sections and clear pilot limits.
- Workspace overview: the account role's main action comes first; other tasks remain reachable.
- Header: brand, navigation, language selector, account control, and workspace link. Small screens use two rows and omit the brand tagline. Interactive targets are at least 44px high in the shared navigation.
- Translation quality: an expandable notice remains linked to the language selector with `aria-describedby`. Preserve the existing language fallback policy. English sections use explicit `lang="en-IN"` and `dir="ltr"`.

## Interaction

Keep visible keyboard focus, reduced-motion support, long-text wrapping, labeled fields, and loading/error/empty states. Use logical borders for the workspace sidebar. Preserve authentication, permissions, consent, and sharing behavior when refining presentation.

No generated illustration is required for the current pages. Imagery must provide useful context rather than fill an empty column.
