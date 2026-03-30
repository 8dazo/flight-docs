# Flight Docs

Flight Docs is a collaborative document workspace built with Next.js 16, Prisma, PostgreSQL, and Lexical. It combines a modern rich-text editor with sharing, public links, imports, downloads, comments, lightweight version history, and collaboration presence indicators.

## Overview

The app is designed around a document-first workflow:

- create and rename rich-text documents
- autosave document content as Lexical JSON
- share documents with collaborators by email
- publish view-only public links
- import `.txt`, `.md`, and `.docx` files
- export documents as `.txt`, `.md`, `.docx`, and `.pdf`
- browse documents in a dashboard table with owner, permission, and visibility tags
- review comments and version history in a right-side editor panel
- show active collaborator cursor indicators with name and color

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL
- Lexical editor
- Tailwind CSS 4
- Zod
- `mammoth` for `.docx` import
- `docx` for `.docx` export
- `jspdf` for PDF export

## Main Features

### Editor

- rich text editing with Lexical
- slash command menu
- floating inline formatting toolbar
- links, images, embeds, lists, headings, quotes, code blocks, tables, dividers
- outline sidebar on the left
- comments and version history sidebar on the right
- debounced autosave
- download menu in the editor header

### Collaboration

- owner and collaborator access
- public view links
- collaborator presence with live cursor/name/color indicators
- comments panel for editors
- lightweight version restore flow

### Dashboard

- create new document
- import `.txt`, `.md`, `.docx`
- rich table with:
  - document title
  - owner
  - type
  - permission
  - visibility
  - updated time

## Access Model

Flight Docs currently supports these access modes:

- `owner`: full control, including rename and sharing
- `edit`: collaborator access
- `view`: public link access and read-only viewing

Public documents can be opened without logging in. Public visitors get read-only access in the editor view.

## Project Structure

High-signal folders and files:

- [`app/`](/Users/d3v1/projects/ai-docs/app): App Router pages, API routes, and server actions
- [`components/document-editor.tsx`](/Users/d3v1/projects/ai-docs/components/document-editor.tsx): main editor shell
- [`components/editor/`](/Users/d3v1/projects/ai-docs/components/editor): editor UI, plugins, dialogs, sidebar panels, exports
- [`lib/documents.ts`](/Users/d3v1/projects/ai-docs/lib/documents.ts): document access rules and server-side document operations
- [`lib/editor.ts`](/Users/d3v1/projects/ai-docs/lib/editor.ts): editor import helpers and serialized state helpers
- [`prisma/schema.prisma`](/Users/d3v1/projects/ai-docs/prisma/schema.prisma): database schema

## Data Model

Core models:

- `User`
- `Session`
- `Document`
- `DocumentCollaborator`
- `DocumentImport`
- `DocumentComment`
- `DocumentVersion`
- `DocumentPresence`

### Document-related models

- `Document` stores:
  - title
  - serialized Lexical content
  - owner
  - public visibility
- `DocumentCollaborator` stores collaborator role per user/document
- `DocumentImport` stores import metadata
- `DocumentComment` stores document comments
- `DocumentVersion` stores version snapshots
- `DocumentPresence` stores active cursor presence records

## API Surface

Main routes:

- `PATCH /api/documents/[id]/content`
  saves editor content
- `GET /api/documents/[id]/comments`
  loads comments
- `POST /api/documents/[id]/comments`
  creates a comment
- `GET /api/documents/[id]/versions`
  loads document versions
- `POST /api/documents/[id]/versions/[versionId]/restore`
  restores a version
- `GET /api/documents/[id]/presence`
  loads active collaborator presence
- `POST /api/documents/[id]/presence`
  updates a presence heartbeat
- `DELETE /api/documents/[id]/presence`
  clears a presence session

## Local Setup

1. Copy `.env.example` to `.env`
2. Fill in:
   - `DATABASE_URL`
   - `DEMO_USER_PASSWORD`
3. Push the Prisma schema:

```bash
pnpm exec prisma db push
```

4. Seed demo users:

```bash
pnpm seed:demo-users
```

5. Start development:

```bash
pnpm dev
```

## Environment Variables

Current required variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
DEMO_USER_PASSWORD=change-me-before-seeding
```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm seed:demo-users`
- `pnpm db:reset:remote`
- `pnpm exec prisma generate`
- `pnpm exec prisma db push`

## Demo Users

Seeded demo accounts:

- `ava@flightdocs.dev`
- `sam@flightdocs.dev`

Both use the password stored in `DEMO_USER_PASSWORD`.

## Import and Export Support

### Import

- `.txt`
- `.md`
- `.docx`

### Export

- `.txt`
- `.md`
- `.docx`
- `.pdf`

## Collaboration Notes

The collaboration indicators are implemented as lightweight presence heartbeats rather than full CRDT multiplayer editing. That means:

- cursor/name/color indicators update live enough for awareness
- comments and versions are persistent
- document text editing itself is still based on autosave, not simultaneous merge-aware editing

## Current Limitations

- no full CRDT real-time co-editing yet
- no inline comment anchors inside selected text yet
- no suggestion/track-changes mode yet
- version history is snapshot-based, not a semantic diff viewer
- collaborator sharing UI currently grants editor access only
- PDF and DOCX export focus on practical output, not pixel-perfect editor fidelity

## Recommended Next Steps

If you want to keep evolving the app, the highest-value follow-ups are:

1. Add collaborator roles in the share UI for `viewer` and `editor`
2. Add inline comment anchors tied to text selections
3. Add diff previews for version restores
4. Upgrade presence to true live multiplayer editing with Yjs/websocket sync
5. Add suggestion mode on top of document versions and comments
