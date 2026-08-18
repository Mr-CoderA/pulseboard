export class StoreConflictError extends Error {
  readonly code = "store_conflict" as const;

  constructor(message: string) {
    super(message);
    this.name = "StoreConflictError";
  }
}

export class StoreNotFoundError extends Error {
  readonly code = "store_not_found" as const;

  constructor(message: string) {
    super(message);
    this.name = "StoreNotFoundError";
  }
}
