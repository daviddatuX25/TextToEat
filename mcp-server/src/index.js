#!/usr/bin/env node
/**
 * AgentCore MCP Server
 *
 * Tools:
 *  - goal_read        Read current goal and state
 *  - goal_write       Create/update goal file
 *  - phase_get        Get current TDD phase
 *  - phase_set        Transition TDD phase (enforces valid transitions)
 *  - task_complete    Mark task done, get next
 *  - decision_log     Record decision + rationale
 *  - session_summary  Structured resume data
 *  - obstacle_check   Active obstacle warnings
 *  - health_check     Agentic mode health assessment
 *  - mode_get         Get current autonomy mode
 *  - mode_set         Switch autonomy mode
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const GOAL_FILE = path.join(PROJECT_ROOT, ".agent", "goal.md");
const AGENT_DIR = path.join(PROJECT_ROOT, ".agent");

// ── TDD Phase State Machine ────────────────────────────────────────────────
const TDD_PHASES = {
  "🔴": { label: "Red — Write failing test", next: "🟢", prev: null },
  "🟢": { label: "Green — Make test pass", next: "🧹", prev: "🔴" },
  "🧹": { label: "Refactor", next: "✅", prev: "🟢" },
  "✅": { label: "Complete — ready to commit", next: "🔴", prev: "🧹" },
  "🛑": { label: "Blocked", next: null, prev: null },
  "🔍": { label: "Analyzing", next: "🔴", prev: null },
};

const VALID_MODES = ["agentic", "cyborg", "centaur"];

// ── Agentic recovery tracking (in-memory per session) ──────────────────────
let recoveryAttempts = 0;
let stepCount = 0;

// ── File Helpers ────────────────────────────────────────────────────────────
function ensureAgentDir() {
  if (!fs.existsSync(AGENT_DIR)) fs.mkdirSync(AGENT_DIR, { recursive: true });
}

function readGoalFile() {
  ensureAgentDir();
  if (!fs.existsSync(GOAL_FILE)) return null;
  return fs.readFileSync(GOAL_FILE, "utf8");
}

function writeGoalFile(content) {
  ensureAgentDir();
  fs.writeFileSync(GOAL_FILE, content, "utf8");
}

function parseGoalFile(content) {
  if (!content) return null;
  const result = {
    title: "",
    acceptance: "",
    phase: "🤖",
    mode: "agentic",
    tasks: { pending: [], completed: [] },
    decisions: [],
    notes: "",
    lastSession: {},
  };

  const titleMatch = content.match(/^# Goal: (.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  const phaseMatch = content.match(/TDD Phase:\s*([🔴🟢🧹✅🛑🔍🤖])/u);
  if (phaseMatch) result.phase = phaseMatch[1];

  const modeMatch = content.match(/Mode:\s*(agentic|cyborg|centaur)/i);
  if (modeMatch) result.mode = modeMatch[1].toLowerCase();

  const taskLines = content.match(/^- \[[ x]\] .+$/gm) || [];
  for (const line of taskLines) {
    if (line.startsWith("- [x]")) {
      result.tasks.completed.push(line.replace("- [x] ", "").trim());
    } else {
      result.tasks.pending.push(line.replace("- [ ] ", "").trim());
    }
  }

  const decisionsMatch = content.match(/## Decisions\n([\s\S]*?)(?=\n## |\n*$)/);
  if (decisionsMatch) {
    result.decisions = decisionsMatch[1]
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-\s*/, "").trim());
  }

  const acceptMatch = content.match(/## Acceptance Criterion\n([\s\S]*?)(?=\n## )/);
  if (acceptMatch) result.acceptance = acceptMatch[1].trim();

  return result;
}

function updateFieldInFile(content, pattern, replacement) {
  if (pattern.test(content)) {
    return content.replace(pattern, replacement);
  }
  return content;
}

function updatePhaseInFile(content, newPhase) {
  if (/TDD Phase:\s*[🔴🟢🧹✅🛑🔍🤖]/u.test(content)) {
    return content.replace(/TDD Phase:\s*[🔴🟢🧹✅🛑🔍🤖]/u, `TDD Phase: ${newPhase}`);
  }
  if (content.includes("## Status")) {
    return content.replace("## Status\n", `## Status\nTDD Phase: ${newPhase}\n`);
  }
  return content;
}

