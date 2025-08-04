const passport = require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const User = require('../models/userDb'); 
const env=require('dotenv').config();

const generateReferralCode = async () => {
  let code;
  let exists = true;
  while (exists) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g., "3FA6KD"
    exists = await User.exists({ referralCode: code });
  }
  return code;
};

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://fitboy.xyz/auth/google/callback"
},

async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            if (user.isBlocked) {
                return done(null, false, { message: 'Account is blocked' });
            }
            return done(null, user);
        } else {
          const referralCode = await generateReferralCode();
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                referalCode:referralCode
            });
            await user.save();
            return done(null, user);
        }
    } catch (error) {
        return done(error, null);
    }
}
));


passport.serializeUser((user,done)=>{
    done(null,user.id)
});

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err,null)
    })
})


module.exports=passport;