import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = Object.freeze({ USER: "user", ADMIN: "admin" });

const SALT_ROUNDS = 12;

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    userAgent: String,
    ip: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email is invalid"],
    },
    // Optional for accounts created through Google sign-in.
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        "Password is required",
      ],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true, select: false },
    avatar: String,
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
    // Hashed refresh tokens, one per logged-in device/session.
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.googleId;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ "refreshTokens.tokenHash": 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  // Backdate by 1s so a token issued right after the change is still valid.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = async function (candidate) {
  // Google-only accounts have no password, so password login always fails for them.
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

/** True if the password changed after the token (issued at `jwtIat`, in seconds) was created. */
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIat;
};

const User = mongoose.model("User", userSchema);

export default User;
