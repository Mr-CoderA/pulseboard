/**
 * RFC 7807 Problem Details envelope used by `/api/v1` error responses.
 * Structural type only — payload validation is a later milestone.
 */
export const PROBLEM_TYPE_BLANK: "about:blank" = "about:blank";

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
}
