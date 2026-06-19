# AbundanceAI — MVP UI Build Specification

**Audience:** Frontend engineer / Claude Code
**Purpose:** A complete, build-ready UI blueprint for the AbundanceAI MVP. This document is self-contained: it specifies every screen, component, state, token, route, and flow needed to build the frontend without further UX decisions.
**Platform target:** Mobile-first responsive web app (PWA-style). Primary frame **390 × 844**. No native app in MVP.
**Scope discipline:** MVP features only. Anything labeled Phase 2 / Phase 3 in the PRD is out of scope and must NOT be built, but the data model and matching logic must be structured so it ports cleanly later (see §7).

---

## 0. Build Assumptions (resolved — do not re-decide)

These are fixed decisions. Build to them exactly.

| ID | Decision |
|----|----------|
| A1 | **Single user role** — the Expert. No admin UI ships in-app. Ops happen in back-office tools outside this build. |
| A2 | Program content is hosted **inside AbundanceAI**. The public sales page is Phase 2 — MVP users share a Stripe payment link + a Google Meet link. |
| A3 | Peer matching is **manual**, but captured as structured data (category, level, fear pattern) so a future engine can ingest it. The app only displays match status + results. |
| A4 | Mindset coaching = curated prompt + Gemini response, with **session caps (3 / week)** and cached common responses. Not open-ended chat. |
| A5 | Mobile-first responsive web (PWA-style). Desktop is a centered, widened version of the same layouts. |
| A6 | Payments: AbundanceAI never processes the user's client money. **Stripe handles the $25 sign-up**; users connect their *own* Stripe to receive client payments later. |
| A7 | Live sessions and peer meetings run on **Google Meet** (free). Peer chat runs on **WhatsApp** (external deep links). |

---

## 1. Application Structure

### 1.1 User Roles

| Role | Description | Sees |
|------|-------------|------|
| **Visitor** | Unauthenticated. Arrives from a 250K-email blast. | Landing page, Checkout, Create Account only. |
| **Member (Expert)** | Authenticated, paid the $25. The only in-app role. | Full app: Home, Program, Mindset, Circle, Account. |

There is no admin, no moderator, no multi-tenant role in the MVP. Route guards only need to distinguish **authenticated vs not**.

### 1.2 Navigation Structure

- **Acquisition screens** (Landing, Checkout, Create Account): **no tab bar**, no app chrome. Standalone, conversion-focused.
- **App shell** (post-purchase): a persistent **bottom tab bar** with 4 tabs. Account lives behind the **top-right avatar**, not in the tab bar.
- **Onboarding** (Pillar 1 — Choose Path → Add Content → Building → Program → Marketing → Live Sessions → Get Paid): a **linear, resumable stepper** launched from the Home "next best step" card. Each step is non-blocking — the user can stop after the WOW and resume later from Home.

**Bottom tab bar (4 tabs):**

| Tab | Icon | Route | Purpose |
|-----|------|-------|---------|
| Home | ⌂ | `/app` | The hub — progress + next best step. |
| Program | ▦ | `/app/program` | The built program (modules). |
| Mindset | ♡ | `/app/mindset` | Check-ins + fear-library support. |
| Circle | ◎ | `/app/circle` | Peer circle + weekly expert talk. |

**Account** (◔) is reached via the avatar in the top bar → `/app/account`.

### 1.3 Route Map

```
PUBLIC (no auth, no tab bar)
  /                       Landing Page                     [01]
  /checkout               Checkout ($25, Stripe)           [02]
  /welcome                Welcome / Create Account         [03]   (post-payment only; requires payment token)

APP (auth required, app shell + bottom tab bar)
  /app                    Journey Home                     [04]
  /app/account            Account & Guarantee              [14]

ONBOARDING (auth required; linear stepper, launched from Home)
  /app/onboarding/path        Choose Your Path             [05]
  /app/onboarding/content     Add Your Content             [06]
  /app/onboarding/building    Building Your Program        [07]   (transient; auto-advances)
  /app/program                Your Program (WOW)           [08]   (also the Program tab destination)
  /app/onboarding/marketing   Marketing Kit                [09]
  /app/onboarding/sessions    Set Up Live Sessions         [10]   (Type A only)
  /app/onboarding/payments    Get Paid (Stripe)            [11]   (surfaces wk 3–4)

PILLAR TABS (auth required)
  /app/mindset            Mindset Check-In / hub           [12]
  /app/circle             Your Circle                      [13]
```

**Notes**
- `/welcome` is only reachable with a valid post-payment token; deep-linking without it redirects to `/`.
- `/app/program` is both onboarding step 08 and the permanent Program tab. Before a program exists it shows the empty state (warm CTA), not a blank dashboard.
- Onboarding steps are addressable individually so Home can deep-link to the exact resume point.

### 1.4 Information Architecture

```
AbundanceAI
├── Acquisition (Visitor)
│   ├── Landing Page ........ video, message, testimonials, pillars, CTA
│   ├── Checkout ............ $25 + 90-day guarantee + Stripe element
│   └── Create Account ...... name, email, password
│
└── App (Member)
    ├── Home (hub) .......... next-best-step, progress trail, check-in card, "what you have" chips
    ├── Program (Pillar 1)
    │   ├── Choose Path (A/B)
    │   ├── Add Content (upload / record)
    │   ├── Building (loading)
    │   ├── Your Program (modules — WOW)
    │   ├── Marketing Kit (posts / email)
    │   ├── Live Sessions (Meet link — Type A)
    │   └── Get Paid (Stripe connect)
    ├── Mindset (Pillar 2) ... proactive check-in, fear library, reflection, leadership clip
    ├── Circle (Pillar 3) .... peer members, WhatsApp/Meet links, weekly expert talk
    └── Account ............. profile, settings, 90-day refund, sign out
```

---

## 2. Design System

> **Brand law:** Warm, human, never corporate. Nothing should read like a SaaS dashboard. Apply the **65 / 25 / 8 / 2** color discipline — mostly warm whites and text (65%), warm surfaces (25%), primary terracotta sparingly (8%), growth-green accent rarely (2%). **No gradients.**

### 2.1 Colors

Define as CSS custom properties / Tailwind theme tokens.

| Token | Hex | Role |
|-------|-----|------|
| `--color-primary` | `#B5532A` | Terracotta — primary actions, key emphasis |
| `--color-primary-hover` | `#E08A3C` | Warm amber — hover / glow on primary |
| `--color-accent` | `#3F8E6E` | Growth green — accent, success-ish highlights, active nav |
| `--color-bg` | `#FBF6EF` | Sand canvas — app background |
| `--color-surface` | `#F3E9DC` | Warm surface — cards, raised panels |
| `--color-surface-plain` | `#FFFFFF` | White — input fields, high-contrast cards |
| `--color-text` | `#3A2E26` | Cocoa ink — primary text |
| `--color-text-secondary` | `#8A7B6D` | Warm slate — secondary text, captions |
| `--color-error` | `#C0392B` | Error clay — errors, destructive |
| `--color-success` | `#086A55` | Deep green — success text |
| `--color-success-bg` | `#E6F6F1` | Success surface — success banners, "done" pills |
| `--color-success-border` | `#C0E9DC` | Success border |
| `--color-error-bg` | `#FBE9E7` | Error surface |
| `--color-error-border` | `#F3C9C4` | Error border |
| `--color-border` | `#EDE3D6` | Hairline border on warm surfaces |
| `--color-border-strong` | `#D8C9B8` | Stronger border / dividers |

