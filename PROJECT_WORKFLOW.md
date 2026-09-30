# PROJECT_WORKFLOW.md — STS Daily Report (Improvement Workflow)

> Mandatory development rules. Read this file before performing any future Git-related operation.
> Do not change these rules unless explicitly asked to change them.

## Project Purpose

This project is an improvement of the existing Daily Report system.

We are NOT creating a completely new feature from scratch.
The current work should be treated as an improvement to the existing system.

Intended branch (once the correct remote repository is confirmed):

`improvement/daily-report`

## Branch Structure

```text
main
  ↑
dev
  ↑
improvement/daily-report
```

### Protected branches

`main` and `dev` are protected branches.

Under NO circumstances should you directly:

- modify code on `main`
- modify code on `dev`
- commit directly to `main`
- commit directly to `dev`
- rebase `main`
- rebase `dev`
- reset `main`
- reset `dev`
- merge into `main`
- merge into `dev`
- force-push to `main`
- force-push to `dev`

The development work must happen only on:

`improvement/daily-report`

## Development Workflow

1. Before doing anything, inspect the current project structure and Git status.
2. Confirm which branch is currently checked out.
3. Never assume that `main` or `dev` is safe to modify.
4. The improvement branch must be based on the latest `origin/dev`.
5. All code changes must be made only on:
   `improvement/daily-report`
6. Existing functionality must be preserved unless the requested improvement explicitly requires changing it.

## Rebase Workflow

If `dev` receives new commits while development is in progress:

```bash
git fetch origin
git checkout improvement/daily-report
git rebase origin/dev
```

The rebase direction must always be:

`improvement/daily-report` → `origin/dev`

Never rebase `main` or `dev`.

If a conflict occurs during rebase:

**STOP immediately and ask me what to do.**

Do NOT automatically:

- choose "ours"
- choose "theirs"
- discard changes
- overwrite files
- resolve the conflict based on assumptions

## Push Rules

Only push:

`improvement/daily-report`

Never push directly to:

`main`
`dev`

Do not use `git push --force`.

If a force push is ever genuinely required after a rebase, STOP and ask for my explicit approval first. If approved, use:

`git push --force-with-lease`

## Merge / Pull Request Rules

Do NOT automatically:

- merge `improvement/daily-report` into `dev`
- merge `improvement/daily-report` into `main`
- create a PR
- approve a PR
- merge a PR

When the improvement is complete, stop after testing and pushing the improvement branch and ask me before any merge or PR action.

## Safety Rule

If you are ever unsure whether a Git command could modify `main` or `dev`, STOP and ask me before running it.

Do not make assumptions.

Before every Git-related operation, verify the current branch.

Development must be done only on an improvement/* branch.

Never automatically merge into dev or main.

Never automatically create or merge a Pull Request.

If any Git operation could affect main or dev, STOP and ask me first.

## Important

This workflow is part of the project's permanent development rules.

Read `PROJECT_WORKFLOW.md` before performing Git operations or making changes that could affect the repository history.

Do not change these rules unless explicitly asked to change them.
