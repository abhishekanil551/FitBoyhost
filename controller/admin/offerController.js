const mongoose = require('mongoose');
const Offer = require('../../models/offerDb');
const Category = require('../../models/categoryDb');
const Product = require('../../models/productDb');

const offerManagement = async (req, res) => {
  try {
    const offers = await Offer.find().populate('products categoryId').lean();
    const categories = await Category.find().lean();
    const products = await Product.find().lean();

    res.render('offer-management', {
      offers,
      categories,
      products,
      errors: {},
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    console.error('Offer Management Load Error:', error);
    res.render('offer-management', {
      offers: [],
      categories: [],
      products: [],
      errors: {},
      successMessage: null,
      errorMessage: 'Failed to load offers.'
    });
  }
};

const addOffer = async (req, res) => {
  try {
    const {
      title,
      type,
      discountPercentage,
      products,
      categoryId,
      banner,
      duration,
      description
    } = req.body;

    if (!title || !discountPercentage || !duration?.start || !duration?.end) {
      throw new Error('Required fields are missing.');
    }

    if (type === 'product' && (!products || products.length === 0)) {
      throw new Error('At least one product is required for product offers.');
    }

    if (type === 'category' && (!categoryId || categoryId.length === 0)) {
      throw new Error('At least one category is required for category offers.');
    }

    // Convert string IDs to ObjectIds
    const productIds = type === 'product' && products
      ? (Array.isArray(products) ? products : [products]).map(id => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid product ID: ${id}`);
          }
          return new mongoose.Types.ObjectId(id);
        })
      : [];

    const categoryIds = type === 'category' && categoryId
      ? (Array.isArray(categoryId) ? categoryId : [categoryId]).map(id => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid category ID: ${id}`);
          }
          return new mongoose.Types.ObjectId(id);
        })
      : [];

    const newOffer = new Offer({
      title,
      type,
      discountPercentage,
      products: productIds,
      categoryId: categoryIds,
      banner,
      duration: {
        start: new Date(duration.start),
        end: new Date(duration.end)
      },
      description,
      isListed: true
    });

    const savedOffer = await newOffer.save();

    if (type === 'product') {
      for (const productId of productIds) {
        const product = await Product.findById(productId).populate('categoryId');
        if (product) {
          const categoryData = product.categoryId && product.categoryId.length > 0
            ? await Category.findById(product.categoryId[0])
            : null;
          const categoryOfferDiscount = categoryData?.offer
            ? (await Offer.findById(categoryData.offer))?.discountPercentage || 0
            : 0;

          const bestDiscount = Math.max(discountPercentage, categoryOfferDiscount);
          product.salesPrice = Math.floor(product.regularPrice * (1 - bestDiscount / 100));
          product.offer = savedOffer._id;
          await product.save();
        }
      }
    }

    if (type === 'category') {
      for (const catId of categoryIds) {
        await Category.findByIdAndUpdate(catId, { offer: savedOffer._id });
      }

      const categoryProducts = await Product.find({ categoryId: { $in: categoryIds } });
      for (const product of categoryProducts) {
        const productOfferDiscount = product.offer
          ? (await Offer.findById(product.offer))?.discountPercentage || 0
          : 0;

        const bestDiscount = Math.max(discountPercentage, productOfferDiscount);
        product.salesPrice = Math.floor(product.regularPrice * (1 - bestDiscount / 100));
        product.offer = savedOffer._id;
        await product.save();
      }
    }

    res.redirect('/admin/offer-management?success=Offer added successfully');
  } catch (err) {
    console.error('Add Offer Error:', err);
    res.redirect('/admin/offer-management?error=' + encodeURIComponent(err.message));
  }
};

