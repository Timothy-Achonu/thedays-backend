-- RenameColumn
ALTER TABLE "users" RENAME COLUMN "name" TO "username";

-- AlterColumn
ALTER TABLE "users" ALTER COLUMN "username" TYPE VARCHAR(30);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
