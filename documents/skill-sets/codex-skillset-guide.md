# Managing and Using the Codex Skill Set

## Purpose

This guide explains how to use and maintain the skills installed from the `bigyangg/skillset-buddhimanai` repository.

## Where the skills are installed

The skills are installed globally for this Windows user, not inside a single project:

```text
C:\Users\DELL\.codex\skills\
```

Each skill has its own folder containing a `SKILL.md` file. Codex reads these files to understand when and how to apply the associated workflow.

You do not need to add a PowerShell environment variable. Start a new Codex conversation after installing or updating skills.

## How to use a skill

Use a normal, clear request. Codex selects a relevant skill automatically when its description matches the task.

Examples:

```text
Review this backend for security issues.
```

```text
Design the database schema for student fees and payment records.
```

```text
Make this React page responsive and accessible.
```

You can also name the skill explicitly when you want a specific workflow:

```text
Use the security-audit skill to check this project.
```

```text
Use frontend-ui-engineering to build the dashboard page.
```

## Choosing the right skill

| Need | Example skill |
| --- | --- |
| Plan a feature before coding | `spec-driven-development`, `planning-and-task-breakdown` |
| Build a user interface | `frontend-ui-engineering`, `web-accessibility`, `mobile-responsiveness` |
| Design APIs or databases | `api-and-interface-design`, `database-design` |
| Test or debug | `test-driven-development`, `e2e-testing`, `debugging-and-error-recovery` |
| Review security | `security-audit`, `security-and-hardening`, `owasp-security` |
| Deploy an application | `docker`, `vercel`, `railway`, `ci-cd-and-automation` |
| Write technical documents | `documentation-and-adrs`, `technical-blog` |

## Managed workflow

Use this lightweight process for project work:

1. Define the request and acceptance criteria.
2. Ask Codex to use a planning or specification skill for non-trivial work.
3. Implement in small, testable changes.
4. Run the relevant test, review, and security skills before merging or deploying.
5. Record important technical decisions in project documentation.

Example managed request:

```text
Use spec-driven-development to define the student payment feature. Then use database-design and test-driven-development to implement it. Finish with code-review-and-quality.
```

## Updating the skills

When the GitHub repository changes, reinstall the skills using the same installer process. Do this in a new Codex session or ask Codex:

```text
Update my global Codex skills from https://github.com/bigyangg/skillset-buddhimanai.git.
```

Before replacing an existing skill, review its `SKILL.md` and any scripts it includes. Keep a copy of locally customized skills before updating them.

## Adding a new custom skill

Create a new folder under `C:\Users\DELL\.codex\skills\` and add a `SKILL.md` file. Its front matter should include a unique `name` and a clear `description` stating when Codex should use it.

Example:

```markdown
---
name: tuition-system-review
description: Review this tuition-management system for authentication, payment, and data-integrity risks. Use before releases or major changes.
---

# Tuition System Review

Add the workflow, checks, and expected output here.
```

Restart or begin a new Codex conversation after adding the skill.
