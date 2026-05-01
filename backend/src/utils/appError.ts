export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_BUDGET"
  | "BLACKLISTED_ENTITY"
  | "DUPLICATE_TRANSACTION"
  | "BLOCKCHAIN_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  field?: string;

  constructor(code: ErrorCode, message: string, statusCode: number, field?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}
