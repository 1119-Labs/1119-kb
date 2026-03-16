# Knowledge Conflicts Detect — Implementation Spec

## Overview

Add a new capability that inspects the **latest synced versions** of configured knowledge sources and detects **conflicting statements** across them using LLM reasoning.

The feature should answer:

- Is there a conflict?
- Which sources/versions are in conflict?
- What exact claims conflict?
- How severe is the conflict (high/medium/low)?
- What action should an operator take (review, prioritize source, resync)?

## Feasibility Assessment

This is feasible with the current codebase because:

- Sources and versioning already exist in DB and APIs (`sources`, `sourceVersions`, sync timestamps).
- The platform already supports multi-step agent reasoning over source content.
- There is an existing workflow pattern for durable background jobs (sync/stats).
- The architecture already supports admin-facing features and result storage.

Main challenge is quality, not plumbing: conflict detection requires extracting normalized claims first, then adjudicating contradictions with strong reasoning.

## Recommended LLM Model

Use **`anthropic/claude-opus-4.6`** as the primary model for conflict adjudication.

Why:

- Best fit in the current available model set for nuanced contradiction reasoning.
- Strong long-context synthesis for comparing claims from multiple sources.
- Better reliability for ambiguous language and conditional statements than lighter models.

Operational note:

- Use a two-pass flow to control cost: candidate conflict generation can use a cheaper model, but final adjudication and severity scoring should stay on `anthropic/claude-opus-4.6`.

## Product Scope

### In scope

- Detect conflicts across latest source versions.
- Persist conflict records with evidence snippets and source/version references.
- Provide admin endpoint to run detection and fetch latest report.
- Provide clear output schema for UI/API consumers.

### Out of scope (phase 1)

- Automatic source trust scoring/re-ranking in chat answers.
- Auto-resolving conflicts without human review.
- Real-time detection on each chat request.

## Data Model Additions

### 1. `knowledge_conflict_runs` (new table)

- `id` (pk)
- `status` (`pending` | `running` | `completed` | `failed`)
- `startedAt`, `finishedAt`
- `sourceCount`
- `checkedPairs`
- `model` (string)
- `error` (nullable text)

### 2. `knowledge_conflicts` (new table)

- `id` (pk)
- `runId` (fk to run)
- `topic` (normalized topic label)
- `claimA` (text)
- `claimB` (text)
- `sourceAId`, `sourceAVersionId`
- `sourceBId`, `sourceBVersionId`
- `severity` (`high` | `medium` | `low`)
- `confidence` (0-1 float)
- `rationale` (text)
- `status` (`open` | `acknowledged` | `resolved`)
- `createdAt`, `updatedAt`

## Detection Approach

Use a staged pipeline:

1. **Select latest versions**
   - For each active source, pick latest synced version.
2. **Extract claims**
   - Pull candidate claims from source content (fact-like statements only).
3. **Normalize by topic**
   - Group claims into topics (API behavior, config keys, pricing, limits, etc.).
4. **Candidate conflict generation**
   - Find likely contradictory pairs with broad/cheap filtering.
5. **Conflict adjudication (Opus)**
   - For each candidate pair, ask model to classify: conflict / not conflict / uncertain.
6. **Persist evidence**
   - Store conflicts with source/version evidence and confidence.
7. **Report summary**
   - Totals by severity + unresolved conflicts list.

## Steps to Implement

### 1. DB schema and migrations

- **Files**
  - `apps/app/server/db/schema.ts`
  - `apps/app/server/db/migrations/*` (new migration)
- Add `knowledge_conflict_runs` and `knowledge_conflicts` tables and relations.

### 2. Conflict detection core service

- **Files**
  - `apps/app/server/utils/conflicts/detect.ts` (new)
  - `apps/app/server/utils/conflicts/types.ts` (new)
- Implement orchestration for selecting latest versions, claim extraction, candidate generation, and final adjudication.
- Ensure final adjudication calls model `anthropic/claude-opus-4.6`.

### 3. Prompt definitions for conflict classification

