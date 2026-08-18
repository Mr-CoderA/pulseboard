export const TABLE_NAMES: readonly [
  "users",
  "workspaces",
  "workspace_members",
  "standups",
  "blockers",
  "weekly_digests",
] = ["users", "workspaces", "workspace_members", "standups", "blockers", "weekly_digests"];

export type TableName = (typeof TABLE_NAMES)[number];
