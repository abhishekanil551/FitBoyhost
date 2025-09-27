const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  source: { type: String, enum: ["mission", "event", "manual"], required: true },
  rewardValue: { type: Number, default: 1 },
  expiryDays: { type: Number, default: 7 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Voucher", voucherSchema);