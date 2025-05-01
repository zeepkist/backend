DROP INDEX "IX_level_points_level";--> statement-breakpoint
ALTER TABLE "user_points" ALTER COLUMN "points" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_points" ADD COLUMN "total_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_level_points_level" ON "level_points" USING btree ("id_level");--> statement-breakpoint
CREATE INDEX "IX_personal_bests_level_user" ON "personal_best_global" USING btree ("id_level" int4_ops,"id_user" int4_ops);--> statement-breakpoint
CREATE INDEX "IX_personal_bests_user_level_record" ON "personal_best_global" USING btree ("id_user" int4_ops,"id_level" int4_ops,"id_record" int4_ops);--> statement-breakpoint
CREATE INDEX "IX_records_id_time" ON "record" USING btree ("id_level","time");--> statement-breakpoint
CREATE INDEX "IX_records_time_id" ON "record" USING btree ("time","id_level");