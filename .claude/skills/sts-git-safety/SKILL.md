---
name: sts-git-safety
description: Mandatory git procedure for STS Daily Report - work only on dev, never touch main, stop on conflicts, no force push, no automatic PR or merge. Use before ANY git command that commits, rebases, merges, resets, pushes, checks out, or creates branches/PRs.
---

# Git safety (summary of PROJECT_WORKFLOW.md — that file wins if they differ)

## Before every git write

```sh
git branch --show-current     # must be dev
git status --short
```

If the branch is `main` → STOP, tell the user, do not "fix" it by committing elsewhere.

## Allowed

- Commit on `dev` **only when the user asks** to commit. Stage specific files
  (never `git add -A` blindly — `.env`, `.vscode/`, local overrides must stay out). Include `AGENT.md` updates
  in the same commit as the change they describe.
- Sync with remote: `git fetch origin && git pull origin dev` (on `dev`, when asked).
- Push: `git push origin dev` when asked — pushing `dev` deploys the dev environment.

## Forbidden without explicit user approval in this conversation

- Any commit / merge / rebase / reset / push on `main`.
- `git push --force` (ever). After an approved rewrite, only `git push --force-with-lease`, and only after asking.
- Rebasing or force-pushing `dev` (it is shared).
- Creating, approving or merging a PR; merging `dev` into `main`.
- `git reset --hard`, `git checkout -- <file>`, `git clean`, `git stash drop` on the user's uncommitted work.

## Conflict

STOP immediately. Show `git status` and the conflicted files, explain both sides, and ask what to do.
Do not pick ours/theirs, do not resolve conflicts based on assumptions.

## When finished

Typecheck/verify → (if asked) commit and push `dev` → stop and ask before any PR or merge into `main`.
