-- AlterTable
ALTER TABLE "AllocationRequest"
ADD COLUMN "beneficiaryWalletAddress" TEXT,
ADD COLUMN "requestedAlgoAmount" BIGINT,
ADD COLUMN "projectReason" TEXT,
ADD COLUMN "payoutTxId" TEXT,
ADD COLUMN "payoutRound" INTEGER,
ADD COLUMN "payoutAt" TIMESTAMP(3);

-- Backfill safe defaults for existing rows before NOT NULL constraints
UPDATE "AllocationRequest"
SET
  "beneficiaryWalletAddress" = COALESCE("beneficiaryWalletAddress", 'UNKNOWN'),
  "requestedAlgoAmount" = COALESCE("requestedAlgoAmount", 0),
  "projectReason" = COALESCE("projectReason", 'N/A');

-- Set required constraints
ALTER TABLE "AllocationRequest"
ALTER COLUMN "beneficiaryWalletAddress" SET NOT NULL,
ALTER COLUMN "requestedAlgoAmount" SET NOT NULL,
ALTER COLUMN "projectReason" SET NOT NULL;
