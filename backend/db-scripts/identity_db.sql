CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "Username" character varying(50) NOT NULL,
    "PasswordHash" character varying(500) NOT NULL,
    "FullName" character varying(100) NOT NULL,
    "Role" character varying(20) NOT NULL,
    "PhoneNumber" character varying(15),
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
);

INSERT INTO "Users" ("Id", "FullName", "PasswordHash", "PhoneNumber", "Role", "Username")
VALUES ('11111111-1111-1111-1111-111111111111', 'Nguyễn Văn A', '5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4', NULL, 'Manager', 'manager1');
INSERT INTO "Users" ("Id", "FullName", "PasswordHash", "PhoneNumber", "Role", "Username")
VALUES ('22222222-2222-2222-2222-222222222222', 'Trần Thị B', '5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4', NULL, 'Staff', 'staff1');
INSERT INTO "Users" ("Id", "FullName", "PasswordHash", "PhoneNumber", "Role", "Username")
VALUES ('33333333-3333-3333-3333-333333333333', 'Phạm Văn C', '5e883727f7132f1610817287e0d161d7a4416a03c0974443a7a486d23f11d4f4', NULL, 'Driver', 'driver1');

CREATE UNIQUE INDEX "IX_Users_Username" ON "Users" ("Username");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260605045533_InitialCreate', '8.0.8');

COMMIT;

