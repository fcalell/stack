CREATE TABLE `item` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `item_name_idx` ON `item` (`name`);
