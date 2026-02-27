CREATE TABLE IF NOT EXISTS "source_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"version_folder_name" text NOT NULL,
	"ref_type" text NOT NULL,
	"ref" text NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_versions_source_id_idx" ON "source_versions" ("source_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "source_versions_source_version_idx" ON "source_versions" ("source_id","version_folder_name");
--> statement-breakpoint
ALTER TABLE "source_versions" ADD CONSTRAINT "source_versions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