function updateModeInFile(content, newMode) {
  if (/Mode:\s*(agentic|cyborg|centaur)/i.test(content)) {
    return content.replace(/Mode:\s*(agentic|cyborg|centaur)/i, `Mode: ${newMode}`);
  }
  if (content.includes("TDD Phase:")) {
    return content.replace(/(TDD Phase:.*)\n/, `$1\nMode: ${newMode}\n`);
  }
  return content;
}

// ── MCP Server ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "agentcore",
  version: "2.0.0",
});

// ── goal_read ───────────────────────────────────────────────────────────────
server.tool(
  "goal_read",
  "Read current session goal, TDD phase, mode, tasks, and decisions",
  {},
  async () => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              exists: false,
              message:
                "No .agent/goal.md found. Use goal_write to create one.",
            }),
          },
        ],
      };
    }
    const parsed = parseGoalFile(content);
    return {
      content: [
        { type: "text", text: JSON.stringify({ exists: true, ...parsed, raw: content }) },
      ],
    };
  }
);

// ── goal_write ──────────────────────────────────────────────────────────────
server.tool(
  "goal_write",
  "Create or update goal file with feature name, acceptance, tasks, phase, and mode",
  {
    title: z.string().describe("Feature or task name"),
    acceptance: z.string().optional().describe("Acceptance criterion"),
    tasks: z.array(z.string()).optional().describe("Initial pending tasks"),
    phase: z
      .enum(["🔴", "🟢", "🧹", "✅", "🛑", "🔍"])
      .optional()
      .describe("Starting TDD phase"),
    mode: z
      .enum(["agentic", "cyborg", "centaur"])
      .optional()
      .describe("Autonomy mode"),
    notes: z.string().optional().describe("Additional context"),
  },
  async ({ title, acceptance, tasks, phase, mode, notes }) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const taskLines = (
      tasks || [
        "Write first failing test",
        "Make it pass",
        "Refactor",
      ]
    )
      .map((t) => `- [ ] ${t}`)
      .join("\n");

    const content = `# Goal: ${title}

## Acceptance Criterion
${acceptance || "[Define how you know this feature is done]"}

## Status
TDD Phase: ${phase || "🔴"}
Mode: ${mode || "agentic"}

## Tasks
${taskLines}

## Decisions
<!-- Record non-obvious choices here -->

## Notes
${notes || ""}
- Started: ${timestamp}

## Last Session
- Time: ${timestamp}
- Branch: [check git]
`;

    writeGoalFile(content);
    recoveryAttempts = 0;
    stepCount = 0;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `Goal: "${title}" | Phase: ${phase || "🔴"} | Mode: ${mode || "agentic"}`,
            path: GOAL_FILE,
          }),
        },
      ],
    };
  }
);

// ── phase_get ───────────────────────────────────────────────────────────────
server.tool(
  "phase_get",
  "Get current TDD phase and next expected phase",
  {},
  async () => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ phase: null, message: "No goal file" }) },
        ],
      };
    }
    const parsed = parseGoalFile(content);
    const phaseInfo = TDD_PHASES[parsed.phase] || { label: "Unknown", next: null };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            phase: parsed.phase,
            label: phaseInfo.label,
            nextPhase: phaseInfo.next,
            mode: parsed.mode,
            pendingTasks: parsed.tasks.pending.length,
            nextTask: parsed.tasks.pending[0] || null,
          }),
        },
      ],
    };
  }
);

// ── phase_set ───────────────────────────────────────────────────────────────
server.tool(
  "phase_set",
  "Transition TDD phase. Enforces valid transitions unless overriding with 🛑 or 🔍.",
  {
    phase: z
      .enum(["🔴", "🟢", "🧹", "✅", "🛑", "🔍"])
      .describe("Target phase"),
    reason: z.string().optional().describe("Why this transition"),
  },
  async ({ phase, reason }) => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, message: "No goal file" }),
          },
        ],
      };
    }

    const parsed = parseGoalFile(content);
    const current = parsed.phase;
    const phaseInfo = TDD_PHASES[current];

    if (
      phase !== "🛑" &&
      phase !== "🔍" &&
      phaseInfo?.next !== phase &&
      current !== phase
    ) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              message: `Invalid: ${current} → ${phase}. Expected: ${phaseInfo?.next || "none"}`,
              currentPhase: current,
              validNext: phaseInfo?.next,
            }),
          },
        ],
      };
    }

    const updated = updatePhaseInFile(content, phase);
    writeGoalFile(updated);
    stepCount++;

    if (phase === "✅") recoveryAttempts = 0;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            transition: `${current} → ${phase}`,
            label: TDD_PHASES[phase]?.label,
            reason: reason || "Phase advanced",
            stepCount,
          }),
        },
      ],
    };
  }
);

