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
  


const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error=>{
        console.log('error admin auth middleware');
        res.status(500).send('internal server errror')
        
    })
}



  



module.exports={
    adminAuth,
    userAuth,
}
