import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import config, { isGoogleOAuthEnabled } from "./config.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

/** Fits Google's display name into the model's 2-50 character name rule. */
const normalizeName = (profile, email) => {
  const name = (profile.displayName || email.split("@")[0]).trim().slice(0, 50);
  return name.padEnd(2, "_");
};

/**
 * Finds or creates the local user for a Google profile:
 * 1. A user already linked to this Google account -> that user.
 * 2. A user with the same (Google-verified) email -> link Google to that account.
 * 3. Otherwise -> create a new passwordless user.
 */
const verifyGoogleUser = async (_accessToken, _refreshToken, profile, done) => {
  try {
    const emailEntry = profile.emails?.find((e) => e.verified) ?? null;
    const email = emailEntry?.value?.toLowerCase();
    if (!email) {
      return done(null, false, {
        message: "Your Google account has no verified email address",
      });
    }
    const avatar = profile.photos?.[0]?.value;

    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Only link by email because Google has verified the address.
      user = await User.findOneAndUpdate(
        { email, googleId: { $exists: false } },
        { $set: { googleId: profile.id } },
        { new: true },
      );
      if (user && !user.avatar && avatar) {
        user.avatar = avatar;
        await user.save();
      }
    }

    if (!user) {
      if (await User.exists({ email })) {
        // Email belongs to an account linked to a *different* Google account.
        return done(null, false, {
          message: "This email is already linked to another Google account",
        });
      }
      user = await User.create({
        name: normalizeName(profile, email),
        email,
        googleId: profile.id,
        avatar,
      });
    }

    if (!user.isActive) {
      return done(null, false, { message: "Your account has been deactivated" });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
};

if (isGoogleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
      },
      verifyGoogleUser,
    ),
  );
}

/** Rejects Google routes with 503 when the OAuth credentials are not configured. */
export const requireGoogleOAuth = (_req, _res, next) => {
  if (!isGoogleOAuthEnabled) {
    throw new ApiError(503, "Google sign-in is not configured");
  }
  next();
};

export default passport;
