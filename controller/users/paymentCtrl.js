const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const latex = require('node-latex');
const Order = require('../../models/orderDb');
const User = require('../../models/userDb');
const OrderItem = require('../../models/OrderItemDB');
const Product = require('../../models/productDb');
const Coupon=require('../../models/couponDb');
const WalletTransaction = require('../../models/walletDb');
const { sendInvoiceEmail } = require('../../config/email');


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper to generate a unique order number
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

// Helper to escape LaTeX special characters
const escapeLatex = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
};

const createOrder = async (req, res) => {
  try {
    const { address, paymentMethod, products, couponCode } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    // Allow products to be passed directly or fetched from user's cart
    let productIds = products;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      // If no products provided, fetch from user's cart
      const user = await User.findById(req.session.userId).populate('cart');
      if (!user.cart || user.cart.length === 0) {
        return res.status(400).json({ message: 'No products in cart' });
      }
      productIds = user.cart.map(item => item._id);
    }

    const addressParts = address.split(', ');
    if (addressParts.length !== 4) {
      return res.status(400).json({ message: 'Invalid address format' });
    }
    const [street, city, stateAndPostal, country] = addressParts;
    const [state, postalCode] = stateAndPostal.split(' ');

    const orderItems = [];
    let subtotal = 0;

    // Calculate total price and create order items
    for (const productId of productIds) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${productId} not found` });
      }

      const price = product.isFree ? 0 : (product.salesPrice || product.regularPrice);
      subtotal += price;

      const orderItem = new OrderItem({
        productId: product._id,
        price: price
      });
      const savedOrderItem = await orderItem.save();
      orderItems.push(savedOrderItem._id);
    }

    // Add 18% tax
    const taxRate = 0.18;
    const tax = subtotal * taxRate;
    let total = subtotal + tax;
    let couponDiscount=0;

   if (couponCode) {
      const coupon = await Coupon.findOne({ coupencode: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or inactive coupon' });
      }
      const now = new Date();
      if (now < coupon.startingDate || now > coupon.expiryDate) {
        return res.status(400).json({ message: 'Coupon is expired or not yet valid' });
      }
      if (total < coupon.minimumAmount) {
        return res.status(400).json({ message: `Minimum purchase ₹${coupon.minimumAmount} required` });
      }
      couponDiscount = (total * coupon.couponpercent) / 100;
      total -= couponDiscount;
    }if (couponCode) {
      const coupon = await Coupon.findOne({ coupencode: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or inactive coupon' });
      }
      const now = new Date();
      if (now < coupon.startingDate || now > coupon.expiryDate) {
        return res.status(400).json({ message: 'Coupon is expired or not yet valid' });
      }
      if (total < coupon.minimumAmount) {
        return res.status(400).json({ message: `Minimum purchase ₹${coupon.minimumAmount} required` });
      }
      couponDiscount = (total * coupon.couponpercent) / 100;
      total -= couponDiscount;
    }

    const orderNumber = await generateOrderNumber();

    // Amount for Razorpay is in paise
    const razorpayAmount = Math.round(total * 100);

    const options = {
      amount: razorpayAmount,
      currency: 'INR',
      receipt: orderNumber
    };
    console.log('Creating Razorpay order with options:', options);
    const razorpayOrder = await razorpay.orders.create(options);
    console.log('Razorpay order created:', razorpayOrder);

    const order = new Order({
      userId: req.session.userId,
      orderNumber: orderNumber,
      paymentMethod: paymentMethod,
      address: {
        street,
        city,
        state,
        postalCode,
        country
      },
      subtotal: subtotal,
      tax: tax,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount,
      total: total,
      order_items: orderItems,
      transactionId: razorpayOrder.id,
    });

    const savedOrder = await order.save();

    await User.findByIdAndUpdate(
      req.session.userId,
      {
        $push: { orders: savedOrder._id },
        $set: { cart: [] }
      }
    );

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: razorpayOrder.id
    });
  } catch (error) {
    console.error('Error creating order:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};



const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const order = await Order.findOne({ transactionId: razorpay_order_id })
      .populate('userId')
      .populate({
        path: 'order_items',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify payment with Razorpay API
    let paymentDetails;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('Razorpay payment details:', paymentDetails);
      if (paymentDetails.order_id !== razorpay_order_id || paymentDetails.status !== 'captured') {
        throw new Error('Payment verification failed with Razorpay API');
      }
    } catch (apiError) {
      console.error('Error fetching payment details from Razorpay:', apiError);
      throw new Error('Failed to verify payment with Razorpay');
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Update order status to 'paid'
      await Order.findOneAndUpdate(
        { transactionId: razorpay_order_id },
        { 
          $set: { 
            transactionId: razorpay_payment_id,
            status: 'paid'
          }
        }
      );

      const latexContent = `
% Setting up the document class and geometry
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{graphicx}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{longtable}
\\usepackage{booktabs}
\\usepackage{xcolor}

% Header and footer setup
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\textbf{Fitboy Games Invoice}}
\\fancyhead[R]{\\today}
\\fancyfoot[C]{Page \\thepage\\ of \\pageref{LastPage}}

