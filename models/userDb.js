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
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  cart: {
    type: [Schema.Types.ObjectId], // Change here to an array of ObjectIds
    ref: 'Product',
    default: [] // Initialize as an empty array
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