const editOffer = async (req, res) => {
  try {
    const {
      id,
      title,
      type,
      discountPercentage,
      products,
      categoryId,
      banner,
      duration,
      description
    } = req.body;

    if (!title || !discountPercentage || !duration?.start || !duration?.end) {
      throw new Error('Required fields are missing.');
    }

    if (type === 'product' && (!products || products.length === 0)) {
      throw new Error('At least one product is required for product offers.');
    }

    if (type === 'category' && (!categoryId || categoryId.length === 0)) {
      throw new Error('At least one category is required for category offers.');
    }

    // Convert string IDs to ObjectIds
    const productIds = type === 'product' && products
      ? (Array.isArray(products) ? products : [products]).map(id => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid product ID: ${id}`);
          }
          return new mongoose.Types.ObjectId(id);
        })
      : [];

    const categoryIds = type === 'category' && categoryId
      ? (Array.isArray(categoryId) ? categoryId : [categoryId]).map(id => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid category ID: ${id}`);
          }
          return new mongoose.Types.ObjectId(id);
        })
      : [];

    // Reset previous category offer references
    const existingOffer = await Offer.findById(id);
    if (existingOffer.type === 'category' && existingOffer.categoryId.length > 0) {
      for (const catId of existingOffer.categoryId) {
        await Category.findByIdAndUpdate(catId, { offer: null });
      }
    }

    const updatedOffer = await Offer.findByIdAndUpdate(id, {
      title,
      type,
      discountPercentage,
      products: productIds,
      categoryId: categoryIds,
      banner,
      duration: {
        start: new Date(duration.start),
        end: new Date(duration.end)
      },
      description
    }, { new: true });

    // Reset all products that had this offer
    const previouslyAffectedProducts = await Product.find({ offer: updatedOffer._id });
    for (const product of previouslyAffectedProducts) {
      product.salesPrice = product.regularPrice;
      product.offer = null;
      await product.save();
    }

    if (type === 'product') {
      for (const productId of productIds) {
        const product = await Product.findById(productId).populate('categoryId');
        if (product) {
          const categoryData = product.categoryId && product.categoryId.length > 0
            ? await Category.findById(product.categoryId[0])
            : null;
          const categoryOfferDiscount = categoryData?.offer
            ? (await Offer.findById(categoryData.offer))?.discountPercentage || 0
            : 0;

          const bestDiscount = Math.max(discountPercentage, categoryOfferDiscount);
          product.salesPrice = Math.floor(product.regularPrice * (1 - bestDiscount / 100));
          product.offer = updatedOffer._id;
          await product.save();
        }
      }
    }

    if (type === 'category') {
      for (const catId of categoryIds) {
        await Category.findByIdAndUpdate(catId, { offer: updatedOffer._id });
      }

      const categoryProducts = await Product.find({ categoryId: { $in: categoryIds } });
      for (const product of categoryProducts) {
        const productOfferDiscount = product.offer
          ? (await Offer.findById(product.offer))?.discountPercentage || 0
          : 0;

        const bestDiscount = Math.max(discountPercentage, productOfferDiscount);
        product.salesPrice = Math.floor(product.regularPrice * (1 - bestDiscount / 100));
        product.offer = updatedOffer._id;
        await product.save();
      }
    }

    res.redirect('/admin/offer-management?success=Offer updated successfully');
  } catch (err) {
    console.error('Edit Offer Error:', err);
    res.redirect('/admin/offer-management?error=' + encodeURIComponent(err.message));
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.body.id;

    if (!offerId) {
      throw new Error('Offer ID is required to delete.');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found.');
    }

    if (offer.type === 'product') {
      const affectedProducts = await Product.find({ offer: offerId });
      for (const product of affectedProducts) {
        product.salesPrice = product.regularPrice;
        product.offer = null;
        await product.save();
      }
    }

    if (offer.type === 'category' && offer.categoryId.length > 0) {
      for (const catId of offer.categoryId) {
        await Category.findByIdAndUpdate(catId, { offer: null });
      }

      const categoryProducts = await Product.find({ categoryId: { $in: offer.categoryId } });
      for (const product of categoryProducts) {
        if (String(product.offer) === String(offerId)) {
          product.salesPrice = product.regularPrice;
          product.offer = null;
          await product.save();
        }
      }
    }

    await Offer.findByIdAndDelete(offerId);

    res.redirect('/admin/offer-management?success=Offer deleted successfully');
  } catch (err) {
    console.error('Delete Offer Error:', err);
    res.redirect('/admin/offer-management?error=' + encodeURIComponent(err.message));
  }
};

module.exports = {
  offerManagement,
  addOffer,
  editOffer,
  deleteOffer,
};
