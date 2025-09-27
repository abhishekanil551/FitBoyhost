const mongoose = require('mongoose');
const { Schema } = mongoose;

const pointsShopSchema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true 
  },
  pointsRequired: {
    type: Number,
    required: true
  },
  isListed: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const PointsShop = mongoose.model('PointsShop', pointsShopSchema);
module.exports = PointsShop;
