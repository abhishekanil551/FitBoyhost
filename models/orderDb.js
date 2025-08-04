const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: { 
    type: String,
    required: true,
    unique: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  transactionId: {
    type: String
  },
  couponId: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  total: {
    type: Number,
    required: true
  },
  couponCode: { 
    type: String,
     default: null
   }, 
  couponDiscount: {
   type: Number,
   default: 0 
  },
  order_items: [{
    type: Schema.Types.ObjectId,
    ref: 'OrderItem'
  }],
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
},
{ timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;