CREATE TABLE IF NOT EXISTS "mock_payment_transactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reference" TEXT NOT NULL,
  "failureMessage" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "mock_payment_transactions_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "mock_payment_transactions_reference_key"
  ON "mock_payment_transactions"("reference");

CREATE INDEX IF NOT EXISTS "mock_payment_transactions_paymentId_idx"
  ON "mock_payment_transactions"("paymentId");

CREATE INDEX IF NOT EXISTS "mock_payment_transactions_status_idx"
  ON "mock_payment_transactions"("status");
