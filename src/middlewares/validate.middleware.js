import { validationResult } from "express-validator";

/**
 * Runs express-validator chains and responds 422 with field errors on failure.
 * Usage: router.post("/path", validate(rules), handler)
 */
export const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: result.array({ onlyFirstError: true }).map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  },
];
