const User=require('../models/userDb')
const product=require('../models/productDb')



const userAuth = async (req, res, next) => {
    try {
      const user = await User.findById(req.session.userId);
      if (!user || user.isBlocked) {
        return res.render('welcomeHome');
      }
      next();
    } catch (error) {
      console.log('userAuth middleware error:', error);
      res.status(500).send('Internal server error');
    }
  };
  
const checkLoggedIn = (req, res, next) => {
  if (req.session.userId){
    return res.redirect('/home');
  }
  next();
};


const adminAuth = async (req, res, next) => {
  try {
    const admin = await User.findById(req.session.adminId);

    if (!admin || admin.isBlocked || !admin.isAdmin) {
      return res.redirect('/admin/login');
    }
    next();
  } catch (error) {
    console.error('Error in adminAuth middleware:', error);
    res.status(500).send('Internal Server Error');
  }
};



  



module.exports={
    adminAuth,
    userAuth,
    checkLoggedIn
}
