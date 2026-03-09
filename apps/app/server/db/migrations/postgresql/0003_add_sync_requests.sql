CREATE TABLE IF NOT EXISTS "sync_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"source_filter" text,
	"source_count" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_requests_status_idx" ON "sync_requests" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_requests_created_at_idx" ON "sync_requests" ("created_at");
