You are doing a pre-commit review for the FSH AI Job Coach project. Follow these steps:

## 1. Gather context

Run these commands and read the output:
- `git diff HEAD` — all uncommitted changes (staged + unstaged)
- `git diff --cached` — staged only (if HEAD diff is empty, a commit may already be staged)
- `git status` — overall state
- `git log --oneline -10` — recent commit history for context

Read any files that were changed but whose full context is needed to evaluate correctness.

## 2. Review the diff

Evaluate the changes against the following criteria:

**Completeness**
- Does the implementation fully satisfy the feature or fix that was being worked on?
- Are there any half-finished pieces (TODOs, placeholder logic, missing wiring)?

**Edge cases**
- What happens on empty/null input, network failure, or unexpected data shapes?
- Are destructive actions (delete, clear, overwrite) guarded with a confirmation dialog per CLAUDE.md conventions?
- Are loading/async states handled (skeleton, disabled button, snackbar feedback)?

**Correctness against conventions** (from CLAUDE.md)
- AI routes return flat `{ key: string | number | boolean }` objects — no nested objects or arrays
- AI routes use `getDecryptedSettings` from `@/lib/settings`, never inline the prisma+decrypt pattern
- RTK Query mutations use `.unwrap()` inside try/catch — not the `'error' in result` pattern
- `<form>` elements with RHF have `noValidate`
- Node built-in imports use `node:` protocol
- Required env vars use an explicit guard, not `!` non-null assertion
- Template literals used instead of string concatenation
- New MUI Dialogs have a close `IconButton` in the upper-right per the documented pattern
- No `* { box-sizing: border-box }` in CSS

**Value / quality**
- Is there anything obviously missing that would make this feature more useful or robust?
- Any patterns here that differ from how similar features are built in the rest of the codebase?

## 3. Summarize findings

Respond with:

### Status
One of: ✅ Ready to commit | ⚠️ Minor issues | ❌ Issues to fix

### What looks good
Brief bullets on what is solid.

### Issues / recommendations
Numbered list. For each item: what it is, why it matters, and a short code snippet or suggested fix if applicable. Separate "must fix before commit" from "nice to have."

### Suggested commit message
A concise conventional-style commit message (e.g. `feat: add fit score chip to LogCard`) based on what the diff actually does.

## 4. Update CLAUDE.md

After the review, scan the diff for anything that should be reflected in CLAUDE.md but isn't already there:
- New libraries or dependencies added
- New architectural patterns or conventions established
- New features built (add to folder structure, AI features, or relevant section)
- New models or schema changes
- Anything that future-Claude would need to know to work on this codebase effectively

If you find anything, update CLAUDE.md directly. Be concise — add to the right existing section rather than appending a new one unless it's genuinely a new category. Do not duplicate what's already there.
