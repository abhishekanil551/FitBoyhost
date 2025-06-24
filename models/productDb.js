const mongoose = require('mongoose');
const { Schema } = mongoose;


const productSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  systemRequirements: {
    type: String
  },
  categoryId: [{
    type: Schema.Types.ObjectId,
    ref: 'Category', 
    required: true
  }],
    gameFile: {
    type: String
  },
  trailer:{
    type: String,
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
    required: true
  },
  regularPrice: {
    type: Number,
    required: true
  },
  salesPrice: {
    type: Number,
    required: true
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    default: null
  },
  poster: {
    type: String,
    required: true,
  },  
  banners: [{
    type: String
  }],
  isListed:{
    type:Boolean,
    default:true
  },
  isBlocked:{
    type:Boolean,
    default:false
  },
  isFree:{
    type:Boolean,
    default:false
  },
  isRecommended:{
    type:Boolean,
    default:false
  },
},

{timestamps:true});

product = mongoose.model('Product', productSchema);
module.exports=product;