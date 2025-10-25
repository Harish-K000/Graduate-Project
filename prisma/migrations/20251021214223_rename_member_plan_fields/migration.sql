/*
  Warnings:

  - You are about to drop the column `intervalMonth` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `planLable` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "intervalMonth",
DROP COLUMN "planLable",
ADD COLUMN     "intervalMonths" INTEGER,
ADD COLUMN     "planLabel" TEXT;
