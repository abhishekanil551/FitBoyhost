const Coupon = require('../../models/couponDb');

const couponManagement = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render('coupon-management', { coupons, errors: {} });
  } catch (error) {
    console.error('Error loading coupon management page:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addCoupon = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { coupencode, couponpercent, minimumAmount, startingDate, expiryDate, description } = req.body;

    if (!coupencode || !couponpercent || !minimumAmount || !startingDate || !expiryDate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    if (isNaN(couponpercent) || couponpercent < 1 || couponpercent > 100) {
      return res.status(400).json({ message: 'Discount % must be between 1 and 100' });
    }
    if (isNaN(minimumAmount) || minimumAmount <= 0) {
      return res.status(400).json({ message: 'Minimum purchase amount must be greater than zero' });
    }
    const startDate = new Date(startingDate);
    const expDate = new Date(expiryDate);
    if (isNaN(startDate) || isNaN(expDate) || startDate >= expDate) {
      return res.status(400).json({ message: 'Start date must be before expiry date' });
    }

    const coupon = await Coupon.create({
      coupencode,
      couponpercent: Number(couponpercent),
      minimumAmount: Number(minimumAmount),
      startingDate: startDate,
      expiryDate: expDate,
      description,
    });

    return res.status(201).json({ message: 'Coupon added successfully', coupon });
  } catch (error) {
    console.error('Error adding coupon:', error);
    return res.status(400).json({ message: error.message || 'Error adding coupon' });
  }
};

const editCoupon = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { id, coupencode, couponpercent, minimumAmount, startingDate, expiryDate, description } = req.body;

    if (!id || !coupencode || !couponpercent || !minimumAmount || !startingDate || !expiryDate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    if (isNaN(couponpercent) || couponpercent < 1 || couponpercent > 100) {
      return res.status(400).json({ message: 'Discount % must be between 1 and 100' });
    }
    if (isNaN(minimumAmount) || minimumAmount <= 0) {
      return res.status(400).json({ message: 'Minimum purchase amount must be greater than zero' });
    }
    const startDate = new Date(startingDate);
    const expDate = new Date(expiryDate);
    if (isNaN(startDate) || isNaN(expDate) || startDate >= expDate) {
      return res.status(400).json({ message: 'Start date must be before expiry date' });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        coupencode,
        couponpercent: Number(couponpercent),
        minimumAmount: Number(minimumAmount),
        startingDate: startDate,
        expiryDate: expDate,
        description,
      },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    return res.status(200).json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error('Error editing coupon:', error);
    return res.status(400).json({ message: error.message || 'Error editing coupon' });
  }
};

const DeleteCoupon = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Coupon ID is required' });
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    return res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({ message: error.message || 'Something went wrong' });
  }
};

module.exports = {
  couponManagement,
  addCoupon,
  editCoupon,
  DeleteCoupon,
};