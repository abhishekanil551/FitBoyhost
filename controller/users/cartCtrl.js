const Product = require('../../models/productDb');
const User = require('../../models/userDb');
const Cart = require('../../models/cartDb');
const Order=require('../../models/orderDb')


const cartPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.render('cart', {
        user: null,
        product: [],
        userCart: [],
        error: 'User not found.'
      });
    }

    // Fetch user's paid orders
    const paidOrders = await Order.find({ userId, status: 'paid' })
      .populate({
        path: 'order_items',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      });

    // Extract purchased product IDs
    const purchasedProductIds = new Set();
    for (const order of paidOrders) {
      for (const item of order.order_items) {
        if (item.productId) {
          purchasedProductIds.add(item.productId._id.toString());
        }
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Fetch user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId').lean();

    let filteredItems = [];
    if (cart && cart.items.length > 0) {
      filteredItems = cart.items.filter(item =>
        item.productId &&
        item.productId.isListed &&
        !purchasedProductIds.has(item.productId._id.toString())
      );
    }

    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    const products = paginatedItems.map(item => ({
      _id: item.productId._id,
      name: item.productId.name,
      poster: item.productId.poster,
      salesPrice: item.price,
      regularPrice: item.productId.regularPrice,
      isFree: item.productId.isFree
    }));

    const userCart = products.map(item => item._id.toString());

    // Build query string for pagination links (if needed)
    const queryString = Object.entries(req.query)
      .filter(([key]) => key !== 'page')
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    res.render('cart', {
      userData: user,
      user,
      product: products,
      userCart,
      error: null,
      currentPage: page,
      totalPages,
      queryString
    });

  } catch (error) {
    console.error('Error loading cart:', error);
    res.render('cart', {
      user: null,
      product: [],
      userCart: [],
      error: 'Failed to load cart. Please try again later.',
      currentPage: 1,
      totalPages: 1,
      queryString: ''
    });
  }
};




const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Please log in to add to cart', success: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isListed) {
      return res.status(404).json({ message: 'Product not found or unavailable', success: false });
    }

    const price = product.isFree ? 0 : (product.salesPrice || product.regularPrice);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if product is already in cart
    if (cart.items.some(item => item.productId.toString() === productId)) {
      return res.json({ message: 'Product is already in the cart', success: false });
    }

    // Add product to cart
    cart.items.push({ productId, price });
    await cart.save();

    // Remove from wishlist if present
    const wishlistIndex = user.wishlist.indexOf(productId);
    if (wishlistIndex > -1) {
      user.wishlist.splice(wishlistIndex, 1);
      await user.save();
    }

    res.json({ message: 'Product added to cart', success: true });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add product to cart', success: false });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Please log in to remove from cart', success: false });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) {
      return res.json({ message: 'Product not found in the cart', success: false });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.json({ message: 'Product removed from cart', success: true });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Failed to remove product from cart', success: false });
  }
};

module.exports = {
  cartPage,
  addToCart,
  removeFromCart,
};