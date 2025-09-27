const Mission = require("../../models/missionDb");

const mission = async (req, res) => {
  try {
    const missions = await Mission.find();
    res.render("mission-management", { missions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching missions" });
  }
};


const addMission = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      condition,
      rewardType,
      rewardValue,
      startingDate,
      expiryDate,
    } = req.body;
    const mission = new Mission({
      title,
      description,
      type,
      condition: Number(condition),
      rewardType,
      rewardValue: Number(rewardValue),
      startingDate: new Date(startingDate),
      expiryDate: new Date(expiryDate),
    });
    await mission.save();
    res.status(200).json({ message: "Mission added successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const editMission = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      type,
      condition,
      rewardType,
      rewardValue,
      startingDate,
      expiryDate,
    } = req.body;
    await Mission.findByIdAndUpdate(id, {
      title,
      description,
      type,
      condition: Number(condition),
      rewardType,
      rewardValue: Number(rewardValue),
      startingDate: new Date(startingDate),
      expiryDate: new Date(expiryDate),
    });
    res.status(200).json({ message: "Mission updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const deleteMission = async (req, res) => {
  try {
    await Mission.findByIdAndDelete(req.body.id);
    res.status(200).json({ message: "Mission deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const missionStatus= async (req, res) => {
  try {
    const { id, active } = req.body;
    await Mission.findByIdAndUpdate(id, { active });
    res.status(200).json({ message: `Mission ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports = {
  mission,
  addMission,
  editMission,
  deleteMission,
  missionStatus,
};
