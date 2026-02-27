# Prompt Library — Developer Templates

Copy-paste these when talking to the agent. Customize `[BRACKETS]`.

---

## Session Management

### Start fresh
```
/feature-start "[User-facing behavior in one sentence]"
```

### Resume
```
/session-resume
```

### End session
```
Update .agent/goal.md: mark completed tasks, set TDD phase, record decisions, note next step.
```

---

## Hypothesis Enforcement

### Before running a test
```
Before running, state your hypothesis:
- What error/output do you expect?
- Why?
Then run it and report if reality matched.
```

### Before implementing
```
Before writing code, tell me:
1. Minimal change to pass the failing test?
2. Possible side effects?
3. What you would NOT do at this step?
```

---

## Decision Surfacing

### Open design question
```
What are the tradeoffs between the approaches you see here?
Don't recommend one yet — surface options and costs.
```

### Constraint check
```
What constraints might apply that you haven't been told about?
What questions should I answer before you proceed?
```

### Assumption surfacing
```
What assumptions are you making that, if wrong, would break this?
```

---

## Scoping

### Task scope
```
Boundaries for this task:
- In scope: [files/dirs]
- Off-limits: [files/dirs]
- No new dependencies without asking
- Done when: [criterion]
Confirm before proceeding.
```

### Emergency scope
```
Stop. Only fix [specific thing]. Confirm scope before touching any file.
```

---

## Recovery

### Stop
```
Stop. Tell me: what did you do, what did you expect, what happened?
```

### Diagnose
```
Before fixing: what went wrong? What assumption was wrong?
Don't propose a solution yet — diagnose first.
```

### Clean restart
```
/recover
Previous approach had [problem]. New approach: [describe].
Start from failing test. Don't carry forward broken code.
```

---

## TDD Specific

### Force test-first
```
/tdd-cycle "[behavior]"
```

### Suspiciously fast green
```
Test passed immediately. Suspicious. Run with deliberately broken implementation
to confirm it actually fails when it should.
```

### Red phase check
```
We're in 🔴. Before any production code:
Is test written? Running? Failing for the right reason?
Show test output before continuing.
```

---

## Context Management

### Distill output
```
Too verbose. Give me:
- One line: pass or fail?
- If fail: single most informative error line
- Nothing else
```

### Drift check
```
Without reading code — from .agent/goal.md only:
Where are we, what's the phase, what's next?
```

### Scope check
```
We've been going a while. Without looking at code:
- Original goal?
- What we've actually done?
- Still on track?
```

---

## Agentic Mode

### Engage full autonomy
```
Mode: agentic
Goal: [one sentence]
Acceptance: [when is it done]
Constraints: [off-limits files, no new deps, etc.]
Go. Report when done or blocked.
```

### Check-in
```
Status report: goal progress, tests, decisions made, any concerns.
```
