ALTER TABLE "Settings" DROP COLUMN IF EXISTS "lastRecommendationDate";
ALTER TABLE "Settings" ADD COLUMN "lastRecommendationAt" TIMESTAMP(3);
