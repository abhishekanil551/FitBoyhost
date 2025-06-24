const mongoose = require("mongoose");

const systemSpecSchema = new mongoose.Schema({
  platform: String,
  cpu: String,
  ram: String,
  storage: String,
  gpu: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SystemSpec", systemSpecSchema);
