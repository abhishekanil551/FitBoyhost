const User = require('../../models/userDb');
const Order = require('../../models/orderDb');

const orderManagement = async (req, res) => {
  try {
    const {
      search = '',
      status,
      sort = 'desc',
      page = 1,
      limit = 10,
      startDate,
      endDate
    } = req.query;

    const query = {};
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const users = await User.find({
        $or: [
          { name: { $regex: trimmedSearch, $options: 'i' } },
          { email: { $regex: trimmedSearch, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { orderNumber: { $regex: trimmedSearch, $options: 'i' } },
        { userId: { $in: users.map(user => user._id) } }
      ];
    }

    // Filter by status
    const validStatuses = ['pending', 'paid', 'failed'];
    if (status && validStatuses.includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    // Filter by date range
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    // Fetch filtered, sorted, paginated orders
    const orders = await Order.find(query)
      .sort({ orderDate: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate({
        path: 'order_items',
        populate: {
          path: 'productId',
          select: 'name regularPrice salesPrice'
        }
      })
      .lean();

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limitNum);

    const formattedOrders = orders.map(order => ({
      ...order,
      formattedDate: new Date(order.orderDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      statusColor: {
        pending: 'warning',
        paid: 'success',
        failed: 'danger'
      }[order.status],
      statusDisplay: order.status?.charAt(0).toUpperCase() + order.status?.slice(1)
    }));

    res.render('order-management', {
      orders: formattedOrders,
      currentPage: pageNum,
      totalPages,
      totalOrders,
      search: trimmedSearch,
      status,
      sort,
      startDate,
      endDate,
      statusOptions: [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' }
      ],
      sortOptions: [
        { value: 'desc', label: 'Newest First' },
        { value: 'asc', label: 'Oldest First' }
      ]
    });
  } catch (error) {
    console.error('Order management error:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  orderManagement
};
