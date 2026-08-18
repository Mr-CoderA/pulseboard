import {
  authCredentialsSchema,
  BLOCKER_STATUSES,
  blockerSchema,
  blockerStatusUpdateSchema,
  createStandupRequestSchema,
  createWorkspaceRequestSchema,
  entitySchemas,
  parseStandupRange,
  payloadSchemas,
  standupListQuerySchema,
  timezoneSchema,
  weeklyDigestQuerySchema,
} from "@pulseboard/types";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { generatedCatalog } from "./generated/catalog.js";
import { blockerStatusEnum, relationalTables } from "./schema.js";
import { assertSslModeRequire, readDatabaseUrl } from "./ssl.js";
import { TABLE_NAMES } from "./table-names.js";

const SAMPLE_UUID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_USER = "22222222-2222-4222-8222-222222222222";
const SAMPLE_WORKSPACE = "33333333-3333-4333-8333-333333333333";
const SAMPLE_STANDUP = "44444444-4444-4444-8444-444444444444";
const SAMPLE_INSTANT = "2026-08-17T15:04:05.000Z";

interface ExpectedColumn {
  readonly ts: string;
  readonly sql: string;
  readonly sqlType: string;
}

interface ExpectedTable {
  readonly name: string;
  readonly columns: readonly ExpectedColumn[];
  readonly primaryKey: readonly string[];
  readonly foreignKeys: readonly {
    readonly columns: readonly string[];
    readonly foreignTable: string;
    readonly onDelete: string;
  }[];
  readonly unique: readonly (readonly string[])[];
  readonly checks: readonly string[];
}

