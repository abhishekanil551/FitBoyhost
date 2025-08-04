const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  description: {                    
    type: String,
    required: true,
  },
  videoUrl: {                       
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Solution', solutionSchema);