% Title and basic info
\\begin{document}

% Invoice Header
\\begin{center}
  {\\Huge \\textbf{Invoice}} \\vspace{0.5cm} \\\\
  {\\Large Fitboy Games} \\\\
  {\\normalsize Email: fitboy55551@gmail.com} \\\\
  {\\normalsize Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}} \\\\
  {\\normalsize Order Number: ${escapeLatex(order.orderNumber)}}
\\end{center}

\\vspace{1cm}

% Customer Information
\\noindent
\\textbf{Billed To:} \\\\
${escapeLatex(order.userId.name)} \\\\
${escapeLatex(order.userId.email)} \\\\
${escapeLatex(order.address.street)}, ${escapeLatex(order.address.city)}, ${escapeLatex(order.address.state)} ${escapeLatex(order.address.postalCode)}, ${escapeLatex(order.address.country)}

\\vspace{0.5cm}

% Order Details
\\noindent
\\textbf{Order Details:} \\\\
Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} \\\\
Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)} \\\\
Payment Method: ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}

\\vspace{0.5cm}

% Items Table
\\noindent
\\textbf{Items Purchased:}
\\begin{longtable}{p{5cm} p{5cm} r r}
  \\toprule
  \\textbf{Game} & \\textbf{Description} & \\textbf{Price (Rs.)} & \\textbf{Total (Rs.)} \\\\
  \\midrule
  ${order.order_items.map(item => `
    ${escapeLatex(item.productId.name)} & ${escapeLatex(item.productId.description || 'N/A')} & ${item.price.toFixed(2)} & ${item.price.toFixed(2)} \\\\
  `).join('')}
  \\midrule
  \\multicolumn{3}{r}{\\textbf{Subtotal:}} & ${order.order_items.reduce((sum, item) => sum + item.price, 0).toFixed(2)} \\\\
  \\multicolumn{3}{r}{\\textbf{Tax (18\\%):}} & ${(order.total - order.order_items.reduce((sum, item) => sum + item.price, 0)).toFixed(2)} \\\\
  \\multicolumn{3}{r}{\\textbf{Total:}} & ${order.total.toFixed(2)} \\\\
  \\bottomrule
\\end{longtable}

\\vspace{1cm}

% Footer Note
\\noindent
\\textit{Thank you for your purchase! For any queries, contact us at fitboy55551@gmail.com.}

