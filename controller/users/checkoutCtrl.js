const Product = require("../../models/productDb");
const User = require("../../models/userDb");
const Cart = require("../../models/cartDb");
const WalletTransaction = require("../../models/walletDb");
const Coupon = require("../../models/couponDb");
const StatusCodes=require('../../statusCodes');


const checkoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userData = await User.findById(userId).lean();
    if (!userData) {
      return res.status(StatusCodes.NOT_FOUND).render("error", { message: "User not found" });
    }

    const transactions = await WalletTransaction.find({ userId }).lean();

    const balance = transactions.reduce((sum, tx) => {
      return tx.type === "credit" ? sum + tx.amount : sum - tx.amount;
    }, 0);

    const products = [];

    if (req.query.buyNow) {
      const product = await Product.findById(req.query.buyNow);
      if (!product) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .render("error", { message: "Product not found" });
      }

      products.push({
        _id: product._id,
        name: product.name,
        price: product.isFree ? 0 : product.salesPrice || product.regularPrice,
        image: product.poster,
      });
    } else {
      const cart = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();
      if (cart?.items?.length > 0) {
        for (let item of cart.items) {
          if (item.productId) {
            products.push({
              _id: item.productId._id,
              name: item.productId.name,
              price: item.price,
              image: item.productId.poster,
            });
          }
        }
      }
    }
    res.render("checkout", {
      userData,
      products,
      balance,
    });
  } catch (error) {
    console.error("Error in checkoutPage:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).render("error", { message: "Internal Server Error" });
  }
};

const applyCoupon = async (req, res) => {
  const { code } = req.body;
  try {
    const coupon = await Coupon.findOne({
      coupencode: code.toUpperCase(),
      isActive: true,
      startingDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Invalid or expired coupon.",
      });
    }

    res.json({
      success: true,
      discountPercent: coupon.couponpercent,
    });
  } catch (err) {
    console.error("Coupon error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  checkoutPage,
  applyCoupon,
};
