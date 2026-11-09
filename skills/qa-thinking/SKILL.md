---
name: qa-thinking
description: Analyze a Jira ticket, Confluence requirement, Figma design, or a feature in the live app from a QA perspective — edge cases, negative flows, abuses, unobvious scenarios. Use when asked "what could go wrong?", "what am I missing?", or "review this as QA".
---

# QA Thinking

Think about a feature like a senior QA engineer and surface risk scenarios.
Explain these risks to the team and the product owner.
You are provided with a Jira ticket, a Confluence requirement, a Figma design, or a feature in the live app.
You must provide a critical review of it from QA perspective and ask clarifying questions.
Read Jira and Confluence through the Atlassian MCP, Figma through the Figma MCP, and the live app with the `agent-browser` skill. Missing connection → stop and ask for it.

## Think as QA

- What this feature is about
- How it aligns with existing features, common product patterns, business intent
- Does similar behavior already exist: feature catalog, Confluence, TestRail, the app? (aren't we duplicating existing behavior)
- Negative scenarios: possible misuse and failures.
- Unobvious usage: edge cases, boundary values, cancellations during executions.
- Combinations: how this feature interacts with other features.
- Security vulnerabilities.

## Output

Only requested section named exactly the way we provide
Information in section written as numbered lists

Requested sections:


- Section `👷 Must be aknowledged`: brief summary in bullet points. Potential correlation with other areas. Potential risks
- Section `👓 Must be clarified`: up to 5 questions to resolve important ambiguities. Start each with "What if".
- Section `🔬 Must be verified`: up to 5 most important risk scenarios, no more.
- Prefer simple wording and short sentences.

## Next actions

Offer after the analysis:

- Draft missing or unclear user stories → `write-user-story` skill.
- Turn scenarios into test cases or a checklist → `qa-write-test-cases` skill.
- Ambiguities point to requirement defects → `epic-requirement-reviewer` skill.