- **Files**
  - `packages/agent/src/prompts/conflict-detection.ts` (new)
- Add structured prompt contract:
  - Inputs: topic, claimA, claimB, source metadata.
  - Output JSON: `{ verdict, severity, confidence, rationale }`.

### 4. Workflow job for async processing

- **Files**
  - `apps/app/server/workflows/detect-conflicts/*` (new workflow)
- Add durable workflow to run detection in background with retries and run status updates.

### 5. Admin API endpoints

- **Files**
  - `apps/app/server/api/conflicts/run.post.ts` (new)
  - `apps/app/server/api/conflicts/index.get.ts` (new)
  - `apps/app/server/api/conflicts/[id].get.ts` (new)
  - `apps/app/server/api/conflicts/[id]/status.patch.ts` (new)
- Endpoints:
  - Trigger run
  - List recent runs/conflicts
  - Get conflict details
  - Update conflict status (`acknowledged` / `resolved`)

### 6. Admin UI surface

- **Files**
  - `apps/app/app/pages/admin/conflicts.vue` (new)
  - `apps/app/app/components/admin/conflicts/*` (new)
- Add:
  - Run button
  - Run history
  - Conflict table (topic, severity, sources, confidence, status)
  - Detail drawer with rationale and evidence

### 7. Configuration controls

- **Files**
  - `apps/app/server/db/schema.ts` (agent config extension or dedicated config table)
  - `apps/app/server/api/agent-config/*` or `apps/app/server/api/conflicts/config.*` (new)
- Configurable values:
  - `conflictDetectionModel` (default `anthropic/claude-opus-4.6`)
  - `maxPairsPerRun`
  - `minConfidenceThreshold`
  - optional source include/exclude list

### 8. Documentation

- **Files**
  - `docs/ARCHITECTURE.md`
  - `docs/ENVIRONMENT.md` (if new env vars are added)
- Document conflict pipeline, model selection rationale, and operational limits.

## API Response Shape (proposed)

`GET /api/conflicts`

```json
{
  "run": {
    "id": "run_123",
    "status": "completed",
    "model": "anthropic/claude-opus-4.6",
    "sourceCount": 6,
    "checkedPairs": 184
  },
  "summary": {
    "open": 12,
    "high": 3,
    "medium": 5,
    "low": 4
  },
  "conflicts": [
    {
      "id": "kc_1",
      "topic": "token expiration",
      "severity": "high",
      "confidence": 0.91,
      "status": "open",
      "sourceAId": "src_a",
      "sourceBId": "src_b"
    }
  ]
}
```

## How to Test

### Manual

1. Create at least 2 sources with intentionally contradictory statements and run sync.
2. Trigger conflict run in admin UI or via `POST /api/conflicts/run`.
3. Verify run progresses to `completed` and stores conflicts.
4. Check each conflict includes:
   - source/version references
   - claim snippets
   - severity/confidence/rationale
5. Mark one conflict `acknowledged` and one `resolved`; verify status persists.
6. Re-run after changing one source; verify old conflicts can disappear or downgrade.

### Automated

- Add unit tests for:
  - claim pair classification parser/validator
  - severity/confidence boundaries
  - candidate pair pruning logic
- Add integration tests for:
  - `POST /api/conflicts/run` creates run record
  - `GET /api/conflicts` returns expected summary shape
  - conflict status updates via PATCH

## Risks and Mitigations

- **False positives**: Require evidence snippets + confidence threshold before marking `open`.
- **Cost growth with many sources**: Cap `maxPairsPerRun` and prioritize high-overlap topics first.
- **Ambiguous language**: Use `uncertain` verdict internally and exclude from open conflicts unless confidence threshold passes.
- **Stale data during sync windows**: Only run against the latest completed source versions.

## Success Criteria

- Detection run can complete on production-like data without manual intervention.
- At least 80% precision in a curated contradiction test set.
- Admin can review, acknowledge, and resolve conflicts from one screen.
- Outputs include machine-usable structure and human-readable rationale.
