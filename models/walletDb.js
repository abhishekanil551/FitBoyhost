const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: [0, 'Transaction amount must be positive'] 
  },
  type: { 
    type: String, 
    enum: ['credit', 'debit'], 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
