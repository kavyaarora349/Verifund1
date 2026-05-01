import type { NextFunction, Request, Response } from "express";
import { serializeBigIntDeep } from "../utils/jsonSerialize.js";

export function bigIntJsonMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = (body?: unknown) => originalJson(serializeBigIntDeep(body));
  next();
}