**Usage rules**
- Primary terracotta = primary CTA fill, selected states, key numerals. Use sparingly.
- Growth green = active tab, progress fill, success accents, "RECOMMENDED" badge. Use rarely.
- Body backgrounds are sand; cards are warm surface or white. Avoid pure cold greys.

### 2.2 Typography

Two families, loaded from Google Fonts: **Inter** (UI + body) and **JetBrains Mono** (eyebrows, data, labels, badges).

```
@import Inter: 400, 500, 600, 700 (+ italic 400)
@import JetBrains Mono: 400, 500, 700
```

| Style | Family | Size / weight / line-height | Tracking | Use |
|-------|--------|------------------------------|----------|-----|
| Display | Inter | 40 / 700 / 1.0 | -0.02em | Landing hero, "It's your time" |
| H1 | Inter | 28 / 700 / 1.15 | -0.01em | Screen titles ("Your program is ready") |
| H2 | Inter | 20 / 600 / 1.25 | 0 | Section / module titles |
| H3 | Inter | 17 / 600 / 1.3 | 0 | Card titles |
| Body | Inter | 16 / 400 / 1.6 | 0 | Paragraphs, descriptions |
| Body-small | Inter | 14 / 400 / 1.55 | 0 | Secondary copy, helper text |
| Caption | Inter | 13 / 400 / 1.5 | 0 | Captions, meta |
| Eyebrow | JetBrains Mono | 12 / 600 / 1.0 | 0.12em, UPPERCASE | Section labels, step counters |
| Data / label | JetBrains Mono | 11–13 / 500 | 0.06em | Badges, pills, numerals ("$25 · 3–6 modules · 90 days") |

**Voice & tone (apply to all copy):** warm, plain-spoken, second person, short sentences. Encouraging, never blaming, never cute. Example body voice: *"We walk you through all of it. You just show up."*

### 2.3 Spacing Scale

4px base unit. Use these tokens only.

| Token | px |
|-------|----|
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-12` | 48 |
| `space-16` | 64 |

- Screen edge padding (mobile): `space-5` (20px).
- Card padding: `space-5`–`space-6` (20–24px).
- Vertical rhythm between stacked cards: `space-4` (16px).
- Section gaps: `space-8`–`space-12`.

### 2.4 Border Radius

| Token | px | Use |
|-------|----|-----|
| `radius-sm` | 4 | Badges, small chips |
| `radius-md` | 8 | Inputs, buttons, small cards, list rows |
| `radius-lg` | 12 | Cards, panels, modals |
| `radius-xl` | 20 | Hero cards, bottom sheets (top corners) |
| `radius-pill` | 999 | Pills, status tags, avatar |

### 2.5 Shadows

Soft, warm, low-contrast. No harsh dark shadows.

| Token | Value | Use |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(58,46,38,0.06)` | Resting cards, inputs |
| `shadow-md` | `0 4px 12px rgba(58,46,38,0.08)` | Raised cards, hover |
| `shadow-lg` | `0 12px 28px rgba(58,46,38,0.12)` | Modals, bottom sheets, sticky CTA |
| `shadow-focus` | `0 0 0 3px rgba(181,83,42,0.25)` | Focus ring (terracotta) |

### 2.6 Grid System

- **Mobile (default, 390px):** single column, full-width cards, 20px gutters.
- **Tablet (≥720px):** content max-width ~640px, centered; two-column where cards pair naturally (e.g. path choice cards, "what you have" chips).
- **Desktop (≥1024px):** content max-width ~720–840px, centered column. The app is a phone-shaped experience widened — **do not** introduce a desktop sidebar nav. Bottom tab bar may convert to a centered top or left rail at desktop, but the simplest compliant choice is to keep the centered column with the tab bar pinned to the bottom of the content frame.
- Onboarding/loading and landing hero may go full-bleed.

---

### 2.7 Reusable Components (definitions)

#### Buttons
- **Variants:** `primary` (terracotta fill, white text), `secondary` (white/surface fill, terracotta text + border), `ghost` (text only, terracotta), `destructive` (error-clay text/border).
- **Sizes:** `lg` (full-width, 52px tall — default for primary CTAs), `md` (44px), `sm` (36px, inline).
- **States:** default, hover (amber glow on primary), active/pressed, focus (focus ring), disabled (reduced opacity, no pointer), **loading** (spinner + locked, label may swap to progress text).
- **Behaviors:** primary CTAs are full-width on mobile. Payment / generation buttons must lock on submit to prevent double-fire.

#### Inputs (text / email / password / textarea)
- White fill, `radius-md`, 1px `--color-border`, 14–16px text, 44px min height.
- **States:** default, focus (terracotta border + focus ring), filled, error (error-clay border + inline message below), disabled.
- Label above; helper/error text below in `caption`. Password field has show/hide toggle.

#### Dropdowns / Select
- Same field styling as inputs; chevron on right. Opens a list panel (`radius-lg`, `shadow-md`).
- **States:** closed, open, item-hover, selected (terracotta check), disabled.
- Mobile: render as a bottom sheet picker for ergonomics.

#### Modals & Bottom Sheets
- Mobile default = **bottom sheet** (`radius-xl` top corners, slides up, `shadow-lg`, scrim behind). Desktop = centered modal (`radius-lg`).
- Structure: handle/title row, body, action row (primary + cancel).
- **States:** entering, open, exiting. Dismiss via scrim tap, close button, or cancel. Confirm sheets (e.g. refund) require explicit confirm.

#### Cards
- **Variants:** `surface` (warm surface), `plain` (white), `selectable` (path choice — radio behavior, terracotta border + check when selected), `hero/next-step` (prominent, dynamic CTA), `module` (editable), `check-in` (mindset), `testimonial`, `post-preview`, `pillar` (icon + line), `expert-talk`.
- **States:** default, hover (`shadow-md`), selected (selectable only), loading (skeleton), disabled.

#### Tables / Lists
- The MVP has no dense data tables. Use **list rows** instead: checklist rows (Get Paid), added-content item rows (Add Content), member chips (Circle).
- **Checklist row:** label + status (done = green check / todo = empty circle). States: todo, done, in-progress.

#### Tabs / Segmented Control
- Used inside Marketing Kit (Social posts · Email). Pill-style segmented control; selected segment terracotta text on white, track on surface.
- **States:** default, selected, disabled (e.g. Email disabled if no list).
- The bottom **tab bar** is its own component: 4 items, icon + label, active = growth green, inactive = warm slate.

#### Toasts
- Bottom-anchored (above tab bar), `radius-md`, `shadow-md`, auto-dismiss ~4s.
- **Variants:** `success` (green), `error` (clay), `info` (neutral). Used for "Copied to clipboard", "Link saved", "Draft saved".

