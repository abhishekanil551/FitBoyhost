const mongoose = require('mongoose');

const spinPrizeSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Free Game", "50 Points", "Try Again", "₹20 Wallet"
  type: { 
    type: String, 
    enum: ['game', 'points', 'wallet_money', 'try_again'], 
    required: true 
  },
  value: { type: Number, default: 0 },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: false }, // only for "game" type
  probability: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SpinPrize', spinPrizeSchema);
