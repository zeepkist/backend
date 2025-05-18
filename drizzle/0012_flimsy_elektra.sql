CREATE INDEX "IX_records_user_level_time" ON "record" USING btree ("id_user","id_level","time");--> statement-breakpoint
CREATE INDEX "IX_records_user_level_date_created" ON "record" USING btree ("id_user","id_level","date_created");--> statement-breakpoint
CREATE INDEX "IX_world_records_user_level_record" ON "world_record_global" USING btree ("id_user","id_level","id_record");