import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configure Google OAuth 2.0 strategy (ISS Requirement: SSO)
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const email = profile.emails[0].value;
      const username = profile.displayName || email.split('@')[0];
      
      // Check if user already exists
      let result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      let user;
      
      if (result.rows.length > 0) {
        // User exists - update last login
        user = result.rows[0];
        await query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
      } else {
        // New user - create account via SSO
        result = await query(
          `INSERT INTO users (username, email, role, is_active, created_at, last_login) 
           VALUES ($1, $2, 'user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING *`,
          [username, email]
        );
        user = result.rows[0];
        
        console.log(`✅ New user created via Google SSO: ${email}`);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

/**
 * Serialize user to session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
