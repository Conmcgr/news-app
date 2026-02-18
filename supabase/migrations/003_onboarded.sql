-- Track whether the user has completed onboarding
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
