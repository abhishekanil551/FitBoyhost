const Voucher = require('../../models/voucherDb');
const Mission = require('../../models/missionDb');
const User=require('../../models/userDb');

const vouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({}).lean(); 
    const issuedCounts = await User.aggregate([
      { $unwind: "$vouchers" }, 
      { $match: { "vouchers.available": { $gt: 0 } } },
      {
        $group: {
          _id: "$vouchers.voucherId", 
          total: { $sum: "$vouchers.available" }
        }
      }
    ]);

    const issuedCountMap = issuedCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.total;
      return acc;
    }, {});

    const vouchersWithCount = vouchers.map((voucher) => ({
      ...voucher,
      issuedCount: issuedCountMap[voucher._id.toString()] || 0
    }));

    res.render("voucher-management", { vouchers: vouchersWithCount });

  } catch (error) {
    console.error("Voucher fetch error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      message: "Error fetching voucher rules",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error"
    });
  }
};


const addVoucher= async (req, res) => {
  try {
    const { source, rewardValue, expiryDays } = req.body;
    const voucher = new Voucher({
      source,
      rewardValue: Number(rewardValue),
      expiryDays: Number(expiryDays),
    });
    await voucher.save();
    res.status(200).json({ message: 'Voucher rule added successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const editVoucher= async (req, res) => {
  try {
    const { id, source, rewardValue, expiryDays } = req.body;
    await Voucher.findByIdAndUpdate(id, {
      source,
      rewardValue: Number(rewardValue),
      expiryDays: Number(expiryDays),
    });
    res.status(200).json({ message: 'Voucher rule updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const deleteVoucher=async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.body.id);
    res.status(200).json({ message: 'Voucher rule deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const statusvoucher = async (req, res) => {
  try {
    const { id, isActive } = req.body;
    await Voucher.findByIdAndUpdate(id, { isActive });
    res.status(200).json({ message: `Voucher rule ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// // Generate voucher on mission completion (example endpoint)
// router.post('/complete-mission', async (req, res) => {
//   try {
//     const { userId, missionId } = req.body;
//     const mission = await Mission.findById(missionId);
//     if (!mission || !mission.active || mission.expiryDate < new Date() || mission.startingDate > new Date()) {
//       return res.status(400).json({ message: 'Mission is not active or valid' });
//     }

//     // Check if user has completed the mission (logic depends on mission type)
//     // Placeholder: Assume mission is completed
//     const voucherRule = await Voucher.findOne({ source: 'mission', isActive: true });
//     if (!voucherRule) {
//       return res.status(400).json({ message: 'No active voucher rule for missions' });
//     }

//     // Generate user voucher
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + voucherRule.expiryDays);
//     const userVoucher = new UserVoucher({
//       userId,
//       voucherRuleId: voucherRule._id,
//       rewardValue: voucherRule.rewardValue,
//       expiresAt,
//     });
//     await userVoucher.save();

//     // Update user tickets (for Spin Wheel)
//     // Assuming a User model with a tickets field
//     await User.findByIdAndUpdate(userId, { $inc: { tickets: voucherRule.rewardValue } });

//     res.status(200).json({ message: 'Voucher generated successfully', tickets: voucherRule.rewardValue });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

module.exports = {
    vouchers,
    addVoucher,
    editVoucher,
    deleteVoucher,
    statusvoucher,

};