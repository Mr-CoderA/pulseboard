/**
 * RFC 7807 Problem Details envelope used by `/api/v1` error responses.
 * Payloads are validated by `problemDetailsSchema` at the HTTPS boundary.
 */
export const PROBLEM_TYPE_BLANK: "about:blank" = "about:blank";

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
}
