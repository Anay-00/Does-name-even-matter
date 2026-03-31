import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new HttpError(400, error.issues[0]?.message || "Invalid request body", "VALIDATION_ERROR"));
      }
      return next(error);
    }
  };
}
