/**
 * Compile-time alignment between Drizzle row types, generated catalogs,
 * and the shared HTTPS entity contracts (Date → ISO string on the wire).
 */
import type {
  Blocker,
  Standup,
  User,
  WeeklyDigest,
  Workspace,
  WorkspaceMember,
} from "@pulseboard/types";
import type {
  GeneratedBlockerRow,
  GeneratedStandupRow,
  GeneratedUserRow,
  GeneratedWeeklyDigestRow,
  GeneratedWorkspaceMemberRow,
  GeneratedWorkspaceRow,
} from "./generated/rows.js";
import type {
  BlockerRow,
  StandupRow,
  UserRow,
  WeeklyDigestRow,
  WorkspaceMemberRow,
  WorkspaceRow,
} from "./schema.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

type IsoWire<T> = {
  -readonly [K in keyof T]: T[K] extends Date ? string : T[K];
};

export type _UserRowMatchesGenerated = Expect<Equal<Writable<UserRow>, Writable<GeneratedUserRow>>>;
export type _WorkspaceRowMatchesGenerated = Expect<
  Equal<Writable<WorkspaceRow>, Writable<GeneratedWorkspaceRow>>
>;
export type _MemberRowMatchesGenerated = Expect<
  Equal<Writable<WorkspaceMemberRow>, Writable<GeneratedWorkspaceMemberRow>>
>;
export type _StandupRowMatchesGenerated = Expect<
  Equal<Writable<StandupRow>, Writable<GeneratedStandupRow>>
>;
export type _BlockerRowMatchesGenerated = Expect<
  Equal<Writable<BlockerRow>, Writable<GeneratedBlockerRow>>
>;
export type _DigestRowMatchesGenerated = Expect<
  Equal<Writable<WeeklyDigestRow>, Writable<GeneratedWeeklyDigestRow>>
>;

export type _UserWire = Expect<Equal<IsoWire<UserRow>, Writable<User>>>;
export type _WorkspaceWire = Expect<Equal<IsoWire<WorkspaceRow>, Writable<Workspace>>>;
export type _MemberWire = Expect<Equal<IsoWire<WorkspaceMemberRow>, Writable<WorkspaceMember>>>;
export type _StandupWire = Expect<Equal<IsoWire<StandupRow>, Writable<Standup>>>;
export type _BlockerWire = Expect<Equal<IsoWire<BlockerRow>, Writable<Blocker>>>;
export type _DigestWire = Expect<Equal<IsoWire<WeeklyDigestRow>, Writable<WeeklyDigest>>>;
