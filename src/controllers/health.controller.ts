import type { Request, Response } from "express";

export function health(_request: Request, response: Response): void {
  response.json({ status: "ok" });
}
