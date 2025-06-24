const mongoose = require('mongoose');
const { Schema } = mongoose;

const gameRequirementSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  minimum: {
    os: String,
    processor: String,
    processorScore: Number, 
    memoryGB: Number,
    graphics: String,
    graphicsScore: Number, 
    storageGB: Number,
  },
  recommended: {
    os: String,
    processor: String,
    processorScore: Number, 
    memoryGB: Number,
    graphics: String,
    graphicsScore: Number, 
    storageGB: Number,
  },
}, { timestamps: true });

const Requirement = mongoose.model('GameRequirement', gameRequirementSchema);
module.exports = Requirement;