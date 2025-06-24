const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  type: { type: String, enum: ['product', 'category'], required: true },
  duration: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  banner: {
    type: String
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categoryId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  isListed: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now }
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
