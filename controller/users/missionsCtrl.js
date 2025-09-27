const Mission = require("../../models/missionDb");
const User = require("../../models/userDb");
const WalletTransaction = require("../../models/walletDb");
const StatusCodes = require("../../statusCodes");

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const getMissions = async (req, res) => {
  try {
    console.log(
      `[${new Date().toISOString()}] getMissions: Session ID: ${req.sessionID}, User ID: ${req.session.userId}`
    );
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.error("getMissions: User not found");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .render("error", { message: "User not found. Please log in." });
    }

    if (!user.missions) user.missions = [];
    if (user.loginStreak === undefined) user.loginStreak = 0;
    if (!user.vouchers) user.vouchers = { available: 0, used: 0 };
    if (user.points === undefined) user.points = 0;

    const today = getStartOfDay(new Date());
    const activeMissions = await Mission.find({
      type: "login",
      active: true,
      startingDate: { $lte: today },
      expiryDate: { $gte: today },
    }).lean();

    for (const mission of activeMissions) {
      let missionEntry = user.missions.find(
        (m) => m.missionId.toString() === mission._id.toString()
      );
      if (!missionEntry) {
        user.missions.push({
          missionId: mission._id,
          progress: user.loginStreak,
          completed: user.loginStreak >= mission.condition,
          claimed: false,
        });
      } else {
        missionEntry.progress = user.loginStreak;
        missionEntry.completed = user.loginStreak >= mission.condition;
      }
    }

    await user.save();

    res.render("missions", {
      userData: user,
      missions: activeMissions,
      userProgress: user.missions,
      message: `Current streak: ${user.loginStreak} days.`,
    });
  } catch (error) {
    console.error("getMissions error:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .render("error", {
        message: `Failed to load missions: ${error.message}`,
      });
  }
};

const claimMission = async (req, res) => {
  try {
    console.log(
      `[${new Date().toISOString()}] claimMission: Session ID: ${req.sessionID}, User ID: ${req.session.userId}`
    );
    console.log(
      `[${new Date().toISOString()}] claimMission: Mission ID: ${req.params.missionId}`
    );

    if (!req.session.userId) {
      console.error("claimMission: No user ID in session");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "User not authenticated" });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      console.error("claimMission: User not found in database");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "User not found" });
    }

    const mission = await Mission.findById(req.params.missionId);
    if (!mission) {
      console.error("claimMission: Mission not found:", req.params.missionId);
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Mission not found" });
    }

    console.log("claimMission: Found mission:", mission.title);

    if (!user.missions) {
      user.missions = [];
    }

    let missionEntry = user.missions.find(
      (m) => m.missionId.toString() === mission._id.toString()
    );
    if (!missionEntry) {
      console.error("claimMission: Mission entry not found for user");
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Mission not assigned to user" });
    }

    console.log("claimMission: Mission entry found:", {
      progress: missionEntry.progress,
      completed: missionEntry.completed,
      claimed: missionEntry.claimed,
      condition: mission.condition,
    });

    if (missionEntry.claimed) {
      console.error("claimMission: Mission already claimed");
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Mission already claimed" });
    }

    if (!missionEntry.completed) {
      console.error("claimMission: Mission not completed");
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Mission not completed" });
    }

    let rewardMessage = "";

    if (!user.vouchers) {
      user.vouchers = { available: 0, used: 0 };
    }

    if (mission.rewardType === "voucher") {
      user.vouchers.available =
        (user.vouchers.available || 0) + mission.rewardValue;
      rewardMessage = `Claimed ${mission.rewardValue} ticket${mission.rewardValue > 1 ? "s" : ""}!`;
      console.log("claimMission: Voucher reward granted");
    } else if (mission.rewardType === "points") {
      user.points = (user.points || 0) + mission.rewardValue;
      rewardMessage = `Claimed ${mission.rewardValue} points!`;
    }

    missionEntry.claimed = true;

    await user.save();

    res.json({
      success: true,
      message: rewardMessage,
      vouchersAvailable: user.vouchers.available,
      points: user.points,
    });
  } catch (error) {
    console.error("Claim mission error:", error);
    console.error("Error stack:", error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: `Failed to claim mission: ${error.message}`,
    });
  }
};

module.exports = { getMissions, claimMission };
