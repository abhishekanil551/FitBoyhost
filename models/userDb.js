const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
  },
  password: {
    type: String,
    required: false
  },
  username:{
    type: String,
    required: false,
    unique: true, 
    sparse: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  cart: {
    type: [Schema.Types.ObjectId], 
    ref: 'Product',
    default: [] 
  },
  wallet: [{
    type: Schema.Types.ObjectId,
    ref: 'WalletTransaction'
  }],
  library: [{
    type: Schema.Types.ObjectId,
    ref: 'Library'
  }],
  createdOn: {
    type: Date,
    default: Date.now
  },
  referalCode: {
    type: String
  },
  referredBy: {
  type: String,
  default: null
},
  addresses: [
    {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      isDefault: Boolean,
    }
  ],
  points: { type: Number, default: 0 },
  reasonForGetPoints: { type: String },
  vouchers: {
    available: { type: Number, default: 0 },   
    used: { type: Number, default: 0 },        
  },
    missions: [{
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: "Mission" }, 
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false }
  }],
  loginStreak: { type: Number, default: 0 },
  lastLoginDate: { type: Date, default: null },

  streakRewardsClaimed: [{
    milestone: Number,
    claimedAt: { type: Date }
  }],
  spins: {
    available: { type: Number, default: 0 },
    history: [
      {
        prizeType: { 
          type: String, 
          enum: ['points', 'wallet', 'game', 'tryAgain'], 
          required: true 
        },
        prizeValue: { type: Number, default: 0 },  
        gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' }, 
        usedVoucher: { type: Boolean, default: true },
        missionSource: { type: mongoose.Schema.Types.ObjectId, ref: 'Mission' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  wishlist: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  searchHistory: [{
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    company: {
      type: String
    },
    searchOn: {
      type: Date,
      default: Date.now
    }
  }]
});




User=mongoose.model('User',userSchema)
module.exports=User;


