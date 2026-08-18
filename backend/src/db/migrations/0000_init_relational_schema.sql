CREATE TYPE "public"."blocker_status" AS ENUM('OPEN', 'RESOLVED', 'FLAGGED');--> statement-breakpoint
CREATE TABLE "blockers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standup_id" uuid NOT NULL,
	"description" text NOT NULL,
	"status" "blocker_status" DEFAULT 'OPEN' NOT NULL,
	"flagged_after_days" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blockers_description_present" CHECK (char_length(trim("blockers"."description")) > 0),
	CONSTRAINT "blockers_flagged_after_days_nonnegative" CHECK ("blockers"."flagged_after_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "standups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"date" date NOT NULL,
	"yesterday" text NOT NULL,
	"today" text NOT NULL,
	"raw_blockers" jsonb NOT NULL,
	"submitted_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "standups_yesterday_present" CHECK (char_length("standups"."yesterday") > 0),
	CONSTRAINT "standups_today_present" CHECK (char_length("standups"."today") > 0),
	CONSTRAINT "standups_raw_blockers_array" CHECK (jsonb_typeof("standups"."raw_blockers") = 'array')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_uidx" UNIQUE("email"),
	CONSTRAINT "users_email_present" CHECK (char_length(trim("users"."email")) > 3),
	CONSTRAINT "users_password_hash_present" CHECK (char_length("users"."password_hash") >= 20)
);
--> statement-breakpoint
CREATE TABLE "weekly_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"velocity_score" real NOT NULL,
	"unresolved_blocker_count" integer NOT NULL,
	"compiled_md" text NOT NULL,
	"generated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_digests_velocity_nonnegative" CHECK ("weekly_digests"."velocity_score" >= 0),
	CONSTRAINT "weekly_digests_unresolved_nonnegative" CHECK ("weekly_digests"."unresolved_blocker_count" >= 0),
	CONSTRAINT "weekly_digests_compiled_present" CHECK (char_length("weekly_digests"."compiled_md") > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"joined_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pkey" PRIMARY KEY("user_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_name_present" CHECK (char_length(trim("workspaces"."name")) > 0),
	CONSTRAINT "workspaces_timezone_present" CHECK (char_length(trim("workspaces"."timezone")) > 0)
);
--> statement-breakpoint
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_standup_id_standups_id_fk" FOREIGN KEY ("standup_id") REFERENCES "public"."standups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "standups" ADD CONSTRAINT "standups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "standups" ADD CONSTRAINT "standups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_digests" ADD CONSTRAINT "weekly_digests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "blockers_standup_idx" ON "blockers" USING btree ("standup_id");--> statement-breakpoint
CREATE INDEX "blockers_status_idx" ON "blockers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "standups_user_workspace_date_uidx" ON "standups" USING btree ("user_id","workspace_id","date");--> statement-breakpoint
CREATE INDEX "standups_workspace_date_idx" ON "standups" USING btree ("workspace_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_digests_workspace_week_uidx" ON "weekly_digests" USING btree ("workspace_id","week_start");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_created_by_idx" ON "workspaces" USING btree ("created_by");