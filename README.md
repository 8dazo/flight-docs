# Flight Docs

Flight Docs is a lightweight collaborative docs app built with Next.js 16, Prisma, PostgreSQL, and Lexical. It focuses on a polished v1 workflow:

- create, rename, edit, and reopen documents
- autosave rich-text content as Lexical JSON
- share documents with another user by email
- import `.txt` and `.md` files into new editable docs
- show clear separation between owned docs and shared docs

## Stack

- Next.js 16 App Router
- React 19
- Prisma
- PostgreSQL via `DATABASE_URL`
- Lexical rich-text editor
- Tailwind CSS 4
- Zod for server-side validation

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `DATABASE_URL`
   - `DEMO_USER_PASSWORD`
3. Reset and apply the Prisma schema:

```bash
pnpm db:reset:remote
```

4. Seed the demo users:

```bash
pnpm seed:demo-users
```

5. Start the app:

```bash
pnpm dev
```

## Demo accounts

- `ava@flightdocs.dev`
- `sam@flightdocs.dev`

Both demo users use the password stored in `DEMO_USER_PASSWORD`.

## Supported workflows

- Dashboard with `Owned by me` and `Shared with me`
- Inline rename for owned docs
- Rich text formatting:
  - bold
  - italic
  - underline
  - heading 1
  - heading 2
  - bullet list
  - numbered list
- Debounced autosave to `PATCH /api/documents/[id]/content`
- Owner-only sharing by exact email
- Import `.txt` and `.md` files into new docs

## Data model

Main tables:

- `User`
- `Session`
- `Document`
- `DocumentCollaborator`
- `DocumentImport`

## Known limitations

- No real-time multiplayer editing or presence
- No comments, suggestion mode, or version history
- Sharing supports editor access only
- Markdown import keeps the workflow lightweight rather than aiming for full markdown fidelity

## Scripts

- `pnpm dev` runs the app locally
- `pnpm lint` runs ESLint
- `pnpm db:reset:remote` drops the app tables and reapplies the Prisma schema
- `pnpm seed:demo-users` seeds the demo users in Postgres
