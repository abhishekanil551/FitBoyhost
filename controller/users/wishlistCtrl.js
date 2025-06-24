const User = require('../../models/userDb');
const Product = require('../../models/productDb');



const wishlistPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).lean();
    const products = await Product.find({ _id: { $in: user.wishlist }, isListed: true })
      .select('_id name poster salesPrice regularPrice isFree')
      .lean();
    console.log('Products:', products);

    res.render('wishlist', {
      userData:user,
      user,
      products,
      userWishlist: user.wishlist.map(id => id.toString()),
      error: null
    });
  } catch (error) {
    console.error('Error loading wishlist page:', error);
    res.render('wishlist', {
      user: null,
      products: [],
      userWishlist: [],
      error: 'Failed to load wishlist. Please try again later.'
    });
  }
};







const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const user = await User.findById(userId);

    // Check if the product is already in the cart
    if (user.cart.includes(productId)) {
      return res.status(400).json({ message: "Product is already in the cart" });
    }

    // Add product to the user's wishlist
    await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId } });

    res.status(200).json({ message: 'Product added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
};





const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    // Remove product from user's wishlist
    await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
        
    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: "Failed to remove from wishlist" });
  }
};




const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;
    
    if (!userId) {
      return res.json({ isInWishlist: false });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.json({ isInWishlist: false });
    }

    const isInWishlist = user.wishlist && user.wishlist.includes(productId);
    
    res.json({ isInWishlist });
  } catch (error) {
    console.error('Wishlist check failed:', error);
    res.status(500).json({ error: 'Failed to check wishlist status' });
  }
};

module.exports = {
  wishlistPage,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus
};