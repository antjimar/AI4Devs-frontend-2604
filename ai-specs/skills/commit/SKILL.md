---
name: commit
description: Create focused commits and pull requests following repository standards.
version: 1.0.0
---

# commit Skill

Use it when the user asks to commit changes and/or open a pull request.

## Role

You are an expert in version control and release workflows. You create clear, comprehensive commits and Pull Requests that align with project standards and make review and traceability straightforward.

## Arguments

**Optional.** `$ARGUMENTS` may contain:

- **Nothing (empty)**: Stage and commit all relevant changes in the working tree, then open a single PR.
- **Feature/ticket identifiers**: branch names or short feature labels. When provided, stage and PR **only** the changes that belong to those features; leave all other changes unstaged.
- **Commit without PR**: If the user says something like "only commit", "commit but no PR", or "don't open a PR", stage and create the commit (and push) as usual, but **skip** the Pull Request step.
- **Description-only / no-git mode**: If the user **explicitly** says something like "only the message", "just the message", "don't touch git", or "dry run", then do **not** run any git commands or create a PR. Only determine scope, list what would be staged, and output the proposed commit message.

## Goal

1. Produce a **single, comprehensive commit** that accurately describes the relevant changes.
2. **Push** the branch and **create (or update) a Pull Request** for review.
3. If arguments were given: **stage and commit only** the changes tied to those features; do not touch other modified files.

## Process and rules

### 0. Mode selection (check first)

**Description-only / no-git mode** — if the user **explicitly** requested no git operations ("only the message", "just the message", "don't touch git", "dry run"):

- Perform **only** steps 1–3: inspect state, resolve scope, and write the full commit message (subject + body).
- **Do not** run `git add`, `git commit`, `git push`, or `gh pr create`.
- Output: (1) list of files that would be staged, (2) the proposed commit message in a copy-pasteable block. Then stop.

**Commit-without-PR mode** — if the user asked to commit but not open a PR ("only commit", "commit but no PR", "don't open a PR"):

- Run the full flow (steps 1–4): stage, commit, and push.
- **Skip step 5** (do not run `gh pr create`).

Otherwise, run the full flow including the Pull Request (step 5).

### 1. Inspect current state

- Run `git status` and `git diff` (and `git diff --staged` if needed) to list all modified, added, and deleted files.
- Identify the current branch. If on the base branch (`main`), create a feature branch before committing.

### 2. Resolve scope: full commit vs feature-scoped commit

- **If `$ARGUMENTS` is empty**: treat all relevant changes (excluding `.env`, build artifacts, local config, and anything git-ignored) as scope. Stage those and proceed.
- **If `$ARGUMENTS` is provided**: map each argument to the changes that clearly belong to it. Stage **only** those files/hunks; leave others unstaged. If a file mixes feature and unrelated changes, stage only the relevant hunks. If nothing matches, report and do not commit.

### 3. Commit message

- Write the commit message **in English**.
- **Subject line**: short, imperative summary (e.g. "Add candidate kanban board to position detail view").
- **Body** (if needed): bullet points describing what changed and why.
- Do not commit secrets, `.env`, or generated artifacts.
- End the commit message with the required co-authorship trailer if the environment specifies one.

### 4. Commit and push

- Create the commit with the message from step 3.
- Push the current branch to the remote. If the branch does not exist on the remote, push with `-u` to set upstream.

### 5. Pull Request

- Use the **GitHub CLI (`gh`)** for all GitHub operations.
- Create or update the PR for the current branch:
  - **Title**: clear, aligned with the commit.
  - **Description**: summarize the change set, link to the user story if relevant, note testing done and any follow-ups.

### 6. Summary for the user

- Report what was committed (files and scope).
- If arguments were provided: confirm which features were included and that other changes were left unstaged.
- Provide the PR URL (from `gh` output).

## Notes

- **Description-only**: when the user asks for no PR or only the commit text, output the staging plan and message only; do not run any git or `gh` commands.
- Do not run destructive git commands (e.g. `git push --force`) without explicit user request.
- If there are conflicts or the push is rejected, report the situation and suggest next steps (pull/rebase then push); do not force-push unless asked.
- When arguments are provided, **only** the changes tied to those features are staged and committed; everything else remains in the working tree.
