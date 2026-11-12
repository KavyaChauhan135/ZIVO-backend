import { body } from "express-validator";

const STRONG_PASSWORD = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 0,
};

const PASSWORD_RULE_MSG =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number";

const nameRule = () =>
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters");

const emailRule = () =>
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Email is invalid")
    .bail()
    .isLength({ max: 254 })
    .withMessage("Email is too long")
    .toLowerCase();

// bcrypt only uses the first 72 bytes of a password, so cap it there.
const newPasswordRule = (field) =>
  body(field)
    .isString()
    .withMessage("Password is required")
    .bail()
    .isLength({ max: 72 })
    .withMessage("Password must be at most 72 characters")
    .bail()
    .isStrongPassword(STRONG_PASSWORD)
    .withMessage(PASSWORD_RULE_MSG);

export const registerRules = [
  nameRule(),
  emailRule(),
  newPasswordRule("password"),
];

export const loginRules = [
  emailRule(),
  body("password").isString().notEmpty().withMessage("Password is required"),
];

export const updateProfileRules = [
  nameRule().optional(),
  emailRule().optional(),
  body().custom((value) => {
    if (value?.name === undefined && value?.email === undefined) {
      throw new Error("Provide at least one of: name, email");
    }
    return true;
  }),
];

export const changePasswordRules = [
  body("currentPassword")
    .isString()
    .notEmpty()
    .withMessage("Current password is required"),
  newPasswordRule("newPassword").custom((value, { req }) => {
    if (value === req.body.currentPassword) {
      throw new Error(
        "New password must be different from the current password",
      );
    }
    return true;
  }),
];
