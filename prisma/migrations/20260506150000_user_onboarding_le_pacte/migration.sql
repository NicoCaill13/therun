-- Le Pacte / RGPD onboarding flags (GitHub issue #112)
ALTER TABLE "users" ADD COLUMN "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "consentDataBrokering" BOOLEAN NOT NULL DEFAULT false;
