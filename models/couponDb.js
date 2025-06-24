// models/couponDb.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
  coupencode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  couponpercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  minimumAmount: {
    type: Number,
    required: true
  },
  startingDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