#### Empty States
- Centered: soft illustration block + warm headline + 1 line of reassurance + (optional) primary action. Never a blank screen. (See §3 per-screen + §6.)

#### Loading States
- **Skeletons** that match final layout (cards, lines) — no full-screen spinners after first paint.
- **Narrated loader** (hero): full-screen warm scene, animated dot-cluster motif, cycling step text — used for "Building Your Program".
- **Typing indicator** for mindset responses; **button loading lock** for payment.

#### Status Pill / Badge
- `radius-pill`, mono label. Variants: `recommended` (green), `done` (green), `pending` (slate), `new`. Used for path "RECOMMENDED", match status, checklist.

#### Stepper / Progress Trail
- Horizontal (mobile: compact) trail of journey milestones with current position highlighted (terracotta) and completed steps green-checked. Lives on Home.

#### Media
- **Video player:** landing founder video (autoplay muted, inline play), weekly expert talk (play / watch recording), leadership clips in check-ins.
- **Upload control:** drag/tap target, file-type + size hint, progress.
- **Voice-record control:** mic button → live waveform + timer → stop → produces an item row.

#### Avatar & Member Chip
- Avatar: circular, initials fallback. Member chip (Circle): avatar + name + category + level.

#### Testimonial Capture Card
- Prompt + short text input (+ optional name/permission), surfaced as a *state* after a positive moment, not a standalone route.

---

## 3. Screens

> 14 screens. Each spec is build-ready. Mobile-first at 390×844; responsive rules per screen. Onboarding loading [07] and testimonial capture are **states**, documented where they appear.

---

### [01] Landing Page

- **Purpose:** Warm, video-first front door. Convert email-blast visitors into $25 sign-ups — the core XPrize revenue moment.
- **Route:** `/`
- **Access:** Public. No tab bar.
- **Layout (top → bottom):**
  - **Header:** sticky minimal top bar — logo only, no nav clutter.
  - **Main:**
    1. Hero — warm display headline ("It's your time to share your gifts with the world"), autoplay-muted founder video (Ruby / Laquelle / real people), single **Start for $25** primary CTA.
    2. Marketing message block — the three "Even if you don't…" lines, left-aligned.
    3. Three **testimonial cards** — real faces, one per target audience.
    4. "How it works" — 3 pillars as warm icon + line cards (Done-For-You Toolkit · Mindset Coaching · Community Circles).
    5. Repeat CTA + 90-day guarantee reassurance.
  - **Actions:** Start for $25 (primary). Sticky CTA reappears on scroll.
  - **Footer:** logo, confidential/brand line, minimal links.
- **Components:** Sticky top bar, video player, primary CTA (×2 + sticky), testimonial card ×3, pillar card ×3, footer.
- **User actions:** Tap CTA → `/checkout`. Play/pause video inline. Scroll reveals sticky CTA.
- **Validation:** None (no form).
- **Loading:** Video poster frame while loading; lazy-load testimonial images with skeleton blocks.
- **Error:** Video fails → show poster + play affordance; never block the CTA.
- **Empty:** N/A (static marketing content).
- **Responsive:** Mobile single column, video full-width. Tablet/Desktop centered ≤840px; hero video and CTA remain prominent; testimonials become a 3-up row at ≥720px.

---

### [02] Checkout ($25)

- **Purpose:** Take the $25 via Stripe with the 90-day guarantee front and center.
- **Route:** `/checkout`
- **Access:** Public. No tab bar.
- **Layout (top → bottom):**
  - **Header:** back link to Landing.
  - **Main:**
    1. Order summary — "AbundanceAI — $25" + what's included (3 bullets).
    2. **90-day money-back guarantee badge**, prominent.
    3. Stripe Payment Element (card / wallet).
    4. **Pay $25** primary button (locked loading state).
    5. Trust row — "Secured by Stripe", refund promise.
  - **Footer:** none (keep focus).
- **Components:** Back link, order summary card, guarantee badge, Stripe Payment Element, primary button (loading-lock), inline error.
- **User actions:** Enter payment → tap Pay $25 → processing → on Stripe confirmation route to `/welcome`. Back link → `/`.
- **Validation:** Delegated to Stripe Element (card number, expiry, CVC, postal). Disable Pay button until the Element reports complete.
- **Loading:** Button enters loading + locks to prevent double-charge. Show "Processing…"; success screen only on Stripe confirmation.
- **Error:** **Payment declined** → inline message under card field: "That card didn't go through. Try another — you won't be charged twice." Retry stays in place; do not navigate away.
- **Empty:** N/A.
- **Responsive:** Single centered column all breakpoints, max-width ~480px.

---

### [03] Welcome / Create Account

- **Purpose:** Capture name + login, set the emotional tone, hand off to the journey.
- **Route:** `/welcome` (requires valid post-payment token)
- **Access:** Public-with-token. No tab bar.
- **Layout (top → bottom):**
  - **Header:** none / minimal logo.
  - **Main:**
    1. Celebratory headline — "You're in." (quietly proud, no confetti).
    2. Short form — first name, email, password (or magic-link option).
    3. One warm line of what happens next.
    4. **Continue** primary button → Journey Home.
- **Components:** Success affirmation, text inputs (×3), password show/hide, primary button.
- **User actions:** Submit → create account → route to `/app`. Errors inline per field.
- **Validation:** First name required (non-empty). Email required + valid format. Password ≥ 8 chars (show strength hint). On magic-link path, email only.
- **Loading:** Button loading state during account creation.
- **Error:** Inline per field (e.g. "That email's already in use — sign in instead"). Network error → non-blocking banner + retry.
- **Empty:** N/A.
- **Responsive:** Single centered column, max-width ~440px.

---

### [04] Journey Home

- **Purpose:** The hub. Show progress, the single next best step, proactive check-ins, and what they have so far.
- **Route:** `/app`
- **Access:** Member. App shell + bottom tab bar.
- **Layout (top → bottom):**
  - **Header (top bar):** warm greeting ("Good to see you, {firstName}") + avatar (tap → Account).
  - **Main:**
    1. **Hero "next best step" card** — dynamic CTA reflecting journey position (Build your program → Marketing → Set up sessions → Get paid).
    2. **Progress trail** (stepper) — where they are in the journey.
    3. **Proactive mindset check-in card** — appears only when triggered (a known wall reached).
    4. **"What you have" summary chips** — Program, Posts, Meet link, Circle (each chip deep-links to its screen; greyed if not yet created).
  - **Footer:** bottom tab bar.
- **Components:** Top bar + avatar, next-step hero card, stepper, check-in card (conditional), summary chips, tab bar.
- **User actions:** Tap hero card → relevant onboarding step (resumable). Tap chip → that pillar/screen. Tap check-in card → `/app/mindset`. Tap avatar → `/app/account`.
- **Validation:** None.
- **Loading:** Skeleton for hero card + chips on first load.
- **Error:** If journey state fails to load → friendly retry card; tab bar still functional.
- **Empty:** **Program not built** → hero card shows single warm CTA: "Let's turn your expertise into a program." No blank dashboard. Chips show as locked/greyed.
- **Responsive:** Mobile single column. Tablet/Desktop centered ≤720px; chips become a 2×2 grid; stepper expands horizontally.

