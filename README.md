# Antigravity Workflow Kit

A complete, AI agent workflow system for software projects. Drop the `.agents/` folder directly into any project root to immediately equip your AI assistant with persistent memory, structured project planning, codebase intelligence, browser automation, and disciplined sub-agent orchestration.

---

## Quick Setup

Copy the entire `.agents/` folder directly into your project root:

```
your-project/
├── .agents/
│   ├── AGENTS.md
│   ├── rules/
│   │   ├── coding-conventions.md
│   │   └── graphify-template.md       ← rename to graphify.md after setup
│   ├── skills/                        # project-scoped skills
│   │   ├── browser-act-chatgpt-images/
│   │   ├── browser-act-chatgpt-images-linux/
│   │   ├── graphify/
│   │   ├── playwright-cli/
│   │   ├── playwright-cli-bridge/
│   │   ├── ponytail/
│   │   ├── project-planner/
│   │   ├── skill-creator/
│   │   ├── subagent-dispatch/
│   │   ├── wiki-crystallize/
│   │   ├── wiki-ingest/
│   │   ├── wiki-lint/
│   │   ├── wiki-query/
│   │   └── wiki-reconcile/
│   └── workflows/                     # 10 project-scoped workflows
│       ├── create-customization.md
│       ├── graphify.md
│       ├── mark-off.md
│       ├── prompt-write.md
│       ├── push-to-gh.md
│       ├── start-phase.md
│       ├── verify-no-tasks.md
│       ├── verify.md
│       ├── wiki-audit.md
│       └── wiki-review.md
```

---

## What's Inside

| Layer | What it gives you |
|---|---|
| **Agent Brain (AGENTS.md)** | The AI's operating doctrine — memory management, sub-agent orchestration, session protocols, supersession rules |
| **Wiki Memory System** | A persistent, structured knowledge base (`wiki-ingest`, `wiki-query`, `wiki-lint`, `wiki-reconcile`, `wiki-crystallize`) |
| **Project Planner** | A wizard that generates PRD → Design → Frontend Spec → Tasks (with intra-phase ordering) |
| **Graphify Integration** | AST-based codebase knowledge graph — query relationships, trace call chains |
| **Sub-agent Dispatch** | Persona-based specialist agents for research, debugging, QA, and verification |
| **Browser-Act Integration** | CLI browser automation with stealth, captcha bypass, and persistent managed profiles (`browser-act-chatgpt-images`, `browser-act-chatgpt-images-linux`) |
| **Playwright CLI & Bridge** | Complete browser automation suite + CDP bridge to attach to live browser sessions |
| **Task Workflows** | `/start-phase`, `/verify`, `/mark-off` — structured phase-by-phase development |
| **Wiki Workflows** | `/wiki-audit`, `/wiki-review` — keep the knowledge base accurate and current |
| **Coding Conventions** | Strict, language-agnostic rules enforced on every code generation |
| **Ponytail** | Anti-bloat discipline — forces the laziest solution that actually works |

---

## Initializing a Project

### Step 1 — Configure Graphify
1. Rename `.agents/rules/graphify-template.md` to `.agents/rules/graphify.md`
2. Open it and replace every instance of `<YOUR_CODE_DIRS>` with your actual code directories (e.g., `backend frontend`, `src`, `app`)
3. In a new session, run `/graphify <your_dirs>` to build the initial knowledge graph

### Step 2 — Initialize the Wiki
Create the `.memory/` structure in your project root:

```
your-project/
└── .memory/
    ├── raw/          ← drop source documents here for ingestion
    └── wiki/
        ├── index.md
        ├── log.md
        ├── overview.md
        ├── functions/
        ├── systems/
        ├── concepts/
        └── sources/
```

Minimum content for `wiki/index.md`:
```markdown
# Wiki Index

*No pages yet. Run `/wiki-ingest` on your first raw source to begin.*
```

Minimum content for `wiki/log.md`:
```markdown
# Wiki Log

*Append-only audit trail. Never delete entries.*
```

### Step 3 — Set up the Playwright bridge (optional)
If you want browser automation through the persistent CLI bridge, copy the `bridge/` files to a working directory (e.g., `d:\AI` or `~/ai-bridge`):

```
bridge/
├── pw-bridge.bat           # Entry point — run all commands through this
├── pw-bridge.ps1           # PowerShell script that proxies to the bridge server
├── pw_bridge_server.py     # Persistent Python server that holds the browser connection
└── launch_brave_rp.bat     # Launches Brave with --remote-debugging-port=9222
```

---

## Browser-Act Setup & Multi-Account Workflow (Optional)

Browser-Act is a browser automation CLI with stealth and captcha bypass. It operates with persistent managed profiles so your sessions, cookies, and extensions persist cleanly without manual process orchestration.

### 1. Profile Inspection & Discovery
Inspect existing managed profiles and local Chrome profiles:
```bash
browser-act browser list
browser-act browser list-profiles
```

### 2. Session Launch & Profile Targeting
Launch a headed browser session attached to a specific persistent profile:
```bash
browser-act --session my-session browser open <browser_id> https://chatgpt.com/ --headed
```

### 3. Multi-Account Rotation
To rotate between accounts (e.g. bypassing rate limits), close the active session and launch the next profile:
```bash
# Close current session
browser-act session close my-session

# Launch failover account
browser-act --session my-session browser open <backup_browser_id> https://chatgpt.com/ --headed
```

---

## How It Works

### The Agent Brain (`AGENTS.md`)
`AGENTS.md` is the AI's operating doctrine. It defines:
- **Session Start Protocol** — what the AI reads at the start of every session (`wiki/index.md`, recent logs, active tasks)
- **Memory System** — three-layer knowledge base (`raw/` → `wiki/` → `AGENTS.md`)
- **Sub-agent Delegation** — what to delegate vs. handle directly, how to dispatch, how to harvest results
- **Critical Rules** — 15 non-negotiable rules the AI follows at all times

### Slash Commands
| Command | What it does |
|---|---|
| `/graphify <dirs>` | Build or rebuild the codebase knowledge graph |
| `/wiki-audit` | Structural lint + semantic reconcile of the wiki |
| `/wiki-review` | Deep periodic review — sub-agents compare wiki claims to live code |
| `/start-phase <n>` | Plan Phase N from TASKS.md |
| `/verify <n>` | Run an unbiased sub-agent verification of Phase N's checkpoint |
| `/verify-no-tasks` | Global unbiased verification not tied to a phase |
| `/mark-off <n>` | Mark all of Phase N's tasks as complete |
| `/push-to-gh` | Stage, commit, and push to GitHub |
| `/prompt-write` | Write a new workflow, rule, or skill |
| `/create-customization` | Full guide for creating new skills, rules, and workflows |
