const nodeMailer = require('nodemailer');
const bcrypt = require('bcrypt');
const User = require('../../models/userDb'); 
const Category = require('../../models/categoryDb');
const Product = require('../../models/productDb');
const Company = require('../../models/companyDb');
const Order=require('../../models/orderDb');
const { json } = require('body-parser');
const WalletTransaction=require('../../models/walletDb');
const https = require('https');
const path = require('path');
const fs = require('fs');


const loadHome = async (req, res) => {
  try {
    if (req.session.userId) {
      return res.redirect('/home'); 
    }
    return res.render('welcomeHome');
  } catch (error) {
    console.log('Home page not found:', error);
    res.status(500).send('Server error');
  }
};



const loadHomepage = async (req, res) => {
  try {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today);

    // Fetch categories (for header or /games)
    const categories = await Category.find({ isListed: true }).lean();

    // Fetch recommended games
    const recommendedGames = await Product.find({ isRecommended: true, isListed: true })
      .select('_id name poster salesPrice isFree availability banners')
      .limit(4)
      .lean();

    // Fetch free games
    const freeGames = await Product.find({ isBlocked: false, isFree: true, isListed: true })
      .select('_id name poster')
      .limit(4)
      .lean();

    // Fetch top 10 products (same logic as in loadDashboard)
    const topProducts = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          status: 'paid',
        },
      },
      { $unwind: '$order_items' },
      {
        $lookup: {
          from: 'orderitems',
          localField: 'order_items',
          foreignField: '_id',
          as: 'orderItem',
        },
      },
      { $unwind: '$orderItem' },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItem.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$orderItem.productId',
          name: { $first: '$product.name' },
          poster: { $first: '$product.poster' }, // Include poster for rendering
          units: { $sum: 1 },
          revenue: { $sum: '$orderItem.price' },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 4 },
      {
        $project: {
          _id: 1,
          name: 1,
          poster: 1,
          units: 1,
          revenue: { $round: ['$revenue', 2] },
        },
      },
    ]);

    const userId = req.session.userId;
    const renderData = {
      recommendedGames,
      freeGames,
      topProducts, // Replace popularGames with topProducts
      categories,
      userData: null,
      userWishlist: [],
      error: null,
    };

    if (userId) {
      const userData = await User.findById(userId).lean();
      renderData.userData = userData || null;
      renderData.userWishlist = userData?.wishlist?.map(id => id.toString()) || [];
      res.render('home', renderData);
    } else {
      res.render('welcomeHome', renderData);
    }
  } catch (error) {
    console.error('Homepage error:', error);
    res.render('welcomeHome', {
      recommendedGames: [],
      freeGames: [],
      topProducts: [], // Update to topProducts
      categories: [],
      userData: null,
      userWishlist: [],
      error: 'Failed to load homepage. Please try again later.',
    });
  }
};

const pageNotFount = async (req, res) => {
  try {
    // Clear OTP from session
    req.session.userOtp = null;
    req.session.userData = null;
    req.session.otpExpires = null;
    req.session.forgotPasswordEmail = null;
    res.render('pageNotFount');
  } catch (error) {
    console.log('Page not found error:', error);
    res.redirect('/pageNotFount');
  }
};

const supportPage = async (req, res) => {
  try {
    res.render('Support');
  } catch (error) {
    console.log('Support page error:', error);
    res.redirect('/pageNotFount');
  }
};

const aboutAs = async (req, res) => {
  try {
    res.render('aboutAs');
  } catch (error) {
    console.log('About us page error:', error);
    res.redirect('/pageNotFount');
  }
};



const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};