---

### [05] Choose Your Path

- **Purpose:** The early fork — Live Group Coaching (Type A) or Self-Paced Course (Type B). Routes the rest of onboarding.
- **Route:** `/app/onboarding/path`
- **Access:** Member.
- **Layout (top → bottom):**
  - **Header:** back to Home; eyebrow + question: "Ready to show up live, or start with recorded?"
  - **Main:** two large **selectable choice cards**:
    - **Type A — Live Group Coaching** — `RECOMMENDED` badge. Promise line + 3 bullets (3–6 live sessions, real-time feedback, highest income potential) + "best for…".
    - **Type B — Self-Paced Course** — promise + 3 bullets (pre-recorded modules, good for camera-shy, Udemy-style) + "best for…".
  - **Actions:** **Continue** primary button (enabled on select).
- **Components:** Selectable choice card ×2 (radio behavior), recommended badge, primary button.
- **User actions:** Select one (radio) → Continue → `/app/onboarding/content`. Choice persists and branches Flow B.
- **Validation:** Continue disabled until a card is selected.
- **Loading:** None (static choice).
- **Error:** None.
- **Empty:** N/A.
- **Responsive:** Mobile = stacked cards. Tablet/Desktop = side-by-side at ≥720px.

---

### [06] Add Your Content

- **Purpose:** Collect raw material — upload files or speak/record expertise — to feed the AI.
- **Route:** `/app/onboarding/content`
- **Access:** Member.
- **Layout (top → bottom):**
  - **Header:** reassuring header — "Give me the raw material — messy is fine."
  - **Main:**
    1. Two equal options: **Upload file** (drag/tap) and **Record / speak** (mic).
    2. **Live recording UI** — waveform + timer (shown while recording).
    3. **List of added items** (file name / recording, with remove).
  - **Actions:** **Build my program** primary button.
- **Components:** Upload control, voice-record control, added-item row, primary button, inline error.
- **User actions:** Upload one+ files and/or record. Remove items. Add ≥ 1 source → enable Build → `/app/onboarding/building`.
- **Validation:** At least 1 source required to enable Build. File: max **50 MB**, accepted types (documents, audio, video — define allowlist). Validate size/type inline on add.
- **Loading:** Upload progress per item; recording shows live timer.
- **Error:** **Upload too large / wrong type** → "That file's a bit big (max 50 MB). Try a smaller one — or just record instead." Mic permission denied → calm prompt to enable or upload instead.
- **Empty:** **No content uploaded yet** → friendly prompt + two big choices ("Upload a file" / "Just talk — I'll listen"); reassure nothing to prepare.
- **Responsive:** Mobile stacked. Tablet/Desktop two-up upload vs record at ≥720px.

---

### [07] Building Your Program  *(transient state)*

- **Purpose:** The hero loading moment while Gemini structures the content. Builds anticipation for the WOW.
- **Route:** `/app/onboarding/building` (auto-advances; not a destination)
- **Access:** Member.
- **Layout (full-screen):** warm full-bleed loading scene · animated dot-cluster motif · narrated step text cycling ("Reading your notes… shaping modules… writing outcomes…") · encouraging sub-line.
- **Components:** Narrated loader, animated motif, step text.
- **User actions:** None (passive). Auto-advances to `/app/program` [08] on completion.
- **Validation:** N/A.
- **Loading:** This screen IS the loading state. 10–40s expected; never a bare spinner.
- **Error:** **AI generation failed** → calm full-screen card: "We hit a snag building your program. Your content is safe — tap to try again." One-tap retry; no data loss.
- **Empty:** N/A.
- **Responsive:** Full-bleed all breakpoints; motif centered.

---

### [08] Your Program ✦ (WOW)

- **Purpose:** The first WOW — the AI-built program. Also the permanent **Program tab**.
- **Route:** `/app/program`
- **Access:** Member. (Bottom tab bar present here.)
- **Layout (top → bottom):**
  - **Header:** celebratory — "Here's your program."
  - **Main:**
    1. Program **title** (editable inline).
    2. **3–6 module cards** — number, title, learning outcome, session flow. Each card: edit (inline), reorder (drag handle), add/remove.
  - **Actions:** **Looks great — continue** → Marketing Kit.
- **Components:** Inline-editable title, editable module card ×3–6, inline edit field, reorder handle, add-module control, primary button, bottom tab bar.
- **User actions:** Tap any field to edit; drag to reorder; add/remove modules. Continue → `/app/onboarding/marketing`. (When returning via tab later, this is the program viewer/editor.)
- **Validation:** Title non-empty; at least 1 module must remain. Module title non-empty on save.
- **Loading:** Skeleton module cards if re-entering before data loads.
- **Error:** Save failure → inline toast "Couldn't save that edit — tap to retry"; keep local edit.
- **Empty:** Reached without a built program → warm CTA card "Let's turn your expertise into a program" → routes to Path. (Mirrors Home empty state.)
- **Responsive:** Mobile single-column cards. Tablet/Desktop centered ≤720px; drag reorder works with handle on all.

---

### [09] Marketing Kit

- **Purpose:** AI-written social posts ready to copy, edit, publish. Default path for most users.
- **Route:** `/app/onboarding/marketing`
- **Access:** Member.
- **Layout (top → bottom):**
  - **Header:** "Your posts are written. Just make them yours."
  - **Main:**
    1. **Segmented control:** Social posts (default) · Email (enabled only if user has a list).
    2. Stack of **post preview cards** — caption + hashtags.
    3. Per card: edit, **copy**, mark as posted.
    4. "Not on social?" alternative-path link.
  - **Actions:** Continue advances the journey.
- **Components:** Segmented control, post-preview card, copy-to-clipboard, inline edit, mark-posted toggle, alternative-path link, primary button.
- **User actions:** Switch segment; edit caption in place; copy to clipboard (→ success toast); mark posted (→ done pill); continue.
- **Validation:** Edited caption can't be empty when saved.
- **Loading:** **Generating posts** → skeleton cards shimmer in place while text streams in.
- **Error:** Generation failed → "Couldn't write your posts just now — tap to try again." Retry; keep program intact.
- **Empty:** **No posts generated** → soft illustration + "Your marketing kit unlocks once your program is ready." (Shown if reached before program exists.)
- **Responsive:** Mobile single column. Tablet/Desktop centered ≤720px.

---

### [10] Set Up Live Sessions  *(Type A only)*

- **Purpose:** Generate / paste a Google Meet link for live group coaching.
- **Route:** `/app/onboarding/sessions`
- **Access:** Member, Type A path only. (Type B sees module-recording guidance instead of this screen.)
- **Layout (top → bottom):**
  - **Header:** "Where your group will meet."
  - **Main:**
    1. Google Meet explainer + **Generate / paste link** control.
    2. **Saved link card** with copy.
    3. Optional: schedule-first-session note.
  - **Actions:** Save link.
