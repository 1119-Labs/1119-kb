CREATE TABLE `agent_config` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'default' NOT NULL,
	`additional_prompt` text,
	`response_style` text DEFAULT 'concise',
	`language` text DEFAULT 'en',
	`default_model` text,
	`max_steps_multiplier` real DEFAULT 1,
	`temperature` real DEFAULT 0.7,
	`search_instructions` text,
	`citation_format` text DEFAULT 'inline',
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
