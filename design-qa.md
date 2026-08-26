**Comparison Target**

- Source visual truth: `/Users/taofangzheng/.codex/generated_images/019fefa1-ac64-7193-b881-752c03d9a07d/exec-6b8220e9-b531-42c6-9876-d1dcf74b3488.png`, the previously approved goal-progress UI direction.
- Implementation screenshots: `design-qa-overview-v11.png`, `design-qa-spaces.png`, `design-qa-resources.png`, and `design-qa-resource-preview.png`.
- Combined full-view evidence: `design-qa-v11-comparison.png`.
- Viewport: 1400 × 1200 browser viewport. `[data-testid="device-screen"]` measured 393 × 852 CSS px at scale 1.
- Source pixels: 852 × 1846, normalized to 393 × 852. Implementation captures: 393 × 852. Combined board: 786 × 852. Device scale factor: 1.
- State: overview with live relative campus items and primary-template progress; course list; publisher resource list; PDF resource preview.

**Full-view Comparison Evidence**

- The new overview preserves the approved product language: white and pale blue-gray surfaces, blue/teal semantic accents, bold dark navy hierarchy, light borders, soft elevation, rounded cards, and compact iPhone density.
- The overview intentionally changes information architecture rather than copying the goal page: campus agenda is primary and the existing goal template becomes one compact card. The visual hierarchy still reads as the same app.
- Course and resource pages use the same top safe-area treatment, fixed navigation pattern, control radii, card density, and type scale as the approved target.

**Focused-region Comparison Evidence**

- The combined board makes the approved target's branch cards and the implementation's reminder/template cards readable at the same 393 × 852 normalization.
- `design-qa-resources.png` verifies role badge, segmented control, resource category rhythm, retry state, and the fixed iPhone safe areas.
- `design-qa-resource-preview.png` verifies the real PDF asset, version selector, download affordance, offline control, associated-item card, and bottom-safe scrolling.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: system Chinese/iOS typography remains consistent with the existing app. Display headings, section labels, card titles, metadata, and status chips retain clear optical hierarchy without clipping or awkward wrapping.
- Spacing and layout rhythm: 18–20 px page margins, compact reminder cards, section gaps, 14–18 px radii, and subtle elevation remain coherent. The primary-template card stays above the home indicator and all full pages scroll independently beneath their fixed headers.
- Colors and visual tokens: existing navy, blue, teal, cyan, orange, and green tokens are reused consistently. Updated, overdue, pending, completed, failed, offline, and cancelled states remain distinguishable without overpowering the content.
- Image quality and asset fidelity: the course PDF and PNG are real local assets, sharp at the preview size, and not replaced by placeholder or CSS-drawn content. All interface icons come from the existing vector icon library.
- Copy and content: labels are concise and user-facing. No implementation notes, backend claims, push claims, or “学生端” development copy leak into the UI.
- Icons and controls: launcher, back, account, reminder-type, upload, retry, download, and file icons share one stroke language and remain aligned with their tap targets.
- Accessibility and resilience: controls use semantic buttons/links/labels, text inputs are labelled, state colors are paired with text, and the 393 × 852 iPhone screen has no overlapping header, sticky action, home indicator, or automatic keyboard.

**Interaction Checks**

- First load opens overview; function center, account, primary template, agenda, spaces, reminder details, resource preview, and all return paths were exercised.
- Today/7-day/all ranges, search, space/type/personal-state filters, cancelled history, and relative-date mock generation were checked.
- Read/confirm/complete actions were checked. The updated room reminder displays a field diff, invalidates version 1 confirmation, and accepts version 2 reconfirmation.
- Admin, publisher, and member views expose different publish/upload controls as specified.
- Invalid, duplicate, archived, and successful join-code states were checked.
- Resource categories, version switching, download link, offline toggle, upload failure/retry, duplicate upload handling, and associated reminder were checked.
- Browser console errors checked: none.
- Automated regression: 26 Playwright tests passed, including runtime, account, existing entry/scoring, and 6 new campus-workspace tests.