- **Components:** Link generator/input, copy button, info card, saved-link card.
- **User actions:** Generate or paste a Meet link → Save → stored and surfaced on Home + Circle. Copy link → toast.
- **Validation:** If pasting, validate it's a Google Meet URL; show inline hint if not.
- **Loading:** Brief spinner on save.
- **Error:** Invalid link → inline "That doesn't look like a Meet link — paste the full https://meet.google.com/… URL."
- **Empty:** No link yet → prompt with the two options (generate / paste).
- **Responsive:** Single column all breakpoints.

---

### [11] Get Paid (Stripe)

- **Purpose:** Guided Stripe walkthrough + readiness checklist so the user can receive *their* client payments. Surfaces at **week 3–4**, not day one.
- **Route:** `/app/onboarding/payments`
- **Access:** Member.
- **Layout (top → bottom):**
  - **Header:** "Let's get you ready to receive payment."
  - **Main:**
    1. **Readiness checklist** — bank account, ID, email (done/todo rows).
    2. Embedded **walkthrough video**.
    3. **Connect Stripe** button → external Stripe onboarding.
    4. Reassurance note: "AbundanceAI never touches your money."
  - **Actions:** Connect Stripe.
- **Components:** Checklist row ×3, walkthrough video, connect button, info note.
- **User actions:** Watch video; tap Connect → opens Stripe onboarding (external). On return, status reflects connected.
- **Validation:** None in-app (Stripe handles its own).
- **Loading:** Connect button loading while redirecting; on return, reconcile connected status.
- **Error:** Stripe return without completion → status stays "Not connected yet — pick up where you left off."
- **Empty:** Surfaced too early → gently gated ("This unlocks once your program's ready — no rush, you're not selling yet").
- **Responsive:** Single column all breakpoints.

---

### [12] Mindset Check-In

- **Purpose:** Proactive, category-aware courage prompt + short reflection. Pillar 2. Also the Mindset tab hub.
- **Route:** `/app/mindset`
- **Access:** Member. Bottom tab bar present.
- **Layout (top → bottom):**
  - **Header / background:** warm, full-bleed calm background.
  - **Main:**
    1. Acknowledging prompt tied to their wall (e.g. "Wondering who am I to teach?").
    2. Short **AI reflection** (served from cache where possible).
    3. Optional **leadership video/audio clip**.
    4. 1–2 gentle **reflection inputs**.
    5. Links: **Done** / "talk to my circle".
  - **Footer:** bottom tab bar.
- **Components:** Check-in card, AI reflection block, media clip player, reflection input ×1–2, done/secondary links.
- **User actions:** Read reflection; optionally write a reflection; tap Done (returns to Home) or "talk to my circle" (→ Circle). Triggered proactively or opened from the tab. Counts toward the **3/week** cap. A positive check-in may surface the **testimonial capture** state.
- **Validation:** Reflection inputs optional; if submitted, non-empty.
- **Loading:** **Mindset response** → typing-style indicator; cached responses appear instantly.
- **Error:** Generation failed → "Let's try that again in a moment" + retry; never a hard wall.
- **Empty / limit:** **Mindset limit reached** → "You've used your 3 check-ins this week. Your circle is here in the meantime →" (links to Circle). Never block harshly.
- **Responsive:** Mobile full-bleed. Tablet/Desktop centered ≤640px on the calm background.

---

### [13] Your Circle

- **Purpose:** Peer circle of 3–5, WhatsApp + Meet links, and the weekly expert talk. Pillar 3.
- **Route:** `/app/circle`
- **Access:** Member. Bottom tab bar present.
- **Layout (top → bottom):**
  - **Header:** "Your circle" + **match status**.
  - **Main:**
    1. **3–5 member chips** — name, category, level.
    2. **Open WhatsApp group** button (deep link out).
    3. **Join via Google Meet** button (deep link out).
    4. **Weekly expert talk card** — next session time + "watch recording".
  - **Footer:** bottom tab bar.
- **Components:** Member chip ×3–5, WhatsApp button, Meet button, expert-talk card (with video player), match-status pill.
- **User actions:** Tap WhatsApp / Meet → open external. Expert-talk card → join live or play recording.
- **Validation:** None.
- **Loading:** Skeleton chips + talk card.
- **Error:** External link unavailable → "We couldn't open WhatsApp — make sure it's installed, or copy the link."
- **Empty:** **Circle not matched** → "We're hand-matching your circle — you'll hear within 48h." Sets expectation for manual matching; hide member chips, keep expert-talk card if available.
- **Responsive:** Mobile single column. Tablet/Desktop centered ≤720px; member chips wrap to a row.

---

### [14] Account & Guarantee

- **Purpose:** Profile, settings, and the one-tap 90-day money-back request.
- **Route:** `/app/account`
- **Access:** Member. (Reached via avatar, not a tab.)
- **Layout (top → bottom):**
  - **Header:** back to Home / avatar.
  - **Main:**
    1. **Profile** — name, email, avatar, category.
    2. **Path & program quick view.**
    3. **Settings** — notifications, check-in cadence toggle.
    4. **Help / contact.**
    5. **90-day money-back** — request refund (one tap → calm confirm sheet).
    6. **Sign out.**
  - **Footer:** none.
- **Components:** Profile row, settings toggle, link rows, refund request button, confirm bottom sheet, sign-out.
- **User actions:** Edit profile fields; toggle settings; request refund → confirm bottom sheet (within window = no friction); sign out.
- **Validation:** Profile email valid; name non-empty.
- **Loading:** Save spinner on field edits; refund request loading on confirm.
- **Error:** Save failure → inline retry. Refund outside window → calm explainer (not a dead end).
- **Empty:** N/A.
- **Responsive:** Single column all breakpoints, centered ≤640px on desktop.

---

## 4. User Flows

Each arrow = one screen transition. Branches noted inline.

### Flow A — Visitor → Buyer (the $25 revenue moment)
```
Landing Page [01]
  → tap "Start for $25"
  → Checkout [02]
  → submit payment → (processing)
  → Payment success
  → Create Account [03]
  → Continue
  → Journey Home [04]

BRANCH: payment declined → inline error on [02], retry in place (no navigation).
TRUST:  90-day guarantee shown at checkout and reinforced on success.
```

### Flow B — New Member → Program Ready (core onboarding, Pillar 1)
```
Journey Home [04]
  → Choose Your Path (A / B) [05]
  → Add Content (upload / record) [06]
  → Building Your Program (loading) [07]
  → Your Program ✦ WOW [08]
  → Marketing Kit [09]
  → Set Up Live Sessions [10]            (Type A only)
  → Get Paid (Stripe · wk 3–4) [11]

BRANCH (Type B): skip [10]; show module-recording guidance instead.
NON-BLOCKING: user may stop after the WOW [08] and resume any step later from Home.
```

### Flow C — Staying the Course (mindset + community, Pillars 2 & 3; runs continuously alongside B)
```
Proactive check-in fires at a known wall
  → Mindset Check-In (reflect) [12]
  → Back to Journey Home [04]
  → Your Circle → WhatsApp / Meet [13]
  → Weekly expert talk [13]
  ↻ (loop)

TRIGGER LOGIC: check-ins tied to journey milestones (e.g. before first marketing post,
               before first live session); capped at 3/week.
TESTIMONIAL:   capture prompt surfaces after a positive check-in or first sale.
```