// ── task_complete ───────────────────────────────────────────────────────────
server.tool(
  "task_complete",
  "Mark a task as complete and return the next one",
  {
    task: z.string().optional().describe("Task to complete (default: first pending)"),
  },
  async ({ task }) => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: false, message: "No goal file" }) },
        ],
      };
    }

    const parsed = parseGoalFile(content);
    const toComplete = task || parsed.tasks.pending[0];

    if (!toComplete) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, message: "No pending tasks" }),
          },
        ],
      };
    }

    const updated = content.replace(
      `- [ ] ${toComplete}`,
      `- [x] ${toComplete}`
    );
    writeGoalFile(updated);

    const updatedParsed = parseGoalFile(updated);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            completed: toComplete,
            nextTask: updatedParsed.tasks.pending[0] || null,
            remaining: updatedParsed.tasks.pending.length,
            allDone: updatedParsed.tasks.pending.length === 0,
          }),
        },
      ],
    };
  }
);

// ── decision_log ────────────────────────────────────────────────────────────
server.tool(
  "decision_log",
  "Record a decision and its rationale in the goal file",
  {
    decision: z.string().describe("What was decided"),
    rationale: z.string().describe("Why"),
  },
  async ({ decision, rationale }) => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: false, message: "No goal file" }) },
        ],
      };
    }

    const entry = `- ${decision}: ${rationale}`;
    let updated = content;

    if (content.includes("<!-- Record non-obvious choices here -->")) {
      updated = content.replace(
        "<!-- Record non-obvious choices here -->",
        `<!-- Record non-obvious choices here -->\n${entry}`
      );
    } else {
      updated = content.replace(/## Decisions\n/, `## Decisions\n${entry}\n`);
    }

    writeGoalFile(updated);
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, logged: entry }) }],
    };
  }
);

// ── session_summary ─────────────────────────────────────────────────────────
server.tool(
  "session_summary",
  "Structured resume data — everything needed to pick up where left off",
  {},
  async () => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              canResume: false,
              message: "No .agent/goal.md. Use /feature-start to begin.",
            }),
          },
        ],
      };
    }

    const parsed = parseGoalFile(content);
    const phaseInfo = TDD_PHASES[parsed.phase] || {};

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            canResume: true,
            goal: parsed.title,
            acceptance: parsed.acceptance,
            phase: { symbol: parsed.phase, label: phaseInfo.label },
            mode: parsed.mode,
            nextTask: parsed.tasks.pending[0] || "All tasks complete",
            pendingCount: parsed.tasks.pending.length,
            completedCount: parsed.tasks.completed.length,
            recentDecisions: parsed.decisions.slice(-3),
            resumePrompt: `Goal: "${parsed.title}" | Phase: ${parsed.phase} (${phaseInfo.label}) | Mode: ${parsed.mode} | Next: ${parsed.tasks.pending[0] || "done"}`,
          }),
        },
      ],
    };
  }
);

