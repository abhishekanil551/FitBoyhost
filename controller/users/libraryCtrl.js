const User = require('../../models/userDb'); 
const Category = require('../../models/categoryDb');
const Product = require('../../models/productDb');
const Company = require('../../models/companyDb');
const Order=require('../../models/orderDb')



const libraryPage=async(req,res)=>{
    try {
        const userId = req.session.userId;
        if (!userId) {
          return res.redirect('/login');
        }
    
        // Fetch user data
        const userData = await User.findById(userId).lean();
        if (!userData) {
          return res.redirect('/pageNotFound');
        }
    
        // Fetch orders for the user
        let orders = await Order.find({ userId })
          .populate({
            path: 'order_items',
            populate: {
              path: 'productId',
              model: 'Product'
            }
          })
          .sort({ createdAt: -1 });
    
        // Render the settings page with user data, orders, and search query
        res.render('settings', {
          user: userData,
          orders,
        });
      } catch (error) {
        console.error('Error loading settings page:', error);
        res.redirect('/pageNotFound');
      }
}

module.exports={
    libraryPage,
    
}