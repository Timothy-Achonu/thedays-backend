# Agent instructions (TheDays API)

All automated agents (and humans using agent-assisted workflows) should treat this file as the default playbook for how to work in this repository.

This is the **TheDays backend**: a Node.js / Express / TypeScript REST API with Prisma and PostgreSQL. Product requirements live in [project-documents/TheDays-PRD-separate-repos.md](project-documents/TheDays-PRD-separate-repos.md). Treat that document as the product contract. The frontend lives in a separate repo (`thedays-frontend`); if the two PRD copies disagree, ask before proceeding.

## Use project skills

Before answering, planning, or changing code, **scan the project skills**. Cursor skills live under [`.cursor/skills`](.cursor/skills), and Codex-specific equivalents live under [`.codex/skills`](.codex/skills). Each skill is a `SKILL.md` inside a named folder (for example `.cursor/skills/code-pattern/SKILL.md` or `.codex/skills/code-pattern/SKILL.md`).

1. **Discover:** List or read the `SKILL.md` files in `.cursor/skills` and `.codex/skills` to see what guidance exists.
2. **Match:** Pick the skill(s) relevant to the current task:
   - **`code-pattern`** — implementation and refactors: Express/Prisma/Zod, ownership, date/timezone rules, REST contract, TypeScript conventions, minimal diffs.
   - **`code-explanation`** — explaining existing code: structured, beginner-friendly, then precise.
   - **`grill-me`** — features, architecture, and product ideas: interrogate requirements before building; challenge assumptions, edge cases, and weak designs.
3. **Apply:** Let the chosen skill shape your **response**, **plan**, and **code edits**. If multiple skills apply (e.g. explain then implement), follow them in a sensible order.
4. **Keep equivalents aligned:** When changing a project skill, update both the Cursor copy and its Codex equivalent when both exist.
5. **User/global skills:** If the environment also exposes skills under the user’s global `.cursor/skills-cursor`, global `.codex/skills`, or similar, consider those when the task matches their descriptions, but prefer the project-local copy when this repo has one.

When in doubt, prefer **`code-pattern`** for any code or plan that touches implementation.

## Scope and safety

- Keep changes focused on the user’s request; avoid drive-by refactors.
- Do not add dependencies unless necessary; match existing patterns in nearby files.
- Do not connect this API to frontend source files. The public HTTP JSON contract is the only shared surface.
