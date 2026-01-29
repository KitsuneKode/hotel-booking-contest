--
ALTER TABLE "bookings" ADD CONSTRAINT "check_dates" CHECK("check_out_date" > "check_in_date");
--
ALTER TABLE "reviews" ADD CONSTRAINT "rating_range" CHECK("rating" >= 1
AND "rating" <= 5);
