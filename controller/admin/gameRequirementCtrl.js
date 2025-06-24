const mongoose = require('mongoose');
const Requirement = require('../../models/GameRequirementDb');
const Product = require('../../models/productDb');

// Utility function to validate requirement structure
const validateRequirements = (reqBody, type = 'add') => {
  const { productId, minimum, recommended } = reqBody;
  const errors = [];

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    errors.push('Valid Product ID is required');
  }

  if (!minimum || !recommended) {
    errors.push('Both minimum and recommended requirements are required');
    return errors;
  }

  const fields = ['os', 'processor', 'memoryGB', 'graphics', 'storageGB'];

  for (const field of fields) {
    if (!minimum[field] || (typeof minimum[field] === 'string' && !minimum[field].trim())) {
      errors.push(`Minimum ${field} is required`);
    }
    if (!recommended[field] || (typeof recommended[field] === 'string' && !recommended[field].trim())) {
      errors.push(`Recommended ${field} is required`);
    }
  }

  if (minimum.memoryGB < 1 || minimum.storageGB < 1) {
    errors.push('Minimum memoryGB and storageGB must be positive numbers');
  }
  if (recommended.memoryGB < 1 || recommended.storageGB < 1) {
    errors.push('Recommended memoryGB and storageGB must be positive numbers');
  }

  return errors;
};

// Add Requirements
const addRequirements = async (req, res) => {
  try {
    const errors = validateRequirements(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors.join(', ') });
    }

    const { productId, minimum, recommended } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Prevent duplicate requirements
    const existingReq = await Requirement.findOne({ productId });
    if (existingReq) {
      return res.status(409).json({ message: 'Requirement already exists for this product' });
    }

    const requirementData = {
      productId,
      minimum: {
        os: minimum.os,
        processor: minimum.processor,
        memoryGB: Number(minimum.memoryGB),
        graphics: minimum.graphics,
        storageGB: Number(minimum.storageGB),
      },
      recommended: {
        os: recommended.os,
        processor: recommended.processor,
        memoryGB: Number(recommended.memoryGB),
        graphics: recommended.graphics,
        storageGB: Number(recommended.storageGB),
      },
    };

    await Requirement.create(requirementData);
    res.redirect('/admin/product-management');
  } catch (error) {
    console.error('Error adding requirements:', error);
    res.status(500).json({ message: 'Server error while adding requirements', error: error.message });
  }
};

// Edit Requirements
const editRequirements = async (req, res) => {
  try {
    const errors = validateRequirements(req.body, 'edit');
    if (errors.length) {
      return res.status(400).json({ message: errors.join(', ') });
    }

    const { productId, minimum, recommended } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const requirement = await Requirement.findOne({ productId });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found for this product' });
    }

    requirement.minimum = {
      os: minimum.os,
      processor: minimum.processor,
      memoryGB: Number(minimum.memoryGB),
      graphics: minimum.graphics,
      storageGB: Number(minimum.storageGB),
    };

    requirement.recommended = {
      os: recommended.os,
      processor: recommended.processor,
      memoryGB: Number(recommended.memoryGB),
      graphics: recommended.graphics,
      storageGB: Number(recommended.storageGB),
    };

    await requirement.save();
    res.redirect('/admin/product-management');
  } catch (error) {
    console.error('Error editing requirements:', error);
    res.status(500).json({ message: 'Server error while editing requirements', error: error.message });
  }
};

module.exports = {
  addRequirements,
  editRequirements,
};