**Comparison History**

- Pass 1: the new screens showed no actionable P0/P1/P2 mismatch against the existing visual system. No visual correction iteration was required.

**Open Questions**

- None blocking this local clickable Demo. Multi-user synchronization, APNs, object storage, and backend permission enforcement remain intentionally outside V1.1.

**Implementation Checklist**

- Keep overview limited to campus items and one primary-template card.
- Keep campus storage independent from student/profile and template storage.
- Keep publisher/admin actions role-gated and member status personal.
- Preserve full-page campus routes and real local preview assets.

**Follow-up Polish**

- P3: if more than four overview items become necessary later, consider a compact “还有 N 项” footer rather than increasing above-the-fold card density.

final result: passed

## Function Center Sections QA — 2026-08-24

**Comparison Target**

- Source visual truth: `/Users/taofangzheng/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_rw99kooks8w512_abc5/temp/RWTemp/2026-08/10f845d94e40a7b69f1cc04036efaafa/544d74cd12205d581419a667642bb397.jpg`, used for its editable favorites card, four-column launcher density, and grouped feature hierarchy.
- Implementation screenshot: `design-qa-functions-phone-normalized.jpg`.
- Full-view comparison evidence: `design-qa-functions-comparison.jpg`.
- Focused common-functions comparison: `design-qa-functions-common-comparison.jpg`.
- Browser viewport: 732 × 1190 CSS px at device pixel ratio 2; the desktop H5 phone canvas measured 430 CSS px wide.
- Source pixels: 918 × 2048, normalized to 430 px width. The H5 phone capture was 230 × 610 after the desktop preview scaler and normalized to 430 × 1140. Combined evidence: 860 × 1190.
- State: function center with four default favorites and five expanded feature groups.

**Full-view Comparison Evidence**

- The reference hierarchy is present: a distinct editable `常用功能` card followed by a grouped all-functions surface.
- The implementation intentionally preserves the app-owned account and recent-target cards above the reference-inspired feature area.
- The grouped surface uses the requested `目标`, `我的经历`, `我的事项`, `乐湖升学`, and `其他` order with a consistent four-column grid.

**Focused-region Comparison Evidence**

- The common-functions comparison verifies the same title-left/edit-right header pattern and four equally spaced launchers.
- The implementation keeps the existing blue, teal, and cyan MiniIcon library instead of copying the finance app's black icon language.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing Chinese system font, navy section headings, compact launcher labels, and weight hierarchy remain consistent with the mini-program. Long labels fit without wrapping or clipping at four columns.
- Spacing and layout rhythm: common functions are isolated in a rounded card; grouped sections share one white surface with quiet dividers and sufficient vertical separation. Four-column launcher spacing matches the reference density without crowding the 430 px canvas.
- Colors and visual tokens: existing pale blue-gray background, white cards, navy copy, and blue/teal/cyan icon surfaces are preserved. Edit mode uses the established blue selection token and neutral selected state.
- Image quality and asset fidelity: all feature icons use the existing SVG MiniIcon assets; no placeholder, emoji, CSS-drawn icon, or generated raster replacement was introduced. The comparison board's mild softness comes from normalizing the scaled desktop H5 capture, not from the runtime icon assets.
- Copy and content: the visible group labels match the requested product language. Existing functionality appears once in its semantic group while favorites intentionally duplicate selected shortcuts.
- Accessibility and interaction: edit state is explicitly labelled `编辑`/`完成`; every editable tile exposes text state (`添加`, `已添加`, or `移除`) instead of relying on color alone.

**Interaction Checks**

- Entering and exiting favorite-edit mode was verified.
- Adding `案例库` to favorites, reloading the page, and confirming persistence was verified; the test change was then removed and the four defaults restored.
- A grouped `案例库` launcher was verified to navigate to the case library and return to the function center.
- Long-page rendering and all five section labels were checked in the 430 px H5 phone canvas.
- Browser console errors checked: none.
- TypeScript/project validation, H5 build, and WeChat mini-program build passed. The H5 build retained its existing bundle-size warnings only.