### Supporting flows
- **Login / return visit:** `(unauth) → / or direct app link → if no session → Create Account/Sign-in [03] → /app`. (MVP = single sign-in surface; magic-link or email+password.)
- **Edit program (CRUD):** `Program tab [08] → tap field (edit) / drag (reorder) / add-remove module → autosave → toast`.
- **Copy a marketing post:** `Marketing Kit [09] → edit caption → Copy → success toast → mark posted`.
- **Save Meet link:** `Set Up Live Sessions [10] → generate/paste → Save → link surfaces on Home [04] & Circle [13]`.
- **Connect Stripe:** `Get Paid [11] → Connect → external Stripe → return → status = connected`.
- **Request refund:** `Account [14] → Request refund → confirm bottom sheet → confirm → success state`.
- **Search / approval / reporting:** **None in MVP.** No search UI, no approval workflow, no reporting dashboards. (Ops/reporting happen in back-office tools per A1.) Do not build these.

---

## 5. Wireframes (ASCII)

> Mobile frames (390 wide). `[ TABS ]` = bottom tab bar present. Acquisition screens have no tab bar.

**[01] Landing Page**
```
+----------------------------------+
| logo                             |  sticky
+----------------------------------+
|  It's your time to share         |
|  your gifts with the world       |
|  +----------------------------+  |
|  |     ▶ founder video        |  |
|  +----------------------------+  |
|  [   Start for $25   ]           |
+----------------------------------+
|  Even if you don't know how...   |
|  Even if your site's out of date |
|  Even if you've never packaged.. |
+----------------------------------+
| [testimonial][testimonial][test] |
+----------------------------------+
| ◇ Toolkit  ◇ Mindset  ◇ Circle   |
+----------------------------------+
|  [ Start for $25 ]  90-day promise|
+----------------------------------+
| footer                           |
+----------------------------------+
```

**[02] Checkout ($25)**
```
+----------------------------------+
| ← back                           |
+----------------------------------+
| AbundanceAI — $25                |
|  • includes ...                  |
|  • includes ...                  |
|  • includes ...                  |
+----------------------------------+
|  ✔ 90-day money-back guarantee   |
+----------------------------------+
|  [ Stripe payment element      ] |
|  [ card / wallet               ] |
|  (inline error appears here)     |
+----------------------------------+
|  [        Pay $25 (lock)       ] |
|  🔒 Secured by Stripe · refund   |
+----------------------------------+
```

**[03] Welcome / Create Account**
```
+----------------------------------+
|            You're in.            |
+----------------------------------+
|  First name [______________]     |
|  Email      [______________]     |
|  Password   [__________] (show)  |
+----------------------------------+
|  Here's what happens next: ...   |
|  [        Continue            ]  |
+----------------------------------+
```

**[04] Journey Home**
```
+----------------------------------+
| Good to see you, {name}    (o)   |  avatar→Account
+----------------------------------+
|  NEXT BEST STEP                  |
|  +----------------------------+  |
|  | Build your program      →  |  |  dynamic CTA
|  +----------------------------+  |
+----------------------------------+
|  ●──●──○──○──○   progress trail  |
+----------------------------------+
|  (check-in card — if triggered)  |
+----------------------------------+
|  WHAT YOU HAVE                   |
|  [Program][Posts][Meet][Circle]  |  chips
+----------------------------------+
| ⌂Home  ▦Program  ♡Mindset ◎Circle|  [ TABS ]
+----------------------------------+
```

**[05] Choose Your Path**
```
+----------------------------------+
| ← Ready to show up live, or      |
|    start with recorded?          |
+----------------------------------+
|  +----------------------------+  |
|  | ( ) Type A — Live  [RECMD] |  |
|  |  promise + 3 bullets       |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | ( ) Type B — Self-paced    |  |
|  |  promise + 3 bullets       |  |
|  +----------------------------+  |
+----------------------------------+
|  [        Continue            ]  |
+----------------------------------+
```

**[06] Add Your Content**
```
+----------------------------------+
| Give me the raw material —       |
| messy is fine.                   |
+----------------------------------+
|  +-------------+  +-------------+ |
|  | ⬆ Upload    |  | 🎤 Record   | |
|  |   file      |  |   / speak   | |
|  +-------------+  +-------------+ |
|  (recording: ~~~waveform~~ 0:12) |
+----------------------------------+
|  • notes.pdf            [remove] |
|  • voice-1 (0:42)       [remove] |
+----------------------------------+
|  [     Build my program       ]  |
+----------------------------------+
```

**[07] Building Your Program** (full-screen)
```
+----------------------------------+
|                                  |
|            • • •                 |
|         • dot cluster •          |
|            • • •                 |
|                                  |
|   Reading your notes…            |
|   shaping modules…               |
|                                  |
|   Hang tight — this is the       |
|   good part.                     |
+----------------------------------+
```

**[08] Your Program ✦**
```
+----------------------------------+
| Here's your program.             |
+----------------------------------+
| [ Program title (edit) ________] |
+----------------------------------+
| ⠿ 1  Module title          [edit]|
|      outcome · session flow      |
| ⠿ 2  Module title          [edit]|
| ⠿ 3  Module title          [edit]|
|      [ + add module ]            |
+----------------------------------+
| [   Looks great — continue    ]  |
+----------------------------------+
| ⌂   ▦   ♡   ◎                    |  [ TABS ]
+----------------------------------+
```

**[09] Marketing Kit**
```
+----------------------------------+
| Your posts are written.          |
| Just make them yours.            |
+----------------------------------+
| ( Social posts ) ( Email )       |  segmented
+----------------------------------+
| +------------------------------+ |
| | caption text...              | |
| | #hashtags                    | |
| | [edit] [copy] [mark posted]  | |
| +------------------------------+ |
| +------------------------------+ |
| | caption ...   [edit][copy]   | |
| +------------------------------+ |
|  Not on social? →                |
+----------------------------------+
| ⌂   ▦   ♡   ◎                    |  [ TABS ]
+----------------------------------+
```

**[10] Set Up Live Sessions**
```
+----------------------------------+
| Where your group will meet.      |
+----------------------------------+
|  Google Meet — free & universal  |
|  [ Generate link ] or paste:     |
|  [ https://meet.google.com/__ ]  |
+----------------------------------+
|  Saved: meet.google.com/abc [⧉]  |
|  (note: schedule first session)  |
+----------------------------------+
|  [           Save             ]  |
+----------------------------------+
```

**[11] Get Paid (Stripe)**
```
+----------------------------------+
| Let's get you ready to receive   |
| payment.                         |
+----------------------------------+
|  ✔ Email                         |
|  ○ Bank account                  |
|  ○ Photo ID                      |
+----------------------------------+
|  +----------------------------+  |
|  |   ▶ walkthrough video      |  |
|  +----------------------------+  |
|  [      Connect Stripe      ]    |
|  AbundanceAI never touches your  |
|  money.                          |
+----------------------------------+
```

