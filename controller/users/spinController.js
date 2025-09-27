const User = require('../../models/userDb');
const SpinPrize = require('../../models/spinPrizeDb');
const WalletTransaction = require('../../models/walletDb');
const StatusCodes = require('../../statusCodes');


const getSpinWheel = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).render('error', { 
        message: 'Please login to access spin wheel' 
      });
    }

    const prizes = await SpinPrize.find({ active: true }).sort({ probability: -1 });
    
    if (!user.spins) {
      user.spins = { available: 0, history: [] };
      await user.save();
    }

    res.render('spin-wheel', {
      userData: user,
      prizes: prizes,
      spinsAvailable: user.spins.available || 0,
      vouchersAvailable: user.vouchers?.available || 0,
      points: user.points || 0,
      spinHistory: user.spins.history || []
    });
  } catch (error) {
    console.error('Get spin wheel error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('error', { 
      message: 'Failed to load spin wheel' 
    });
  }
};

const processSpin = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const vouchersAvailable = user.vouchers?.available || 0;
    if (vouchersAvailable <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'No vouchers available. Complete missions to earn vouchers.' 
      });
    }

    const prizes = await SpinPrize.find({ active: true });
    if (prizes.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'No prizes available' 
      });
    }

    // Remove random selection - prize will be determined by wheel position
    // The frontend will tell us which prize the pointer landed on
    const { prizeIndex } = req.body;
    
    if (prizeIndex === undefined || prizeIndex < 0 || prizeIndex >= prizes.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false, 
        message: 'Invalid prize selection' 
      });
    }

    const selectedPrize = prizes[prizeIndex];
    user.vouchers.available -= 1;
    let prizeMessage = '';
    let prizeData = {};

    // Map SpinPrize types to User spin history types
    const prizeTypeMap = {
      'wallet_money': 'wallet',
      'try_again': 'tryAgain',
      'points': 'points',
      'game': 'game'
    };

    const historyPrizeType = prizeTypeMap[selectedPrize.type];

    switch (selectedPrize.type) {
      case 'points':
        user.points = (user.points || 0) + selectedPrize.value;
        prizeMessage = `Congratulations! You won ${selectedPrize.value} points!`;
        prizeData = { type: 'points', value: selectedPrize.value, title: selectedPrize.title };
        break;
        
      case 'wallet_money':
        const transaction = new WalletTransaction({
          userId: user._id,
          type: 'credit',
          amount: selectedPrize.value,
          description: `Spin wheel prize: ₹${selectedPrize.value}`,
          date: new Date()
        });
        await transaction.save();
        if (!user.wallet) user.wallet = [];
        user.wallet.push(transaction._id);
        prizeMessage = `Congratulations! You won ₹${selectedPrize.value} wallet money!`;
        prizeData = { type: 'wallet', value: selectedPrize.value, title: selectedPrize.title };
        break;
        
      case 'game':
        if (selectedPrize.gameId) {
          if (!user.library) user.library = [];
          user.library.push(selectedPrize.gameId);
          prizeMessage = `Congratulations! You won a free game: ${selectedPrize.title}!`;
          prizeData = { type: 'game', value: 0, title: selectedPrize.title, gameId: selectedPrize.gameId };
        }
        break;
        
      case 'try_again':
        prizeMessage = 'Try again! Better luck next time.';
        prizeData = { type: 'tryAgain', value: 0, title: 'Try Again' };
        break;
    }

    // Add to spin history with mapped prizeType
    if (!user.spins) user.spins = { available: 0, history: [] };
    
    user.spins.history.unshift({
      prizeType: historyPrizeType,
      prizeValue: selectedPrize.value,
      gameId: selectedPrize.gameId,
      usedVoucher: true,
      prizeTitle: selectedPrize.title,
      createdAt: new Date()
    });

    // Keep only last 50 spin history
    if (user.spins.history.length > 50) {
      user.spins.history = user.spins.history.slice(0, 50);
    }

    await user.save();

    res.json({
      success: true,
      prize: prizeData,
      message: prizeMessage,
      vouchersAvailable: user.vouchers.available,
      points: user.points,
      spinHistory: user.spins.history.slice(0, 10)
    });

  } catch (error) {
    console.error('Process spin error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to process spin' 
    });
  }
};

// Add test voucher
const addTestVoucher = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.vouchers) user.vouchers = { available: 0, used: 0 };
    user.vouchers.available += 1;
    await user.save();

    res.json({
      success: true,
      message: 'Test voucher added successfully!',
      vouchersAvailable: user.vouchers.available
    });
  } catch (error) {
    console.error('Add test voucher error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false, 
      message: 'Failed to add voucher' 
    });
  }
};

module.exports = {
  getSpinWheel,
  processSpin,
  addTestVoucher
};