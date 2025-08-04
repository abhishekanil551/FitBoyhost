const path = require('path');
const express = require('express');
const env = require('dotenv').config();
const connectDB = require('./config/connectDb');
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const app = express();
const session = require('express-session');
const PORT = process.env.PORT || 5252;
const passport = require('./config/passport');
const cors = require('cors');

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:5252',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000 // 72 hours
  }
}));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads')));

// View engine setup
app.set('views', [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin')
]);
app.set('view engine', 'ejs');

// Routes
app.use('/', userRoute);
app.use('/admin', adminRoute);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});