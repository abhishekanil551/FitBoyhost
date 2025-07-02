const path = require('path');
const express = require("express");
const env = require('dotenv').config();
const connectDB = require('./config/connectDb')
const userRoute=require('./routes/userRoute')
const adminRoute=require('./routes/adminRoute')
const app = express();
const session = require('express-session')
const PORT = process.env.PORT;
connectDB() 
const passport=require('./config/passport')
const cors = require('cors');


app.use(cors({
  origin: 'http://localhost:5252', 
  credentials: true
}));




app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,  
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000
    }
  }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(passport.initialize())
app.use(passport.session())


app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads')));


// Set correct views directory
app.set('views', [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin')
]);

// Set EJS as the view engine
app.set('view engine','ejs');

// Serve static files
// app.use(express.static('public'));


app.use('/',userRoute);
app.use('/admin',adminRoute);

app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});





