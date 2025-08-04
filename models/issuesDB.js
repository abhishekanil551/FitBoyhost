const mongoose = require('mongoose');
const issueSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  issueTitle: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'refund', 'solution'], default: 'pending' },
  
});
module.exports = mongoose.model('Issue', issueSchema);
