ALTER TABLE `chats` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `chats` ADD `share_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `chats_share_token_idx` ON `chats` (`share_token`);