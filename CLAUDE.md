# Project guidelines for AI coding agents

This is the **LTI ATS frontend exercise**: a React application to manage candidates of a job position as a kanban board. Development follows a lightweight **Spec-Driven Development** workflow powered by [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## 1. Core principles

- **Small tasks, one at a time**: work in incremental, focused, reviewable steps.
- **Type safety**: new code is fully typed (TypeScript).
- **Clear naming**: descriptive names for variables, functions, and components.
- **Explicit states**: always handle loading and error states for async work.
- **Question assumptions**: verify the real API/data shape instead of trusting docs or briefs.

## 2. Language policy

- **English**: all code, comments, error/log/UI strings, commit messages, and OpenSpec artifacts (specs, tasks, design).
- **Spanish**: user stories in `user-stories/` and the delivery prompts file `prompts/prompts-AJM.md` (they are course deliverables written for a Spanish-speaking audience).

## 3. Tech stack (verified from the codebase)

- **Frontend**: Create React App (`react-scripts` 5), React 18.3, TypeScript 4.9, React Router v6, React Bootstrap 5 + `react-bootstrap-icons`. Drag & drop: `@dnd-kit/core`. HTTP via native `fetch` (`axios` is imported by legacy code but NOT installed).
- **Backend** (do not modify; frontend exercise): Express + TypeScript + Prisma, Postgres via Docker, port `3010`.
- **Frontend entry point**: `index.tsx` → resolves to **`App.js`** (the real router). `App.tsx` is dead CRA boilerplate — ignore it.

See `docs/frontend-standards.md` for detailed frontend conventions and the verified backend API contract.

## 4. Project skills and agents

- Reusable agents live in `ai-specs/agents/` and skills in `ai-specs/skills/`, exposed to Claude Code via symlinks under `.claude/`.
- When a request matches a skill's description, load and follow its `SKILL.md` automatically.
- For frontend planning/review, use the `frontend-developer` agent.

## 5. OpenSpec workflow

The spec-driven flow for a change: `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → (adversarial-review) → `/opsx:archive`.

- Specs describe **observable behavior** (GIVEN/WHEN/THEN scenarios), not implementation details.
- Before archiving, run an independent `adversarial-review` pass over the change.

## 6. Lightweight task requirements

Each OpenSpec `tasks.md` for an implementation change should:

- Start on a **feature branch** (never commit directly to `main`).
- Have the **agent itself** verify behavior — do not delegate testing to the user:
  - Manual API checks with `curl` against the running backend.
  - End-to-end UI checks with **Playwright MCP** when the change is user-facing.
  - After any data-mutating check, **restore the database state**.
- Keep changes focused and update relevant docs when conventions change.

## 7. Symlink integrity

- Canonical source is `ai-specs/`. Agent-specific paths under `.claude/` reference it through **relative** symlinks.
- When renaming/moving a canonical artifact, update the symlinks that target it. A change is incomplete if it leaves broken symlinks or duplicated canonical artifacts.
