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


