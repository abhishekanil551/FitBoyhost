const User = require('../../models/userDb');
const Product = require('../../models/productDb');
const PointsShop = require('../../models/pointsDb');
const Order = require('../../models/orderDb');
const OrderItem = require('../../models/OrderItemDB');
const StatusCodes=require('../../statusCodes')

const myPoints = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const userData = await User.findById(userId).lean();

    let shopItems = await PointsShop.find({ isListed: true })
      .populate('gameId')
      .lean();

    shopItems = shopItems.filter(item => item.pointsRequired > 0);

    const userPointsGames = shopItems.map(item => ({
      _id: item.gameId._id,
      name: item.gameId.name || 'Unknown',
      poster: item.gameId.poster || null,
      categoryName: item.gameId.category || 'Unknown',
      pointsRequired: item.pointsRequired,
      canRedeem: userData.points >= item.pointsRequired
    }));

    res.render('pointsShope', {
      userPointsGames,
      totalPoints: userData.points || 0,
      userData
    });
  } catch (err) {
    console.error('Error in points shop:', err);
    res.status(500).send('Server Error');
  }
};



const generateOrderNumber = async () => {
  let orderNumber;
  let isUnique = false;
  while (!isUnique) {
    const timestamp = Date.now();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    orderNumber = `ORD-${timestamp}-${randomPart}`;
    const existingOrder = await Order.findOne({ orderNumber });
    if (!existingOrder) {
      isUnique = true;
    }
  }
  return orderNumber;
};


const pointsPayment = async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: 'User not logged in' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: 'User not found' });
    }

    const paidOrder = await Order.findOne({
      userId,
      status: 'paid',
      order_items: {
        $in: await OrderItem.find({ productId: gameId }).distinct('_id'),
      },
    });

    if (paidOrder) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'You have this game, check your library',
        redirectUrl: '/library',
      });
    }

    if (!gameId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: 'No game selected for purchase' });
    }

    const pointsShopItem = await PointsShop.findOne({ gameId, isListed: true });
    if (!pointsShopItem) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: `Game with ID ${gameId} not available in points shop` });
    }

    const product = await Product.findById(pointsShopItem.gameId);
    if (!product || !product.isListed || product.isBlocked) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: `Product with ID ${gameId} not found or unavailable` });
    }

    const totalPointsRequired = pointsShopItem.pointsRequired;

    if (user.points < totalPointsRequired) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Insufficient points: ${user.points} < ${totalPointsRequired} required`,
      });
    }

    const orderItem = new OrderItem({
      productId: product._id,
      price: 0, 
    });
    const savedOrderItem = await orderItem.save();
    const orderItems = [savedOrderItem._id];

    const orderNumber = await generateOrderNumber();

    const order = new Order({
      userId,
      orderNumber,
      paymentMethod: 'points',
      address: {
        street: 'N/A',
        city: 'N/A',
        state: 'N/A',
        postalCode: '000000',
        country: 'N/A',
      }, 
      subtotal: 0,
      tax: 0, 
      couponCode: null, 
      couponDiscount: 0,
      total: 0, 
      order_items: orderItems,
      status: 'paid', 
    });

    const savedOrder = await order.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { points: -totalPointsRequired },
      $set: {
        reasonForGetPoints: `Spent ${totalPointsRequired} points on order ${orderNumber}`,
      },
      $push: {
        orders: savedOrder._id,
        library: gameId, 
      },
      $set: { cart: [] }, 
    });

    res.json({
      success: true,
      orderId: savedOrder._id,
      message: 'Payment successful',
      redirectUrl: `/order-success?id=${savedOrder._id}&success=Game purchased successfully with points`,
    });
  } catch (error) {
    console.error('Points payment error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Payment failed',
      error: error.message,
    });
  }
};
module.exports = { myPoints,pointsPayment };