// ── obstacle_check ──────────────────────────────────────────────────────────
server.tool(
  "obstacle_check",
  "Returns active obstacle warnings based on session state",
  {
    contextMessageCount: z.number().optional().describe("Messages in context"),
    consecutiveFailures: z.number().optional().describe("Consecutive test failures"),
  },
  async ({ contextMessageCount, consecutiveFailures }) => {
    const warnings = [];
    const msgCount = contextMessageCount || 0;
    const failures = consecutiveFailures || 0;

    if (msgCount > 20) {
      warnings.push({
        obstacle: "O01 · Context Drift",
        severity: "high",
        action:
          "Start a focused sub-session. Re-read .agent/goal.md.",
      });
    }

    if (failures >= 3) {
      warnings.push({
        obstacle: "O03/O04 · Hallucination / Limited Self-Awareness",
        severity: "high",
        action:
          "3+ failures = wrong mental model. Use /recover to stop, diagnose, restart.",
      });
    }

    if (msgCount > 10) {
      warnings.push({
        obstacle: "O06 · Context Budget",
        severity: "medium",
        action: "Prefer distilled output. Reference files by path.",
      });
    }

    if (stepCount > 15) {
      warnings.push({
        obstacle: "O08 · Completion Bias",
        severity: "medium",
        action:
          "Many steps taken. Run health_check to verify still on track.",
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            warnings,
            healthy: warnings.length === 0,
            message:
              warnings.length === 0
                ? "No active warnings."
                : `${warnings.length} obstacle(s) — review and mitigate.`,
          }),
        },
      ],
    };
  }
);

// ── health_check (Agentic Mode) ────────────────────────────────────────────
server.tool(
  "health_check",
  "Agentic mode health assessment — drift detection, recovery budget, context status",
  {
    currentAction: z
      .string()
      .optional()
      .describe("What the agent is currently doing"),
    testsPassing: z.boolean().optional().describe("Are all tests passing?"),
    filesModified: z
      .array(z.string())
      .optional()
      .describe("Files modified in this session"),
  },
  async ({ currentAction, testsPassing, filesModified }) => {
    const content = readGoalFile();
    const parsed = content ? parseGoalFile(content) : null;

    const health = {
      onTrack: true,
      issues: [],
      recommendations: [],
      stats: {
        stepCount,
        recoveryAttempts,
        maxRecoveryBeforeEscalate: 2,
        tasksRemaining: parsed?.tasks.pending.length || 0,
        tasksCompleted: parsed?.tasks.completed.length || 0,
      },
    };

    if (!parsed) {
      health.onTrack = false;
      health.issues.push("No goal file — working without a defined goal");
      health.recommendations.push("Create .agent/goal.md via goal_write");
    }

    if (testsPassing === false) {
      health.onTrack = false;
      health.issues.push("Tests are failing");
      health.recommendations.push(
        "Fix failing tests before proceeding"
      );
    }

    if (recoveryAttempts >= 2) {
      health.onTrack = false;
      health.issues.push(
        `Recovery budget exhausted (${recoveryAttempts}/2 attempts used)`
      );
      health.recommendations.push(
        "Escalate to human with 🛑 — provide diagnosis and options"
      );
    }

    if (stepCount > 0 && stepCount % 5 === 0) {
      health.recommendations.push(
        "Periodic check: re-read .agent/goal.md to verify alignment"
      );
    }

    if ((filesModified || []).length > 5) {
      health.issues.push(
        `${filesModified.length} files modified — scope may be expanding`
      );
      health.recommendations.push(
        "Verify all modified files are within task scope"
      );
    }

    return {
      content: [{ type: "text", text: JSON.stringify(health) }],
    };
  }
);

// ── mode_get ────────────────────────────────────────────────────────────────
server.tool(
  "mode_get",
  "Get current autonomy mode (agentic/cyborg/centaur)",
  {},
  async () => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ mode: "agentic", source: "default" }),
          },
        ],
      };
    }
    const parsed = parseGoalFile(content);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ mode: parsed.mode, source: "goal.md" }),
        },
      ],
    };
  }
);

// ── mode_set ────────────────────────────────────────────────────────────────
server.tool(
  "mode_set",
  "Switch autonomy mode: agentic (fully autonomous), cyborg (shared decisions), centaur (human designs)",
  {
    mode: z.enum(["agentic", "cyborg", "centaur"]).describe("Target mode"),
    reason: z.string().optional().describe("Why switching"),
  },
  async ({ mode, reason }) => {
    const content = readGoalFile();
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              message: "No goal file",
            }),
          },
        ],
      };
    }

    const parsed = parseGoalFile(content);
    const previous = parsed.mode;
    const updated = updateModeInFile(content, mode);
    writeGoalFile(updated);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            transition: `${previous} → ${mode}`,
            reason: reason || "Mode changed",
          }),
        },
      ],
    };
  }
);

// ── Start ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
