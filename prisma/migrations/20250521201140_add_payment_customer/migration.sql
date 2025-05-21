-- CreateTable
CREATE TABLE "payment_customers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_customers_customer_id_idx" ON "payment_customers"("customer_id");

-- CreateIndex
CREATE INDEX "payment_customers_organization_id_idx" ON "payment_customers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_customers_organization_id_provider_key" ON "payment_customers"("organization_id", "provider");

-- AddForeignKey
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
