# PROJECT_WORKFLOW.md — STS Daily Report (Development Workflow)

> Mandatory development rules. Read this file before performing any future Git-related operation.
> Do not change these rules unless explicitly asked to change them.

## Project Purpose

This project is an improvement of the existing Daily Report system.

We are NOT creating a completely new feature from scratch.
The current work should be treated as an improvement to the existing system.

Repository: `https://github.com/EPS-OPERATION/STS-Daily-Report`

Active development branch:

`dev`

(History note: `feature/daily-report` and `improvement/daily-report` were merged into `dev` and deleted
on 2026-10-11. All their commits are preserved in `dev`.)

## Branch Structure

```text
main
  ↑
dev
```

### Protected branch

`main` is a protected branch.

Under NO circumstances should you directly:

- modify code on `main`
- commit directly to `main`
- rebase `main`
- reset `main`
- merge into `main`
- force-push to `main`

A merge of `dev` into `main` happens only when the user explicitly asks for it.

The development work must happen only on:

`dev`

## Development Workflow

1. Before doing anything, inspect the current project structure and Git status.
2. Confirm which branch is currently checked out — it must be `dev`.
3. Never assume that `main` is safe to modify.
4. The `dev` branch must be based on the latest `origin/dev` (pull before starting work).
5. All code changes must be made only on `dev`.
6. Existing functionality must be preserved unless the requested improvement explicitly requires changing it.

## Syncing

If `origin/dev` receives new commits while development is in progress:

```bash
git fetch origin
git checkout dev
git pull origin dev
```

If a conflict occurs while pulling:

**STOP immediately and ask me what to do.**

Do NOT automatically:

- choose "ours"
- choose "theirs"
- discard changes
- overwrite files
- resolve the conflict based on assumptions

`dev` is a shared branch — do NOT rebase it or force-push it.

## Push Rules

Only push:

`dev`

(and only when the user asks — pushing `dev` deploys the dev environment).

Never push directly to:

`main`

Do not use `git push --force`.

If a force push is ever genuinely required, STOP and ask for my explicit approval first. If approved, use:

`git push --force-with-lease`

## Merge / Pull Request Rules

Do NOT automatically:

- merge `dev` into `main`
- create a PR
- approve a PR
- merge a PR

When the work is complete, stop after testing and (if asked) pushing `dev`, and ask me before any merge or PR action.

## Safety Rule

If you are ever unsure whether a Git command could modify `main`, STOP and ask me before running it.

Do not make assumptions.

Before every Git-related operation, verify the current branch.

Development must be done only on `dev`.

Never automatically merge into `main`.

Never automatically create or merge a Pull Request.

If any Git operation could affect `main`, STOP and ask me first.

## Important

This workflow is part of the project's permanent development rules.

Read `PROJECT_WORKFLOW.md` before performing Git operations or making changes that could affect the repository history.

Do not change these rules unless explicitly asked to change them.