**[12] Mindset Check-In**
```
+----------------------------------+
| (warm calm background)           |
|                                  |
|  Wondering "who am I to teach?"  |
|                                  |
|  Short reflection from AI...     |
|  ...you've earned this.          |
|                                  |
|  +----------------------------+  |
|  | ▶ a word from Ruby         |  |
|  +----------------------------+  |
|  How does that land? [_______]   |
|                                  |
|  [ Done ]   talk to my circle →  |
+----------------------------------+
| ⌂   ▦   ♡   ◎                    |  [ TABS ]
+----------------------------------+
```

**[13] Your Circle**
```
+----------------------------------+
| Your circle        ● matched     |
+----------------------------------+
| (o) Maya · healer · starting     |
| (o) Tom · coach · stalled        |
| (o) Pia · attorney · scaling     |
+----------------------------------+
|  [ Open WhatsApp group ]         |
|  [ Join via Google Meet ]        |
+----------------------------------+
|  WEEKLY EXPERT TALK              |
|  Thu 5pm · "Finding your voice"  |
|  [ Join live ] [ Watch recording]|
+----------------------------------+
| ⌂   ▦   ♡   ◎                    |  [ TABS ]
+----------------------------------+
```

**[14] Account & Guarantee**
```
+----------------------------------+
| ← Account                  (o)   |
+----------------------------------+
|  Name · email · category         |
+----------------------------------+
|  Path: Live (A) · Program ready  |
+----------------------------------+
|  Notifications           [ on ]  |
|  Check-in cadence        [3/wk]  |
|  Help / contact            →     |
+----------------------------------+
|  90-day money-back               |
|  [ Request refund ]              |
+----------------------------------+
|  [ Sign out ]                    |
+----------------------------------+
```

---

## 6. Component Inventory (master)

For each: variants · states · props · behaviors.

### Button
- **Variants:** primary, secondary, ghost, destructive.
- **States:** default, hover, active, focus, disabled, loading.
- **Props:** `variant`, `size('lg'|'md'|'sm')`, `label`, `iconLeft?`, `iconRight?`, `loading`, `disabled`, `fullWidth`, `onClick`.
- **Behaviors:** primary full-width on mobile; loading locks button + optional label swap; amber glow on primary hover.

### TextInput / Textarea
- **Variants:** text, email, password (show/hide), textarea.
- **States:** default, focus, filled, error, disabled.
- **Props:** `type`, `label`, `value`, `placeholder`, `helperText?`, `error?`, `maxLength?`, `onChange`, `required`.
- **Behaviors:** error sets clay border + message below; password toggles visibility.

### Select / Dropdown
- **Variants:** inline select, bottom-sheet picker (mobile).
- **States:** closed, open, item-hover, selected, disabled.
- **Props:** `options[]`, `value`, `placeholder`, `onChange`, `disabled`.
- **Behaviors:** mobile opens as bottom sheet; selected item gets terracotta check.

### Card
- **Variants:** surface, plain, selectable, hero/next-step, module, check-in, testimonial, post-preview, pillar, expert-talk.
- **States:** default, hover, selected (selectable), loading (skeleton), disabled/locked.
- **Props:** `variant`, `title?`, `children`, `selected?`, `onSelect?`, `actions?`.
- **Behaviors:** selectable = radio group; module supports inline edit + drag handle.

### SelectableChoiceCard (Path)
- **States:** unselected, selected, focus.
- **Props:** `title`, `promise`, `bullets[]`, `bestFor`, `badge?('RECOMMENDED')`, `selected`, `onSelect`.
- **Behaviors:** radio behavior across the pair; enables Continue.

### ModuleCard
- **States:** view, editing, reordering, saving, error.
- **Props:** `index`, `title`, `outcome`, `sessionFlow`, `onEdit`, `onReorder`, `onRemove`.
- **Behaviors:** tap field → inline edit; drag handle → reorder; min 1 module.

### PostPreviewCard
- **States:** default, editing, copied, posted, skeleton (generating).
- **Props:** `caption`, `hashtags[]`, `onEdit`, `onCopy`, `onMarkPosted`, `posted`.
- **Behaviors:** copy → clipboard + success toast; mark posted → done pill.

### ChecklistRow
- **States:** todo, in-progress, done.
- **Props:** `label`, `status`.

### UploadControl
- **States:** idle, drag-over, uploading (progress), success, error.
- **Props:** `accept[]`, `maxSizeMB(50)`, `onAdd`, `onError`.
- **Behaviors:** validates type/size inline; emits item.

### VoiceRecordControl
- **States:** idle, requesting-permission, recording (waveform + timer), stopped, error (denied).
- **Props:** `maxDuration?`, `onComplete`.
- **Behaviors:** live waveform + timer; produces an item row on stop.

### AddedItemRow
- **States:** default, removing.
- **Props:** `name`, `meta?(size/duration)`, `onRemove`.

### Stepper / ProgressTrail
- **States:** per-node: upcoming, current, complete.
- **Props:** `steps[]`, `currentIndex`.
- **Behaviors:** complete = green check; current = terracotta.

### SegmentedControl / Tabs
- **States:** per-segment: default, selected, disabled.
- **Props:** `segments[]`, `value`, `onChange`, `disabledSegments?`.

### BottomTabBar
- **States:** per-tab: active (growth green), inactive (warm slate).
- **Props:** `tabs[{icon,label,route}]`, `activeRoute`.
- **Behaviors:** persistent on app screens; hidden on acquisition screens.

### CheckInCard (Mindset)
- **States:** default, loading (typing indicator), responded, limit-reached, error.
- **Props:** `wallPrompt`, `reflection`, `mediaClip?`, `inputs[]`, `onDone`, `onTalkToCircle`.
- **Behaviors:** counts toward 3/week; may chain into testimonial capture.

### MemberChip (Circle)
- **States:** default.
- **Props:** `avatar?`, `name`, `category`, `level`.

### ExpertTalkCard
- **States:** upcoming (join live), past (watch recording), none.
- **Props:** `title`, `time`, `joinUrl?`, `recordingUrl?`.

### VideoPlayer
- **Variants:** landing (autoplay muted inline), talk, leadership clip.
- **States:** poster, playing, paused, error.
- **Props:** `src`, `poster`, `autoplay?`, `muted?`.

### StatusPill / Badge
- **Variants:** recommended, done, pending, new, matched.
- **Props:** `variant`, `label`.

### Avatar
- **States:** image, initials-fallback.
- **Props:** `src?`, `name`, `size`.

### Toast
- **Variants:** success, error, info.
- **States:** entering, visible, exiting.
- **Props:** `variant`, `message`, `duration(4000)`.
- **Behaviors:** anchored above tab bar; auto-dismiss.

### Modal / BottomSheet
- **Variants:** modal (desktop), bottom sheet (mobile), confirm sheet (refund).
- **States:** entering, open, exiting.
- **Props:** `title`, `children`, `primaryAction`, `cancelAction`, `onDismiss`.
- **Behaviors:** scrim dismiss except confirm sheets, which require explicit confirm.

### EmptyState
- **Props:** `illustration`, `headline`, `subline`, `action?`.
- **Behaviors:** never a blank screen; warm, reassuring copy.

### NarratedLoader
- **Props:** `steps[]`, `subline`, `onComplete`.
- **Behaviors:** cycles step text; full-screen; 10–40s; calm.