**Comparison History**

- Pass 1: the reference hierarchy and density were achieved without actionable P0/P1/P2 drift. No visual correction iteration was required.

**Follow-up Polish**

- P3: if the function set grows substantially, add a drag-to-reorder interaction for favorites after account-backed preference storage is designed.

final result: passed

## Native Case Library QA — 2026-08-21

**Comparison Target**

- Source homepage capture: `artifacts/case-library-source.png`.
- Native app capture: `artifacts/case-library-native.png`; normalized phone crop: `artifacts/case-library-native-phone.png`.
- Side-by-side evidence: `artifacts/case-library-comparison.png`, normalized to two 655 × 1222 panels.
- App visual baseline: the existing overview, feature-center, agenda, and class/course screens rather than the standalone site's red/pink brand shell.

**Findings**

- The source hierarchy is preserved: title, case/interview tabs, search, three filter groups, result count, real school logos, background data, offer direction, and contact access.
- The standalone site's brush title, red chips, pink surface, and sticky web CTA were replaced with the app's existing navy/blue/teal tokens, fixed native header, compact segmented control, cards, and phone-scoped bottom sheets.
- The case library is a pushed native workspace page. No iframe, WebView, external case-list route, or second home entry is present.
- School logos and both contact QR codes are real local source assets. No placeholder art, handcrafted SVG, or CSS-drawn logo is used.
- iPhone and Pixel 10 were both checked. Headers, search, filters, cards, bottom sheets, home indicator/navigation bar, and scrolling do not overlap or clip.
- No actionable P0, P1, or P2 visual finding remains.

**Interaction Checks**

- `概览` → `功能中心` → `全部功能` → `案例库` and the complete return path were exercised.
- Search was verified with `剑桥`, returning one case; the case opens a native detail page with the full background and admission fields.
- Season, college/major, and multi-select region filters were combined and correctly reduced the result set.
- Interviews render as native cards with explicit WeChat article links; links are not embedded in an iframe.
- The header contact action opens a phone-scoped sheet containing the two working source QR images.
- Automated regression: 31 Playwright tests passed, including the new native case-library search/detail/interview test.
- Runtime integrity and production build passed via `npm run build`.

final result: passed

## My Resume QA — 2026-08-21

**Comparison Target**

- Existing page capture before the change: `artifacts/resume-source-before.png`.
- Final implementation capture: `artifacts/resume-final.png`.
- Side-by-side evidence: `artifacts/resume-comparison.png`, with both 655 × 1222 iPhone preview states at the same scale.
- The source is used as the visual-system baseline; the changed information architecture, labels, module order, and default collapsed state follow the confirmed product requirements.

**Findings**

- The approved app language is preserved: the same iPhone frame, template header, three-tab carousel, page hero, target illustration, numbered connector, card radii, blue/teal accents, typography, and disclosure controls.
- `我的简历` replaces `综合竞争力` consistently in the tab, hero, overview progress label, data-entry assignment labels, archive editing, and template settings.
- The final page contains the six required modules in the confirmed order and all start collapsed. Compact summaries expose GPA/rank or record counts without policy status chips.
- Expanded education shows school, college, major, cohort, GPA, and rank only. No graduation date, graduation condition, qualification judgment, policy score, target threshold, or preparation advice appears in the resume.
- Skills and hobbies use labelled direct editors. Experience modules reuse existing records and open the exact full-archive record for view, edit, and delete.
- No actionable P0, P1, or P2 visual finding remains. The sixth module is intentionally below the initial viewport and remains reachable through the existing vertical scroll, matching the source page's density.

**Interaction Checks**

- Default collapsed state, education expansion, skills direct editing, unified `录入资料`, resume assignment/exclusion, experience sorting, focused archive navigation, and the return path were exercised.
- The current browser session produced no new console errors after a clean reload and the complete interaction pass.
- Runtime integrity and production build passed. The complete Playwright regression passed with 33/33 tests, including two dedicated resume tests.

final result: passed
