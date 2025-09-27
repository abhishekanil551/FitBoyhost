const SpinPrize = require('../../models/spinPrizeDb');

const renderSpinPrizePage = async (req, res) => {
  try {
    const spinPrizes = await SpinPrize.find().sort({ createdAt: -1 });
    console.log('Fetched spin prizes:', spinPrizes);
    res.render('spinPrize-management', {
      page: 'spinPrize-management',
      spinPrizes
    });
  } catch (error) {
    console.error('Error rendering spin prize page:', error);
    res.status(500).render('error', {
      message: 'Failed to load spin prize management page'
    });
  }
};

const getAllSpinPrizes = async (req, res) => {
  try {
    const spinPrizes = await SpinPrize.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      data: spinPrizes
    });
  } catch (error) {
    console.error('Error fetching spin prizes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch spin prizes'
    });
  }
};

const addSpinPrize = async (req, res) => {
  try {
    const { title, type, value, description, probability } = req.body;

    if (!title || !type || !probability) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, type, and probability are required'
      });
    }

    if (type !== 'try_again' && (!value || value <= 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Value must be greater than 0 for non-try_again prizes'
      });
    }

    if (probability < 0 || probability > 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Probability must be between 0 and 1'
      });
    }

    const spinPrize = new SpinPrize({
      title,
      type,
      value: type === 'try_again' ? 0 : value,
      description,
      probability
    });

    await spinPrize.save();
    res.status(201).json({
      status: 'success',
      message: 'Spin prize added successfully',
      data: spinPrize
    });
  } catch (error) {
    console.error('Error adding spin prize:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add spin prize'
    });
  }
};

 const editSpinPrize = async (req, res) => {
  try {
    const { id, title, type, value, description, probability } = req.body;

    if (!id || !title || !type || !probability) {
      return res.status(400).json({
        status: 'error',
        message: 'ID, title, type, and probability are required'
      });
    }

    if (type !== 'try_again' && (!value || value <= 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Value must be greater than 0 for non-try_again prizes'
      });
    }

    if (probability < 0 || probability > 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Probability must be between 0 and 1'
      });
    }

    const spinPrize = await SpinPrize.findByIdAndUpdate(
      id,
      {
        title,
        type,
        value: type === 'try_again' ? 0 : value,
        description,
        probability,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!spinPrize) {
      return res.status(404).json({
        status: 'error',
        message: 'Spin prize not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Spin prize updated successfully',
      data: spinPrize
    });
  } catch (error) {
    console.error('Error updating spin prize:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update spin prize'
    });
  }
};

const deleteSpinPrize = async (req, res) => {
  try {
    const { id } = req.body;

    const spinPrize = await SpinPrize.findByIdAndDelete(id);

    if (!spinPrize) {
      return res.status(404).json({
        status: 'error',
        message: 'Spin prize not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Spin prize deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting spin prize:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete spin prize'
    });
  }
};

const toggleSpinPrizeStatus = async (req, res) => {
  try {
    const { id, active } = req.body;

    const spinPrize = await SpinPrize.findByIdAndUpdate(
      id,
      { active, updatedAt: Date.now() },
      { new: true }
    );

    if (!spinPrize) {
      return res.status(404).json({
        status: 'error',
        message: 'Spin prize not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Spin prize ${active ? 'activated' : 'deactivated'} successfully`,
      data: spinPrize
    });
  } catch (error) {
    console.error('Error toggling spin prize status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle spin prize status'
    });
  }
};


module.exports={
    renderSpinPrizePage,
    addSpinPrize,
    editSpinPrize,
    deleteSpinPrize,
    toggleSpinPrizeStatus,
}