const signUp = async (req, res) => {
  try {

    const { name, email, password, cPassword, googleId, ref} = req.body;
    if (password !== cPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const otp = generateOtp();
    console.log('Generated OTP for signup:', otp); // Console log OTP
    const sendOtp = await sendVerificationEmail(email, otp);
    console.log('Email sent for signup:', email);

    if (!sendOtp) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }

    // Store OTP and user data in session with expiration
    req.session.userOtp = otp;
    req.session.userData = { name, email, password, googleId: googleId || null, referredBy: ref || null };
    req.session.otpExpires = Date.now() + 60 * 1000; 


    return res.status(200).json({ success: true, redirectUrl: '/verify-Otp' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodeMailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: 'Verify Your Account',
      text: `Your OTP is ${otp}`,
      html: `<h>Your OTP: ${otp}</h>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log('Received OTP for verification:', otp);

    // Check if OTP exists and is not expired
    if (!req.session.userOtp || !req.session.otpExpires) {
      return res.status(400).json({ success: false, message: 'OTP session expired or invalid' });
    }

    if (Date.now() > req.session.otpExpires) {
      req.session.userOtp = null;
      req.session.userData = null;
      req.session.otpExpires = null;
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
        googleId: user.googleId || null,
        is_verified: true,
        referalCode: generateReferralCode(),
        referredBy: user.referredBy || null
      });
      await saveUserData.save();      
     
       // ✅ Referral reward logic starts here
      if (user.referredBy) {
        // Credit ₹10 to the new user (referred user)
        await WalletTransaction.create({
          userId: saveUserData._id,
          amount: 10,
          type: 'credit',
          description: 'Referral reward for signing up'
        });

        // Find the referring user by referral code
        const referrer = await User.findOne({ referalCode: user.referredBy });
        if (referrer) {
          await WalletTransaction.create({
            userId: referrer._id,
            amount: 50,
            type: 'credit',
            description: `Referral bonus for referring ${saveUserData.name}`
          });
        }
      }

      req.session.userId = saveUserData._id;

      // Clear OTP and user data from session
      req.session.userOtp = null;
      req.session.userData = null;
      req.session.otpExpires = null;

      res.json({ success: true, redirectUrl: '/home' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const loadOtpPage = (req, res) => {
  if (!req.session.userData) return res.redirect('/home');
  res.render('verify-Otp');
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const otp = generateOtp();
    console.log('Generated OTP for resend:', otp); // Console log OTP
    req.session.userOtp = otp;
    req.session.otpExpires = Date.now() + 60 * 1000; // OTP expires in 1 minute

    const emailSend = await sendVerificationEmail(email, otp);
    if (emailSend) {
      console.log('Resend OTP sent to:', email);
      res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    } else {
      res.redirect('/home');
    }
  } catch (error) {
    console.log('Login page error:', error);
    res.redirect('/pageNotFount');
  }
};

const login = async (req, res) => {
  if(req.session.userId){
    res.redirect('/home')
  }
  try {
    const { loginEmail, loginPassword } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: loginEmail });

    if (!findUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (findUser.isBlocked) {
      return res.status(403).json({ success: false, message: 'User is blocked' });
    }

    const passwordMatch = await bcrypt.compare(loginPassword, findUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    req.session.userId = findUser._id;
    res.status(200).json({ success: true, redirectUrl: '/home' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Try again.' });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log('Session destruction error:', err.message);
        return res.redirect('/pageNotFount');
      }
      res.render('welcomeHome');
    });
  } catch (error) {
    console.log('Logout error:', error);
    res.redirect('/pageNotFount');
  }
};

const gamesPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    let userData = null;
    let userWishlist = [];

    if (userId) {
      userData = await User.findOne({ _id: userId });
      userWishlist = userData ? userData.wishlist.map(id => id.toString()) : [];
    }

    const categories = await Category.find({ isListed: true });
    const companys = await Company.find({ isBlocked: false });

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    // Build filter query
    let query = { isListed: true };

    // Search functionality
    if (req.query.search) {
      query.name = { $regex: new RegExp(req.query.search, 'i') };
    }

    // Category filter
    if (req.query.category && req.query.category.length > 0) {
      if (Array.isArray(req.query.category)) {
        query.categoryId = { $in: req.query.category };
      } else {
        query.categoryId = req.query.category;
      }
    } else {
      const categoryIds = categories.map(cat => cat._id);
      query.categoryId = { $in: categoryIds };
    }

    // Free games filter
    if (req.query.isFree === 'true') {
      query.isFree = true;
    }

    // Price range filter
    if (req.query.maxPrice) {
      query.salesPrice = { $lte: parseInt(req.query.maxPrice) };
    }

    // Determine sort order
    let sortOption = { createdAt: -1 }; // Default sort
    console.log('Sort parameter:', req.query.sort);
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'name-asc':
          sortOption = { name: 1 };
          break;
        case 'name-desc':
          sortOption = { name: -1 };
          break;
        case 'price-asc':
          sortOption = { salesPrice: 1 };
          break;
        case 'price-desc':
          sortOption = { salesPrice: -1 };
          break;
        case 'createdAt-desc':
          sortOption = { createdAt: -1 };
          break;
      }
    }

    // Execute query with all filters
    const products = await Product.find(query)
      .sort(sortOption)
      .collation({ locale: 'en', strength: 2 })
      .skip(skip)
      .limit(limit)
      .populate('categoryId')
      .populate('company');

    console.log('Sorted products:', products.map(p => p.name));

    // Count total filtered products for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Create query string without page parameter
    const queryObj = { ...req.query };
    delete queryObj.page;
    const queryString = new URLSearchParams(queryObj).toString();

    // Render page with all data
    res.render('games', {
      userData,
      user: userData,
      products: products,
      category: categories,
      company: companys,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      queryString: queryString,
      userWishlist: userWishlist,
      filters: {
        search: req.query.search || '',
        category: req.query.category || [],
        company: req.query.company || [],
        isFree: req.query.isFree === 'true' || false,
        maxPrice: req.query.maxPrice || 5000,
        sort: req.query.sort || 'createdAt-desc',
      },
    });
  } catch (error) {
    console.error('Error loading games page:', error);
    res.redirect('/pageNotFount');
  }
};




const productDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userId;

    // Get product details
    const product = await Product.findOne({ _id: productId, isListed: true })
      .populate('categoryId')
      .populate('company');

    if (!product) {
      return res.redirect('/pageNotFound');
    }

    // Get user data if logged in
    const userData = userId ? await User.findById(userId).lean() : null;

    // Check if the user has purchased this product and get the order status
    let ownsProduct = false;
    let orderStatus = null;
    let canInstall = false;

    if (userId) {
      try {
        const userOrders = await Order.find({
          userId,
          status: { $in: ['paid'] }
        }).populate({
          path: 'order_items',
          populate: {
            path: 'productId',
            model: 'Product'
          }
        }).lean();

        console.log(`Checking ownership for user ${userId} and product ${productId}`);
        console.log(`Found ${userOrders.length} orders for user`);

        for (const order of userOrders) {
          if (!order.order_items || order.order_items.length === 0) continue;

          for (const item of order.order_items) {
            if (item.productId && item.productId._id.toString() === productId.toString()) {
              ownsProduct = true;
              orderStatus = order.status;

              if (order.status === 'paid') {
                canInstall = true;
              }

              break;
            }
          }

          if (ownsProduct) break;
        }

        if (!ownsProduct) {
          console.log('Product not found in any user orders');
        }

      } catch (orderError) {
        console.error('Error checking product ownership:', orderError);
      }
    }

    // Get related products (based on category)
    const relatedProducts = await Product.find({
      categoryId: { $in: product.categoryId },
      _id: { $ne: product._id },
      isListed: true,
    }).limit(4);

    // Get products from the same publisher
    const publisherProducts = await Product.find({
      company: product.company._id,
      _id: { $ne: product._id },
      isListed: true,
    }).limit(4);

    // Final debug log
    console.log('Final ownership status:', {
      ownsProduct,
      orderStatus,
      canInstall,
      userId,
      productId
    });

    // Render the page
    res.render('productDetials', {
      userData,
      user: userData,
      product,
      relatedProducts,
      publisherProducts,
      ownsProduct,
      orderStatus,
      canInstall,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('Error loading product details:', error);
    res.redirect('/pageNotFound');
  }
};






const libraryPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Redirect to login if user is not authenticated
    if (!userId) {
      return res.redirect('/login');
    }

    // Fetch user data
    const userData = await User.findById(userId).lean();
    if (!userData) {
      return res.redirect('/login');
    }

    // Fetch orders with status 'paid' for the user
    const userOrders = await Order.find({ 
      userId,
      status: 'paid'
    })
    .populate({
      path: 'order_items',
      populate: {
        path: 'productId',
        model: 'Product',
        select: 'name poster _id isListed'
      }
    })
    .lean();

    // Extract unique paid games from orders
    const paidGames = [];
    const gameIds = new Set(); // To avoid duplicates

    for (const order of userOrders) {
      if (order.order_items && order.order_items.length > 0) {
        for (const item of order.order_items) {
          if (item.productId && item.productId.isListed && !gameIds.has(item.productId._id.toString())) {
            paidGames.push({
              _id: item.productId._id,
              name: item.productId.name,
              poster: item.productId.poster
            });
            gameIds.add(item.productId._id.toString());
          }
        }
      }
    }

    // Render the library page with user data and paid games
    res.render('library', {
      userData,
      user: userData,
      games: paidGames,
      error: null
    });

  } catch (error) {
    console.error('Error loading library page:', error);
    res.render('library', {
      userData: null,
      user: null,
      games: [],
      error: 'Failed to load library. Please try again later.'
    });
  }
};






const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const otp = generateOtp();
    console.log('Generated OTP for forgot password:', otp); // Console log OTP
    const emailSend = await sendVerificationEmail(email, otp);
    if (!emailSend) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }

    // Store OTP and email in session
    req.session.userOtp = otp;
    req.session.otpExpires = Date.now() + 60 * 1000; // OTP expires in 1 minute
    req.session.forgotPasswordEmail = email;

    console.log('Forgot password OTP sent to:', email);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const verifyOtpForgotPassword = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.otpExpires || !req.session.forgotPasswordEmail) {
      return res.status(400).json({ success: false, message: 'OTP session expired or invalid' });
    }

    if (Date.now() > req.session.otpExpires) {
      req.session.userOtp = null;
      req.session.otpExpires = null;
      req.session.forgotPasswordEmail = null;
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    console.log('Received OTP for forgot password verification:', otp);
    if (otp === req.session.userOtp) {
      res.json({ success: true, message: 'OTP verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Error verifying OTP for forgot password:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.forgotPasswordEmail;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Session expired or invalid' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const passwordHash = await securePassword(password);
    user.password = passwordHash;
    await user.save();

    // Clear session data
    req.session.userOtp = null;
    req.session.otpExpires = null;
    req.session.forgotPasswordEmail = null;

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const downloadGameFile = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.gameFile) {
      return res.status(404).send('File not found');
    }

    const fileUrl = product.gameFile;

    // 1️⃣ Local file handling
    if (!fileUrl.startsWith('http')) {
      const filePath = path.join(__dirname, '..', fileUrl);

      if (fs.existsSync(filePath)) {
        return res.download(filePath);
      } else {
        return res.status(404).send('Local file not found');
      }
    }

    // 2️⃣ External (S3/Cloudinary) — download as attachment via proxy
    const filename = path.basename(fileUrl);

    https.get(fileUrl, (fileRes) => {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', fileRes.headers['content-type']);
      fileRes.pipe(res);
    }).on('error', (err) => {
      console.error(err);
      res.status(500).send('Failed to download file from external source');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};




module.exports = {
  loadHome,
  loadHomepage,
  pageNotFount,
  signUp,
  verifyOtp,
  loadOtpPage,
  resendOtp,
  loadLogin,
  login,
  logout,
  gamesPage,
  productDetails,
  libraryPage,
  supportPage,
  aboutAs,
  forgotPassword,
  verifyOtpForgotPassword,
  resetPassword,
  downloadGameFile
};
