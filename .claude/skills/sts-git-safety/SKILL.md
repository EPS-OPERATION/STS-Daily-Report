---
name: sts-git-safety
description: Mandatory git procedure for STS Daily Report - work only on improvement/daily-report, never touch main or dev, rebase onto origin/dev only, stop on conflicts, no force push, no automatic PR or merge. Use before ANY git command that commits, rebases, merges, resets, pushes, checks out, or creates branches/PRs.
---

# Git safety (summary of PROJECT_WORKFLOW.md — that file wins if they differ)

## Before every git write

```sh
git branch --show-current     # must be improvement/daily-report (or another improvement/* the user named)
git status --short
```

If the branch is `main` or `dev` → STOP, tell the user, do not "fix" it by committing elsewhere.

## Allowed

- Commit on `improvement/daily-report` **only when the user asks** to commit. Stage specific files
  (never `git add -A` blindly — `.env`, `.vscode/`, local overrides must stay out). Include `AGENT.md` updates
  in the same commit as the change they describe.
- Sync with dev: `git fetch origin && git rebase origin/dev` (on the improvement branch only).
- Push: `git push origin improvement/daily-report` when asked.

## Forbidden without explicit user approval in this conversation

- Any commit / merge / rebase / reset / push on `main` or `dev`.
- `git push --force` (ever). After an approved rebase, only `git push --force-with-lease`, and only after asking.
- Creating, approving or merging a PR; merging the improvement branch into `dev` or `main`.
- `git reset --hard`, `git checkout -- <file>`, `git clean`, `git stash drop` on the user's uncommitted work.

## Rebase conflict

STOP immediately. Show `git status` and the conflicted files, explain both sides, and ask what to do.
Do not pick ours/theirs, do not `git rebase --skip`, do not abort without asking.

## When finished

Typecheck/verify → (if asked) commit and push the improvement branch → stop and ask before any PR or merge.
