const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);
module.exports = OrderItem;