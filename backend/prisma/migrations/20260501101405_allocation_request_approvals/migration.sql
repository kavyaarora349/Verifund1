-- CreateEnum
CREATE TYPE "AllocationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AllocationRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "ministryCode" TEXT NOT NULL,
    "ministryName" TEXT NOT NULL,
    "ministryAllocatedAmount" BIGINT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "departmentAllocatedAmount" BIGINT NOT NULL,
    "status" "AllocationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRequestApproval" (
    "id" TEXT NOT NULL,
    "allocationRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "signature" TEXT,
    "signedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationRequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllocationRequest_requestedById_idx" ON "AllocationRequest"("requestedById");

-- CreateIndex
CREATE INDEX "AllocationRequest_status_idx" ON "AllocationRequest"("status");

-- CreateIndex
CREATE INDEX "AllocationRequest_createdAt_idx" ON "AllocationRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AllocationRequestApproval_approverId_idx" ON "AllocationRequestApproval"("approverId");

-- CreateIndex
CREATE INDEX "AllocationRequestApproval_status_idx" ON "AllocationRequestApproval"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationRequestApproval_allocationRequestId_approverId_key" ON "AllocationRequestApproval"("allocationRequestId", "approverId");

-- AddForeignKey
ALTER TABLE "AllocationRequest" ADD CONSTRAINT "AllocationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRequestApproval" ADD CONSTRAINT "AllocationRequestApproval_allocationRequestId_fkey" FOREIGN KEY ("allocationRequestId") REFERENCES "AllocationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRequestApproval" ADD CONSTRAINT "AllocationRequestApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
