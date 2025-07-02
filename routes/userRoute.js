const express=require('express');
const route=express.Router();
const userCtrl=require('../controller/users/userCtrl');
const profileCtrl=require('../controller/users/profileCtrl')
const wishlistCtrl=require('../controller/users/wishlistCtrl')
const cartCtrl=require('../controller/users/cartCtrl')
const settingsCtrl=require('../controller/users/settingsCtrl')
const checkoutCtrl=require('../controller/users/checkoutCtrl')
const paymentCtrl=require('../controller/users/paymentCtrl')
const offerCtrl=require('../controller/users/offerCtrl')
const passport = require('passport');
const {userAuth} = require('../middlewares/auth');
const {checkLoggedIn}=require('../middlewares/auth');


route.get('/',checkLoggedIn,userCtrl.loadHome);
route.get('/pageNotFount',userCtrl.pageNotFount)
route.post('/signup',checkLoggedIn,userCtrl.signUp)
route.post('/verify-Otp',userCtrl.verifyOtp)
route.post('/resend-Otp', userCtrl.resendOtp);
route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
route.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // Send message as redirect query param
      const msg = encodeURIComponent(info?.message || 'Login failed');
      return res.redirect('/?error=' + msg);
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.userId = user._id;
      return res.redirect('/home');
    });
  })(req, res, next);
});

  
route.get('/login',checkLoggedIn,userCtrl.loadLogin)
route.post('/login',checkLoggedIn,userCtrl.login)
route.get('/home',userAuth,userCtrl.loadHomepage)
route.get('/logout',userCtrl.logout)

// forgotPassword
route.post('/forgotPassword',profileCtrl.forgotPassword)
route.post('/resendOtp',profileCtrl.resendOtp)
route.post('/verifyOtp',profileCtrl.verifyOtp)
route.post('/resetPassword',profileCtrl.resetPassword)
route.get('/games',userAuth,userCtrl.gamesPage)
route.get('/product-details/:id',userAuth, userCtrl.productDetails)

// remove and addToWishlist
route.get('/wishlistPage',userAuth,wishlistCtrl.wishlistPage)
route.post('/addwishlist/:productId', userAuth, wishlistCtrl.addToWishlist);
route.delete('/removefromwishlist/:productId', userAuth, wishlistCtrl.removeFromWishlist);
route.get('/wishlist/status/:productId', userAuth, wishlistCtrl.checkWishlistStatus);

// remove and addToCart
route.get('/cart',userAuth,cartCtrl.cartPage);
route.post('/cart/add/:productId',userAuth,cartCtrl.addToCart);
route.delete('/cart/remove/:productId',userAuth,cartCtrl.removeFromCart);

// support
route.get('/support',userAuth,userCtrl.supportPage);

//about as
route.get('/aboutas',userAuth,userCtrl.aboutAs);

// user settings
route.get('/settings', userAuth, settingsCtrl.settingsPage);
route.get('/address',userAuth,settingsCtrl.addressPage);
route.post('/add-address', userAuth, settingsCtrl.addAddress);
route.put('/edit-address', userAuth, settingsCtrl.editAddress);
route.delete('/delete-address/:id', userAuth, settingsCtrl.deleteAddress);
route.put('/address-default/:id', userAuth, settingsCtrl.setDefaultAddress);
route.put('/updateName',userAuth,settingsCtrl.updateName);
route.post("/request-email-change",userAuth,settingsCtrl.requestEmailChange);
route.post("/confirm-email-change",userAuth,settingsCtrl.confirmEmailChange);
route.get('/OrdersDetail',userAuth,settingsCtrl.OrdersDetailsPage);
route.get('/wallet',userAuth,settingsCtrl.walletPage);
route.get('/refer',userAuth,settingsCtrl.referAndEarn)


// checkOut
route.get('/checkout',userAuth,checkoutCtrl.checkoutPage)
route.post('/create-order',userAuth,paymentCtrl.createOrder);
route.post('/verify-payment',userAuth,paymentCtrl.verifyPayment);
route.get('/order-success',userAuth,paymentCtrl.orderSuccess);
route.get('/orders/invoice/:orderId', userAuth, paymentCtrl.generateInvoice);
route.post('/wallet-payment',userAuth,paymentCtrl.walletPayment);

// games library
route.get('/library',userAuth, userCtrl.libraryPage)
route.get('/download/:id',userAuth, userCtrl.downloadGameFile);

//  apply Coupon
route.post('/apply-coupon', userAuth,checkoutCtrl.applyCoupon);


// offerPage
route.get('/offer',userAuth,offerCtrl.offerPage);


module.exports=route;