-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "public"."Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stripeCustomerId_key" ON "public"."Member"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stripeSubId_key" ON "public"."Member"("stripeSubId");
