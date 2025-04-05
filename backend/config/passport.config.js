import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.model.js'; // Adjust path if needed
import bcrypt from 'bcrypt';

export const configurePassport = () => {
  // Ensure Passport is available
  if (!passport || !passport.use) {
    console.error("Passport is not initialized properly.");
    return;
  }

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email });
          if (!user) {
            return done(null, false, { message: 'Incorrect email or password' });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password -pin');
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};
