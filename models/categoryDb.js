const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  isListed: {
    type: Boolean,
    default: true 
  },
   offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    }
}, { timestamps: true });

const category=mongoose.model('Category', categorySchema);
 module.exports =category;