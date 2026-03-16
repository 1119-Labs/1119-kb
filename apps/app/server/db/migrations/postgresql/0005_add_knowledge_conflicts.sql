CREATE TABLE "knowledge_conflict_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "source_count" integer DEFAULT 0 NOT NULL,
  "checked_pairs" integer DEFAULT 0 NOT NULL,
  "model" text DEFAULT 'anthropic/claude-opus-4.6' NOT NULL,
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "knowledge_conflicts" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL,
  "topic" text NOT NULL,
  "claim_a" text NOT NULL,
  "claim_b" text NOT NULL,
  "source_a_id" text NOT NULL,
  "source_a_version_id" text NOT NULL,
  "source_b_id" text NOT NULL,
  "source_b_version_id" text NOT NULL,
  "severity" text NOT NULL,
  "confidence" real DEFAULT 0 NOT NULL,
  "rationale" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "knowledge_conflicts"
  ADD CONSTRAINT "knowledge_conflicts_run_id_knowledge_conflict_runs_id_fk"
  FOREIGN KEY ("run_id") REFERENCES "public"."knowledge_conflict_runs"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "knowledge_conflicts"
  ADD CONSTRAINT "knowledge_conflicts_source_a_id_sources_id_fk"
  FOREIGN KEY ("source_a_id") REFERENCES "public"."sources"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "knowledge_conflicts"
  ADD CONSTRAINT "knowledge_conflicts_source_a_version_id_source_versions_id_fk"
  FOREIGN KEY ("source_a_version_id") REFERENCES "public"."source_versions"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "knowledge_conflicts"
  ADD CONSTRAINT "knowledge_conflicts_source_b_id_sources_id_fk"
  FOREIGN KEY ("source_b_id") REFERENCES "public"."sources"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "knowledge_conflicts"
  ADD CONSTRAINT "knowledge_conflicts_source_b_version_id_source_versions_id_fk"
  FOREIGN KEY ("source_b_version_id") REFERENCES "public"."source_versions"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "knowledge_conflict_runs_status_idx" ON "knowledge_conflict_runs" USING btree ("status");
CREATE INDEX "knowledge_conflict_runs_created_at_idx" ON "knowledge_conflict_runs" USING btree ("created_at");
CREATE INDEX "knowledge_conflicts_run_id_idx" ON "knowledge_conflicts" USING btree ("run_id");
CREATE INDEX "knowledge_conflicts_status_idx" ON "knowledge_conflicts" USING btree ("status");
CREATE INDEX "knowledge_conflicts_severity_idx" ON "knowledge_conflicts" USING btree ("severity");
CREATE INDEX "knowledge_conflicts_source_a_idx" ON "knowledge_conflicts" USING btree ("source_a_id");
CREATE INDEX "knowledge_conflicts_source_b_idx" ON "knowledge_conflicts" USING btree ("source_b_id");
