import type { MemberRole } from "../auth/tokens.js";

export interface Actor {
  readonly userId: string;
  readonly role: MemberRole;
  readonly refreshedToken?: string;
}
