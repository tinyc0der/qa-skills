---
name: set-up-qa-workspace
description: Set up a QC's QA workspace. Check that the QA skills can reach Jira, Confluence, Figma, TestRail, and the app tools, and draft or refresh the workspace's `AGENTS.md`, a short overview of the product's modules, users, and terms that agents load every session. Use when the QC starts a new workspace, asks to set up or check their setup, or asks to write or update the product overview, such as after a release adds a module.
disable-model-invocation: true
---

# Set Up QA Workspace

Checks the connections the QA skills use and writes the workspace's `AGENTS.md`, so every session starts with a map of the product. [Workspace AGENTS.md](./references/agents-md.md) defines its content and template.

**When to skip steps:**

- The QC asks only to check the setup → Step 1, then report. Write nothing but `.gitignore`.
- The QC asks only to write or refresh the overview → skip Step 1.

## Rules

- Run from the QA workspace root: the folder that holds, or will hold, `tickets/`, `domain/`, and `.env`.
- Check TestRail only when `sync-test-cases-with-testrail` is installed. Every other check serves `gather-context`, which the plugin always bundles.
- Each setting stays with the skill that owns it: run that skill's check, and ask for what is missing as its setup says.
- **Every line of the overview comes from a source or from the QC, never from what the agent knows of the product or the market.**
- Create no empty folders: each skill creates its own when it first writes there.

## Workflow

### 1. Check the workspace

Run every check before asking anything.

- Jira and Confluence: one read through the Atlassian MCP succeeds, such as the current user.
- Figma: one read through the Figma MCP succeeds.
- TestRail: run `list` with the `sync-test-cases-with-testrail` skill and read only its first lines or its error. Its Setup says what each `.env` variable holds.
- `.env` in a git repo: `git check-ignore -q .env` fails → add `.env` to `.gitignore`, so the API key never reaches the history.
- Web app: `agent-browser --version` works and the `agent-browser` skill is installed. Missing → `npm i -g agent-browser && agent-browser install`, then `npx skills add vercel-labs/agent-browser`.
- Android and iOS apps: `agent-device --version` works. Missing → `npm i -g agent-device`.
- Skip the tool of a platform the product does not have.
- Never install a tool or connect an MCP server yourself: the report names the command or the connection.

### 2. Draft the overview

Draft it as [Workspace AGENTS.md](./references/agents-md.md) says. Read for a map, not a spec: titles, overview pages, and navigation, not every story.

- Product and Jira project: the projects and components of the stories the QC tested lately.
- Modules and screens: TestRail's top-level sections in the `list` output, the product's Confluence space and its overview pages, the Figma files those stories link, and the live app's main navigation when `automation-lessons/` names its URL. Navigate only; submit nothing.
- Users: the account types and roles the sources name.
- Terms: abbreviations the stories use that a source defines. A term no source defines stays out.
- A link no source gives stays out. Never guess a URL.
- `AGENTS.md` exists → keep its lines and any other content as they are, add what the sources show is new, and mark the lines a source contradicts. **Never drop a line without the QC's yes.**

### 3. Ask once

Ask as the [`message-the-qc`](../message-the-qc/SKILL.md) skill lays out: first the values only the QC has, such as missing `.env` values, then the draft, or the changes to an existing `AGENTS.md`, with:

```
❓ Write this overview to AGENTS.md?

1. ✅ Write it
2. ✏️ Type changes
```

The outcome line counts the checks, such as `5 ready · 1 missing`. Each check that failed names the command or the connection that fixes it.

### 4. Write, commit, and read back

- Write `AGENTS.md` as approved, and `CLAUDE.md` as [Workspace AGENTS.md](./references/agents-md.md) says.
- Save the `.env` values the QC gave, as the `sync-test-cases-with-testrail` setup says.
- If the workspace is a git repo, commit only the files written, never `.env`, so the commit never takes the QC's other staged work: `git add <files> && git commit -m "Set up the QA workspace" -- <files>`.
- Read the files back, and run again each check whose values the QC gave.
- Report the checks still failing and the files written, as `message-the-qc` lays out. The next step is the QC's first story.
