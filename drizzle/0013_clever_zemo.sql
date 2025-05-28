ALTER TABLE "favourite" ADD CONSTRAINT "UQ_favourites_user_level" UNIQUE("id_user","id_level");--> statement-breakpoint
ALTER TABLE "personal_best_global" ADD CONSTRAINT "UQ_personal_bests_user_level" UNIQUE("id_user","id_level");--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "UQ_user_points_user" UNIQUE("id_user");--> statement-breakpoint
ALTER TABLE "world_record_global" ADD CONSTRAINT "UQ_world_records_level" UNIQUE("id_level");