### Skeleton
- **Variants:** card, line, post-card, module-card, chip.
- **Behaviors:** matches final layout; shimmer; no full-screen spinners after first paint.

### TestimonialCaptureCard (state, not route)
- **States:** prompt, submitting, thanks.
- **Props:** `prompt`, `onSubmit(text, permission)`.
- **Behaviors:** surfaces after positive check-in or first sale; lightweight, dismissible.

---

## 7. Frontend Build Guide (for Claude Code)

### 7.1 Stack recommendation
- **React + TypeScript + Vite** (PWA-style), **React Router** for the route map in §1.3, **Tailwind CSS** with the tokens in §2 mapped into `tailwind.config` theme.
- **Stripe:** `@stripe/react-stripe-js` + `@stripe/stripe-js` for the Checkout [02] Payment Element.
- Keep it mobile-first; build at 390px then layer breakpoints (`sm:720`, `lg:1024`).

### 7.2 Suggested component hierarchy
```
<App>
 ├── <PublicLayout>            (no tab bar)
 │    ├── LandingPage [01]
 │    ├── CheckoutPage [02]
 │    └── WelcomePage [03]
 └── <AppShell>                (auth guard + bottom tab bar + top bar/avatar)
      ├── HomePage [04]
      ├── <OnboardingStepper>  (linear, resumable)
      │    ├── ChoosePathPage [05]
      │    ├── AddContentPage [06]
      │    ├── BuildingPage [07]
      │    ├── ProgramPage [08]   (shared w/ Program tab)
      │    ├── MarketingKitPage [09]
      │    ├── LiveSessionsPage [10]
      │    └── GetPaidPage [11]
      ├── MindsetPage [12]
      ├── CirclePage [13]
      └── AccountPage [14]
```

### 7.3 Shared layouts
- **PublicLayout:** centered, no chrome, conversion-focused; logo-only header.
- **AppShell:** persistent `BottomTabBar`, top bar with greeting + `Avatar`, route outlet, global `Toast` host, offline banner host. Wrap in `<RequireAuth>`.
- **OnboardingStepper:** holds step order, current index, and resumability; renders the `Stepper` on Home (not inside each step). Steps are routes, not a wizard modal, so Home can deep-link to any.

### 7.4 Reusable patterns
- **Next-best-step engine:** a pure function `getNextStep(journeyState) → {label, route}` driving the Home hero card and the progress trail. Single source of truth for journey position.
- **Path branching:** `path === 'A'` includes Live Sessions [10]; `path === 'B'` swaps it for recording guidance. Centralize so step order is computed, not hard-coded per screen.
- **Optimistic edit + autosave** for program modules and marketing posts: update local state, persist, toast on success, inline retry on failure (never lose user text).
- **Copy-to-clipboard** helper → always pair with a success toast.
- **External deep links** (WhatsApp, Google Meet, Stripe) open in new context with a graceful fallback message if unavailable.

### 7.5 State management
- Lightweight global store (Zustand or React Context + reducer). Minimum slices:
  - `auth` — session, user `{firstName, email, category, avatar}`, `path('A'|'B'|null)`.
  - `journey` — step completion flags, `currentStep`, derived next-step.
  - `program` — `{title, modules[{id,index,title,outcome,sessionFlow}]}`.
  - `marketing` — `{posts[{id,caption,hashtags,posted}], emailEnabled}`.
  - `sessions` — `{meetLink}`.
  - `payments` — `{stripeConnected, checklist}`.
  - `mindset` — `{weekCount, capPerWeek:3, lastCheckIn, cachedResponses}`.
  - `circle` — `{matchStatus, members[], whatsappUrl, meetUrl, expertTalk}`.
- **Persistence:** persist `auth`, `journey`, `program`, `marketing`, `sessions` to the backend; cache locally for offline drafts (Add Content + reflections), sync on reconnect.
- **Phase-portability (critical — A3):** store peer-match attributes as **structured fields** (`category`, `level`, `fearPattern`) even though matching is manual in MVP. Do not encode them as free text. The same shape must feed a future matching engine without a rebuild. Likewise, keep the data model generic enough that a future Artisan/Etsy track and a public sales page can attach without schema surgery.

### 7.6 API integration points
> Build against these contracts; mock until backend is ready. All AI calls go through the backend (which calls Gemini) — never call Gemini from the client.

| Area | Endpoint (suggested) | Notes |
|------|----------------------|-------|
| Payment | Stripe Payment Element + `POST /api/checkout/confirm` | Client confirms; backend verifies; returns post-payment token for `/welcome`. |
| Account | `POST /api/account` · `GET/PATCH /api/account` | Create on Welcome; profile + settings on Account. |
| Program build | `POST /api/program/build` (sources) → returns modules | Triggers Building [07]; backend calls Gemini, structures 3–6 modules. Handle async + failure-retry. |
| Program edit | `PATCH /api/program` | Title, modules, reorder. Autosave. |
| Content upload | `POST /api/content` (multipart) · `POST /api/content/voice` | Enforce 50MB + type allowlist client-side too. |
| Marketing | `POST /api/marketing/generate` → posts · `PATCH /api/marketing/posts/:id` | Stream/skeleton while generating. |
| Sessions | `PUT /api/sessions/meet-link` | Validate Meet URL. |
| Payments (user Stripe) | `POST /api/stripe/connect` → redirect URL · status on return | External onboarding. |
| Mindset | `POST /api/mindset/checkin` → reflection | Enforce 3/week cap; serve cached responses first; typing indicator. |
| Circle | `GET /api/circle` | Returns match status, members, external URLs, expert talk. |
| Testimonial | `POST /api/testimonials` | Lightweight capture. |
| Refund | `POST /api/refund/request` | 90-day window check server-side. |

### 7.7 Form architecture
- Use a single form approach (e.g. `react-hook-form` + schema validation with `zod`). **Do not use raw HTML `<form>` submit inside any artifact-style preview; use controlled inputs + `onClick` handlers.**
- Validation rules (consolidated):
  - **Create Account [03]:** firstName required; email valid; password ≥ 8.
  - **Checkout [02]:** Stripe Element completeness gates the Pay button.
  - **Add Content [06]:** ≥ 1 source to build; file ≤ 50MB + type allowlist.
  - **Program [08]:** title non-empty; ≥ 1 module; module title non-empty on save.
  - **Marketing [09]:** caption non-empty on save.
  - **Sessions [10]:** valid Google Meet URL if pasted.
  - **Account [14]:** email valid; name non-empty.
- Error display = inline below field (clay), plus toast only for transient/system errors. Tone stays calm and never blaming.

### 7.8 Cost & guardrail behaviors to honor in the UI (A4)
- Mindset is **structured prompts**, not open chat — no free-form chat input that loops.
- Enforce **3 check-ins/week** at the UI layer (disable/redirect at limit with the warm "your circle is here" message) and trust the backend as source of truth.
- Show cached responses instantly where the backend flags them, to keep latency and cost low.

---

*End of specification. Build MVP scope only (§0). Anything not listed here as an MVP screen, route, or component is out of scope.*