\\end{document}
`;

      const pdfStream = latex(latexContent);
      const chunks = [];
      pdfStream.on('data', (chunk) => chunks.push(chunk));
      pdfStream.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        try {
          await sendInvoiceEmail(order.userId, order, pdfBuffer);
          res.json({ success: true });
        } catch (emailError) {
          console.error('Email sending failed, but payment was successful:', emailError);
          res.json({ 
            success: true, 
            message: 'Payment successful, but failed to send invoice email. Please download your invoice from the orders page.'
          });
        }
      });
      pdfStream.on('error', (err) => {
        console.error('Error compiling LaTeX to PDF for email:', err);
        res.status(500).json({ success: false, message: 'Failed to process payment due to invoice generation error' });
      });
    } else {
      // Update order status to 'failed'
      await Order.findOneAndUpdate(
        { transactionId: razorpay_order_id },
        { $set: { status: 'failed' } }
      );
      res.json({
        success: false,
        message: `Payment failed.`
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    console.error('Stack trace:', error.stack);
    const order = await Order.findOne({ transactionId: req.body.razorpay_order_id });
    if (order) {
      await Order.findOneAndUpdate(
        { transactionId: req.body.razorpay_order_id },
        { $set: { status: 'failed' } }
      );
      res.json({
        success: false,
        message: `Payment failed.`
      });
    } else {
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  }
};


const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('userId')
      .populate({
        path: 'order_items',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      });

    if (!order) {
      return res.status(404).render('error', { message: 'Order not found.' });
    }

    if (order.userId._id.toString() !== req.session.userId) {
      return res.status(403).render('error', { message: 'Unauthorized access.' });
    }

    const latexContent = `
% Setting up the document class and geometry
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{graphicx}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{longtable}
\\usepackage{booktabs}
\\usepackage{xcolor}

% Header and footer setup
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\textbf{Fitboy Games Invoice}}
\\fancyhead[R]{\\today}
\\fancyfoot[C]{Page \\thepage\\ of \\pageref{LastPage}}

% Title and basic info
\\begin{document}

% Invoice Header
\\begin{center}
  {\\Huge \\textbf{Invoice}} \\vspace{0.5cm} \\\\
  {\\Large Fitboy Games} \\\\
  {\\normalsize Email: fitboy55551@gmail.com} \\\\
  {\\normalsize Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}} \\\\
  {\\normalsize Order Number: ${escapeLatex(order.orderNumber)}}
\\end{center}

\\vspace{1cm}

% Customer Information
\\noindent
\\textbf{Billed To:} \\\\
${escapeLatex(order.userId.name)} \\\\
${escapeLatex(order.userId.email)} \\\\
${escapeLatex(order.address.street)}, ${escapeLatex(order.address.city)}, ${escapeLatex(order.address.state)} ${escapeLatex(order.address.postalCode)}, ${escapeLatex(order.address.country)}

\\vspace{0.5cm}

% Order Details
\\noindent
\\textbf{Order Details:} \\\\
Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} \\\\
Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)} \\\\
Payment Method: ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}

\\vspace{0.5cm}

% Items Table
\\noindent
\\textbf{Items Purchased:}
\\begin{longtable}{p{5cm} p{5cm} r r}
  \\toprule
  \\textbf{Game} & \\textbf{Description} & \\textbf{Price (Rs.)} & \\textbf{Total (Rs.)} \\\\
  \\midrule
  ${order.order_items.map(item => `
    ${escapeLatex(item.productId.name)} & ${escapeLatex(item.productId.description || 'N/A')} & ${item.price.toFixed(2)} & ${item.price.toFixed(2)} \\\\
  `).join('')}
  \\midrule
  \\multicolumn{3}{r}{\\textbf{Subtotal:}} & ${order.order_items.reduce((sum, item) => sum + item.price, 0).toFixed(2)} \\\\
  \\multicolumn{3}{r}{\\textbf{Tax (18\\%):}} & ${(order.total - order.order_items.reduce((sum, item) => sum + item.price, 0)).toFixed(2)} \\\\
  \\multicolumn{3}{r}{\\textbf{Total:}} & ${order.total.toFixed(2)} \\\\
  \\bottomrule
\\end{longtable}

\\vspace{1cm}

% Footer Note
\\noindent
\\textit{Thank you for your purchase! For any queries, contact us at fitboy55551@gmail.com.}

\\end{document}
`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`
    });

    const pdfStream = latex(latexContent);
    pdfStream.pipe(res);
    pdfStream.on('error', (err) => {
      console.error('Error compiling LaTeX to PDF:', err);
      res.status(500).render('error', { message: 'Failed to generate invoice PDF. Please try again later.' });
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).render('error', { message: 'Failed to generate invoice. Please try again later.' });
  }
};

