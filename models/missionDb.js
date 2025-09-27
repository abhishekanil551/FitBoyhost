const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ["login"], required: true },
  condition: { type: Number, required: true },
  rewardType: { type: String, enum: ["points", "voucher"], required: true },
  rewardValue: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  startingDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Mission", missionSchema);