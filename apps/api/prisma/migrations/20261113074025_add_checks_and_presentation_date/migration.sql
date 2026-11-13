-- AlterTable
ALTER TABLE "DocumentSet" ADD COLUMN     "presentationDate" DATE;

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "documentSetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "checkRunId" TEXT NOT NULL,
    "ruleNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "detail" JSONB NOT NULL,

    CONSTRAINT "CheckResult_pkey" PRIMARY KEY ("checkRunId","ruleNo")
);

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_documentSetId_fkey" FOREIGN KEY ("documentSetId") REFERENCES "DocumentSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckResult" ADD CONSTRAINT "CheckResult_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