const orderSuccess = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).send('Please log in to view order success');
    }

    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).send('User not found');
    }

    const orderId = req.query.id; // Optionally use order ID from URL
    let query = { userId };
    if (orderId) {
      query._id = orderId;
    }

    const order = await Order.findOne(query)
      .sort({ createdAt: -1 })
      .populate('userId')
      .populate({
        path: 'order_items',
        populate: { path: 'productId', model: 'Product' }
      });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('order-success', {
      order,
      userData,
      orderId: order._id,
      totalAmount: order.totalAmount || order.order_items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    });
  } catch (error) {
    console.error('Error rendering order success:', error);
    res.status(500).send('Server error');
  }
};




// Wallet Payment Controller
const walletPayment = async (req, res) => {
  try {
    const { address, products, couponCode } = req.body;
    const userId = req.session.userId;

    // Validation checks (same as before)
    if (!userId) return res.status(401).json({ message: 'User not logged in' });
    if (!address) return res.status(400).json({ message: 'Address is required' });

    // Parse address
    const addressParts = address.split(', ');
    if (addressParts.length !== 4) {
      return res.status(400).json({ message: 'Invalid address format' });
    }
    const [street, city, stateAndPostal, country] = addressParts;
    const [state, postalCode] = stateAndPostal.split(' ');

    // Get user and calculate wallet balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = await WalletTransaction.find({ userId });
    const walletBalance = transactions.reduce((sum, tx) => {
      return tx.type === 'credit' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    // Process order items
    const orderItems = [];
    let subtotal = 0;

    for (const productId of products) {
      const product = await Product.findById(productId);
      if (!product) return res.status(400).json({ message: `Product not found` });

      const price = product.isFree ? 0 : (product.salesPrice || product.regularPrice);
      subtotal += price;

      const orderItem = new OrderItem({ productId: product._id, price });
      const savedOrderItem = await orderItem.save();
      orderItems.push(savedOrderItem._id);
    }

    // Calculate totals
    const taxRate = 0.18;
    const tax = subtotal * taxRate;
    let total = subtotal + tax;
    let couponDiscount = 0;

    // Coupon validation (same as before)
   if (couponCode) {
      const coupon = await Coupon.findOne({ coupencode: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or inactive coupon' });
      }
      const now = new Date();
      if (now < coupon.startingDate || now > coupon.expiryDate) {
        return res.status(400).json({ message: 'Coupon is expired or not yet valid' });
      }
      if (total < coupon.minimumAmount) {
        return res.status(400).json({ message: `Minimum purchase ₹${coupon.minimumAmount} required` });
      }
      couponDiscount = (total * coupon.couponpercent) / 100;
      total -= couponDiscount;
    }

    // Check balance
    if (walletBalance < total) {
      return res.status(400).json({ 
        message: `Insufficient balance: ₹${walletBalance.toFixed(2)} < ₹${total.toFixed(2)}`
      });
    }

    // Create debit transaction
    const debitTransaction = new WalletTransaction({
      userId,
      amount: total,
      type: 'debit',
      description: `Payment for order`
    });
    await debitTransaction.save();

    // Create order
    const orderNumber = await generateOrderNumber();
    const order = new Order({
      userId,
      orderNumber,
      paymentMethod: 'wallet',
      address: { street, city, state, postalCode, country },
      subtotal,
      tax,
      couponCode: couponCode || null,
      couponDiscount,
      total,
      order_items: orderItems,
      status: 'paid'
    });
    const savedOrder = await order.save();

    // Update user
    await User.findByIdAndUpdate(userId, {
      $push: { 
        wallet: debitTransaction._id,
        library: { $each: products },
        orders: savedOrder._id
      },
      $set: { cart: [] }
    });

    // Generate invoice 
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('userId')
      .populate({
        path: 'order_items',
        populate: { path: 'productId', model: 'Product' }
      });


    res.json({ 
      success: true,
      orderId: savedOrder._id,
      message: 'Payment successful'
    });

  } catch (error) {
    console.error('Wallet payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Payment failed',
      error: error.message 
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  orderSuccess,
  generateInvoice,
  walletPayment,
};