const expectedTables: readonly ExpectedTable[] = [
  {
    name: "users",
    columns: [
      { ts: "id", sql: "id", sqlType: "uuid" },
      { ts: "email", sql: "email", sqlType: "text" },
      { ts: "passwordHash", sql: "password_hash", sqlType: "text" },
      { ts: "createdAt", sql: "created_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["id"],
    foreignKeys: [],
    unique: [["email"]],
    checks: ["users_email_present", "users_password_hash_present"],
  },
  {
    name: "workspaces",
    columns: [
      { ts: "id", sql: "id", sqlType: "uuid" },
      { ts: "name", sql: "name", sqlType: "text" },
      { ts: "timezone", sql: "timezone", sqlType: "text" },
      { ts: "createdBy", sql: "created_by", sqlType: "uuid" },
      { ts: "createdAt", sql: "created_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["id"],
    foreignKeys: [{ columns: ["created_by"], foreignTable: "users", onDelete: "restrict" }],
    unique: [],
    checks: ["workspaces_name_present", "workspaces_timezone_present"],
  },
  {
    name: "workspace_members",
    columns: [
      { ts: "userId", sql: "user_id", sqlType: "uuid" },
      { ts: "workspaceId", sql: "workspace_id", sqlType: "uuid" },
      { ts: "joinedAt", sql: "joined_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["user_id", "workspace_id"],
    foreignKeys: [
      { columns: ["user_id"], foreignTable: "users", onDelete: "cascade" },
      { columns: ["workspace_id"], foreignTable: "workspaces", onDelete: "cascade" },
    ],
    unique: [],
    checks: [],
  },
  {
    name: "standups",
    columns: [
      { ts: "id", sql: "id", sqlType: "uuid" },
      { ts: "userId", sql: "user_id", sqlType: "uuid" },
      { ts: "workspaceId", sql: "workspace_id", sqlType: "uuid" },
      { ts: "date", sql: "date", sqlType: "date" },
      { ts: "yesterday", sql: "yesterday", sqlType: "text" },
      { ts: "today", sql: "today", sqlType: "text" },
      { ts: "rawBlockers", sql: "raw_blockers", sqlType: "jsonb" },
      { ts: "submittedAt", sql: "submitted_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["id"],
    foreignKeys: [
      { columns: ["user_id"], foreignTable: "users", onDelete: "cascade" },
      { columns: ["workspace_id"], foreignTable: "workspaces", onDelete: "cascade" },
    ],
    unique: [["user_id", "workspace_id", "date"]],
    checks: ["standups_yesterday_present", "standups_today_present", "standups_raw_blockers_array"],
  },
  {
    name: "blockers",
    columns: [
      { ts: "id", sql: "id", sqlType: "uuid" },
      { ts: "standupId", sql: "standup_id", sqlType: "uuid" },
      { ts: "description", sql: "description", sqlType: "text" },
      { ts: "status", sql: "status", sqlType: "blocker_status" },
      { ts: "flaggedAfterDays", sql: "flagged_after_days", sqlType: "smallint" },
      { ts: "createdAt", sql: "created_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["id"],
    foreignKeys: [{ columns: ["standup_id"], foreignTable: "standups", onDelete: "cascade" }],
    unique: [],
    checks: ["blockers_description_present", "blockers_flagged_after_days_nonnegative"],
  },
  {
    name: "weekly_digests",
    columns: [
      { ts: "id", sql: "id", sqlType: "uuid" },
      { ts: "workspaceId", sql: "workspace_id", sqlType: "uuid" },
      { ts: "weekStart", sql: "week_start", sqlType: "date" },
      { ts: "velocityScore", sql: "velocity_score", sqlType: "real" },
      { ts: "unresolvedBlockerCount", sql: "unresolved_blocker_count", sqlType: "integer" },
      { ts: "compiledMd", sql: "compiled_md", sqlType: "text" },
      { ts: "generatedAt", sql: "generated_at", sqlType: "timestamp (3) with time zone" },
    ],
    primaryKey: ["id"],
    foreignKeys: [{ columns: ["workspace_id"], foreignTable: "workspaces", onDelete: "cascade" }],
    unique: [["workspace_id", "week_start"]],
    checks: [
      "weekly_digests_velocity_nonnegative",
      "weekly_digests_unresolved_nonnegative",
      "weekly_digests_compiled_present",
    ],
  },
];

function fail(errors: string[], message: string): void {
  errors.push(message);
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedRight = [...right].sort();
  return [...left].sort().every((value, index) => value === sortedRight[index]);
}

function namedColumns(columns: readonly unknown[]): string[] {
  const names: string[] = [];
  for (const column of columns) {
    if (typeof column !== "object" || column === null || !("name" in column)) {
      continue;
    }
    const name = column.name;
    if (typeof name === "string" && name.length > 0) {
      names.push(name);
    }
  }
  return names;
}

function validateRelationalModel(): string[] {
  const errors: string[] = [];
  const liveNames = relationalTables.map((table) => getTableName(table));
  if (liveNames.join(",") !== TABLE_NAMES.join(",")) {
    fail(errors, `table names ${liveNames.join(",")} !== ${TABLE_NAMES.join(",")}`);
  }
  if (generatedCatalog.tables.length !== expectedTables.length) {
    fail(errors, "generated catalog table count mismatch");
  }

  for (const [index, table] of relationalTables.entries()) {
    const expected = expectedTables[index];
    const generated = generatedCatalog.tables[index];
    const config = getTableConfig(table);
    if (expected === undefined || generated === undefined) {
      fail(errors, `missing expected/generated table at ${index}`);
      continue;
    }
    if (config.name !== expected.name || generated.name !== expected.name) {
      fail(errors, `table name drift at ${index}: ${config.name}`);
    }

    const columnMap = getTableColumns(table);
    for (const column of expected.columns) {
      const live = Object.entries(columnMap).find(([key]) => key === column.ts)?.[1];
      if (live === undefined) {
        fail(errors, `${expected.name}.${column.ts} missing on drizzle table`);
        continue;
      }
      if (live.name !== column.sql) {
        fail(errors, `${expected.name}.${column.ts} sql name ${live.name} !== ${column.sql}`);
      }
      if (live.getSQLType() !== column.sqlType) {
        fail(
          errors,
          `${expected.name}.${column.ts} sql type ${live.getSQLType()} !== ${column.sqlType}`,
        );
      }
      const generatedColumn = generated.columns.find((entry) => entry.ts === column.ts);
      if (generatedColumn === undefined) {
        fail(errors, `${expected.name}.${column.ts} missing from generated catalog`);
      } else if (generatedColumn.sql !== column.sql || generatedColumn.sqlType !== column.sqlType) {
        fail(errors, `${expected.name}.${column.ts} generated catalog drift`);
      }
    }

    const livePk = [
      ...config.primaryKeys.flatMap((key) => namedColumns(key.columns)),
      ...Object.values(columnMap)
        .filter((column) => column.primary)
        .map((column) => column.name),
    ];
    if (!sameSet(livePk, expected.primaryKey)) {
      fail(
        errors,
        `${expected.name} primary key ${livePk.join(",")} !== ${expected.primaryKey.join(",")}`,
      );
    }

    const liveUniques = [
      ...Object.values(columnMap)
        .filter((column) => column.isUnique)
        .map((column) => [column.name]),
      ...config.indexes
        .filter((entry) => entry.config.unique)
        .map((entry) => namedColumns(entry.config.columns)),
      ...config.uniqueConstraints.map((entry) => namedColumns(entry.columns)),
    ];
    for (const unique of expected.unique) {
      const matched = liveUniques.some((entry) => sameSet(entry, unique));
      if (!matched) {
        fail(errors, `${expected.name} missing unique (${unique.join(", ")})`);
      }
    }

    const liveFks = config.foreignKeys.map((fk) => {
      const reference = fk.reference();
      return {
        columns: namedColumns(reference.columns),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: fk.onDelete ?? "no action",
      };
    });
    for (const foreignKey of expected.foreignKeys) {
      const matched = liveFks.some(
        (entry) =>
          sameSet(entry.columns, foreignKey.columns) &&
          entry.foreignTable === foreignKey.foreignTable &&
          entry.onDelete === foreignKey.onDelete,
      );
      if (!matched) {
        fail(
          errors,
          `${expected.name} missing FK ${foreignKey.columns.join(",")} → ${foreignKey.foreignTable} (${foreignKey.onDelete})`,
        );
      }
    }

    const liveChecks = config.checks.map((entry) => entry.name);
    for (const checkName of expected.checks) {
      if (!liveChecks.includes(checkName)) {
        fail(errors, `${expected.name} missing check ${checkName}`);
      }
    }
  }

  if (!sameSet([...blockerStatusEnum.enumValues], BLOCKER_STATUSES)) {
    fail(errors, "blocker_status enum drift versus shared BLOCKER_STATUSES");
  }

  return errors;
}

function expectOk(
  errors: string[],
  label: string,
  schema: { parse: (value: unknown) => unknown },
  value: unknown,
): void {
  try {
    schema.parse(value);
  } catch (cause) {
    fail(errors, `${label} should accept valid payload: ${String(cause)}`);
  }
}

function expectFail(
  errors: string[],
  label: string,
  schema: { parse: (value: unknown) => unknown },
  value: unknown,
): void {
  try {
    schema.parse(value);
    fail(errors, `${label} should reject malformed payload`);
  } catch {
    // rejected as required
  }
}

function validateZodContracts(): string[] {
  const errors: string[] = [];

  expectOk(errors, "user", entitySchemas.user, {
    id: SAMPLE_UUID,
    email: "member@example.com",
    passwordHash: "argon2id$v=19$m=65536,t=3,p=4$abcdefghij",
    createdAt: SAMPLE_INSTANT,
  });
  expectFail(errors, "user.email", entitySchemas.user, {
    id: SAMPLE_UUID,
    email: "not-an-email",
    passwordHash: "argon2id$v=19$m=65536,t=3,p=4$abcdefghij",
    createdAt: SAMPLE_INSTANT,
  });

  expectOk(errors, "workspace", entitySchemas.workspace, {
    id: SAMPLE_WORKSPACE,
    name: "Northwind",
    timezone: "America/New_York",
    createdBy: SAMPLE_USER,
    createdAt: SAMPLE_INSTANT,
  });
  expectFail(errors, "workspace.timezone", timezoneSchema, "Not/A_Zone");

  expectOk(errors, "member", entitySchemas.workspaceMember, {
    userId: SAMPLE_USER,
    workspaceId: SAMPLE_WORKSPACE,
    joinedAt: SAMPLE_INSTANT,
  });

  expectOk(errors, "standup", entitySchemas.standup, {
    id: SAMPLE_STANDUP,
    userId: SAMPLE_USER,
    workspaceId: SAMPLE_WORKSPACE,
    date: "2026-08-17",
    yesterday: "Shipped the contract package.",
    today: "Draft schema validation.",
    rawBlockers: [{ description: "Waiting on DNS cutover" }],
    submittedAt: SAMPLE_INSTANT,
  });
  expectFail(errors, "standup.extra", entitySchemas.standup, {
    id: SAMPLE_STANDUP,
    userId: SAMPLE_USER,
    workspaceId: SAMPLE_WORKSPACE,
    date: "2026-08-17",
    yesterday: "Y",
    today: "T",
    rawBlockers: [],
    submittedAt: SAMPLE_INSTANT,
    extra: true,
  });

  expectOk(errors, "blocker", blockerSchema, {
    id: SAMPLE_UUID,
    standupId: SAMPLE_STANDUP,
    description: "DNS cutover",
    status: "OPEN",
    flaggedAfterDays: 2,
    createdAt: SAMPLE_INSTANT,
  });
  expectFail(errors, "blocker.status", blockerStatusUpdateSchema, { status: "DONE" });

  expectOk(errors, "digest", entitySchemas.weeklyDigest, {
    id: SAMPLE_UUID,
    workspaceId: SAMPLE_WORKSPACE,
    weekStart: "2026-08-17",
    velocityScore: 0.82,
    unresolvedBlockerCount: 3,
    compiledMd: "## Week of 2026-08-17",
    generatedAt: SAMPLE_INSTANT,
  });
  expectFail(errors, "digest.weekStart", weeklyDigestQuerySchema, {
    workspaceId: SAMPLE_WORKSPACE,
    weekStart: "2026-08-18",
  });

  expectOk(errors, "register", authCredentialsSchema, {
    email: "member@example.com",
    password: "correct-horse",
  });
  expectFail(errors, "register.password", authCredentialsSchema, {
    email: "member@example.com",
    password: "short",
  });

  expectOk(errors, "createWorkspace", createWorkspaceRequestSchema, {
    name: "Northwind",
    timezone: "UTC",
  });
  expectOk(errors, "createStandup", createStandupRequestSchema, {
    workspaceId: SAMPLE_WORKSPACE,
    yesterday: "Wrote the schema.",
    today: "Wire validation into build.",
    rawBlockers: [],
  });
  expectOk(errors, "standupQuery", standupListQuerySchema, {
    workspaceId: SAMPLE_WORKSPACE,
    range: "2026-08-01/2026-08-17",
  });

  try {
    const range = parseStandupRange("2026-08-01/2026-08-17");
    if (range.from !== "2026-08-01" || range.to !== "2026-08-17") {
      fail(errors, "parseStandupRange returned unexpected bounds");
    }
  } catch (cause) {
    fail(errors, `parseStandupRange failed: ${String(cause)}`);
  }
  try {
    parseStandupRange("2026-08-17/2026-08-01");
    fail(errors, "parseStandupRange should reject inverted ranges");
  } catch {
    // rejected as required
  }

  expectFail(errors, "problem.blank-status", payloadSchemas.problemDetails, {
    type: "about:blank",
    title: "Bad Request",
    status: 99,
  });

  if (!sameSet([...BLOCKER_STATUSES], ["OPEN", "RESOLVED", "FLAGGED"])) {
    fail(errors, "BLOCKER_STATUSES product values changed");
  }

  return errors;
}

function validateSslGuard(): string[] {
  const errors: string[] = [];
  try {
    readDatabaseUrl({});
    fail(errors, "readDatabaseUrl should reject a missing value");
  } catch {
    // required
  }

  const valid = "postgres://example.invalid/pulseboard?sslmode=require";
  try {
    assertSslModeRequire(valid);
  } catch (cause) {
    fail(errors, `sslmode=require should pass: ${String(cause)}`);
  }

  try {
    assertSslModeRequire("postgres://example.invalid/pulseboard");
    fail(errors, "missing sslmode should fail");
  } catch {
    // required
  }

  try {
    assertSslModeRequire("postgres://example.invalid/pulseboard?sslmode=disable");
    fail(errors, "sslmode=disable should fail");
  } catch {
    // required
  }

  try {
    assertSslModeRequire("https://example.invalid/pulseboard?sslmode=require");
    fail(errors, "non-postgres scheme should fail");
  } catch {
    // required
  }

  return errors;
}

function main(): void {
  const errors = [...validateRelationalModel(), ...validateZodContracts(), ...validateSslGuard()];
  if (errors.length > 0) {
    process.stderr.write(`${errors.map((line) => `schema: ${line}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `schema validation passed (${TABLE_NAMES.length} tables, ${Object.keys(entitySchemas).length} entities)\n`,
  );
}

main();
