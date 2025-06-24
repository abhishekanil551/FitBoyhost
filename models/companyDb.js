const mongoose = require("mongoose");
const { Schema } = mongoose;

const companySchema = new Schema({
  companyName: {
    type: String,
    required: true
  },
  companyLogo: {
    type: String,
    required: true,
  },
  companyDescription:{
    type:String,
    required:false
  },
  email:{
    type:String,
    required:true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

const company = mongoose.model("company", companySchema);
module.exports = company;
