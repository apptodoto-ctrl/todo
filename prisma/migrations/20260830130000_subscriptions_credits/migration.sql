-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userEmail" TEXT NOT NULL,
    "tierCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "stripeCustomerId" TEXT NOT NULL DEFAULT '',
    "stripeSubscriptionId" TEXT NOT NULL DEFAULT '',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "includedCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "trialCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_userEmail_key" ON "Subscription"("userEmail");

-- CreateTable CreditLedger
CREATE TABLE "CreditLedger" (
    "id" SERIAL NOT NULL,
    "userEmail" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreditLedger_userEmail_createdAt_idx" ON "CreditLedger"("userEmail", "createdAt");

-- Moneda de cobro en Stripe
INSERT INTO "PricingSetting" ("key","value","label","updatedAt") VALUES
('currency','usd','Moneda de cobro en Stripe (usd, clp, ars...)',CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
