const UserIssues = require('../../models/issuesDB');
const User = require('../../models/userDb');
const Product = require('../../models/productDb');
const Company = require('../../models/companyDb');
const Order = require('../../models/orderDb');
const OrderItem = require('../../models/OrderItemDB');
const WalletTransaction = require('../../models/walletDb');
const Solution = require('../../models/solutionDb');

const getUserIssues = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || '';
    const selectedStatus = req.query.status || '';

    const query = {};

    if (search.trim() !== '') {
      query.$or = [
        { issueTitle: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (selectedStatus) {
      query.status = selectedStatus;
    }

    const issues = await UserIssues.find(query)
      .populate({
        path: 'productId',
        select: 'name regularPrice salesPrice isFree isListed company',
        populate: {
          path: 'company',
          select: 'name'
        }
      })
      .populate({
        path: 'userId',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalIssues = await UserIssues.countDocuments(query);
    const totalPages = Math.ceil(totalIssues / limit);

    res.render('userIssues', {
      issues,
      search,
      currentPage: page,
      totalPages,
      selectedStatus
    });

  } catch (error) {
    console.error('Error fetching user issues:', error);
    res.redirect(`/admin/issue-management?error=${encodeURIComponent('Failed to load issues')}`);
  }
};



const solution = async (req, res) => {
    try {
        const issueId = req.params.issueId;
        const { description, videoUrl } = req.body.solution || {};
        const issue = await UserIssues.findById(issueId);
        
        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }
        
        const userId = issue.userId;
        const productId = issue.productId;

        const orderitems = await OrderItem.find({ productId: productId }).select('_id');
        const orderitemsIds = orderitems.map(item => item._id);

        if (orderitemsIds.length == 0) {
            return res.status(404).json({ success: false, message: 'Product not found in any order item' });
        }
        
        const order = await Order.findOne({
            userId: userId,
            status: 'paid',
            order_items: { $in: orderitemsIds }
        });
        
        if (!order) {
            return res.status(403).json({ success: false, message: 'User has not purchased this product' });
        }        
        
        const savedSolution = await Solution.create({
            issueId,
            description,
            videoUrl,
            refundAmount: 0,
        });
        
        issue.status = 'solution';
        await issue.save();
        
        // Return success response with the solution data
        res.status(200).json({ 
            success: true,
            message: 'Solution saved successfully', 
            solution: savedSolution 
        });

    } catch (error) {
        console.error("Error saving solution:", error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
}


const refund=async (req,res)=>{
  try {
    console.log('Refund endpoint hit'); // Initial log to confirm endpoint is reached
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
      const issueId = req.params.issueId;
      const issue = await UserIssues.findById(issueId);
        
      if (!issue) {
          return res.status(404).json({ success: false, message: 'Issue not found' });
      }
        
        const userId = issue.userId;
        const productId = issue.productId;

        const orderitems = await OrderItem.find({ productId: productId }).select('_id');
        const orderitemsIds = orderitems.map(item => item._id);

        if (orderitemsIds.length == 0) {
            return res.status(404).json({ success: false, message: 'Product not found in any order item' });
        }
        
        const order = await Order.findOne({
            userId: userId,
            status: 'paid',
            order_items: { $in: orderitemsIds }
        });

        if (!order) {
            return res.status(403).json({ success: false, message: 'User has not purchased this product' });
        }

        const matchedOrderItemId = order.order_items.find(id =>
          orderitemsIds.some(itemId => itemId.toString() === id.toString())
        );

        const matchedOrderItem = await OrderItem.findById(matchedOrderItemId);

        if (!matchedOrderItem) {
        return res.status(404).json({ success: false, message: 'Order item not found for refund' });
        } 

        const totalPrice = matchedOrderItem.price;
        const taxRate = 0.18;
        const taxAmount = totalPrice * taxRate;
        const refundAmount = Math.round((totalPrice - taxAmount) * 100) / 100; 
        
      const transaction=new WalletTransaction({
        userId,
        amount:refundAmount,
        type:'credit',
        description: `Refund for product ID ${productId}. Tax not included in refund.`
      })
      await transaction.save();

      issue.status = 'refund';
      await issue.save();
      order.status='failed';
      await order.save();

      return res.status(200).json({success:true,message:'Refund credited to wallet',refundAmount});


      } catch (error) {
        console.log('Refund Error:',error);
       return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  getUserIssues,
  solution,
  refund,

};
