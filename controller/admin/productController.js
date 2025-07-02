const Product = require('../../models/productDb');
const Category = require('../../models/categoryDb');
const Company = require('../../models/companyDb');
const Requirement = require('../../models/GameRequirementDb');
const mongoose=require('mongoose')

const productpage = async (req, res) => {
  try {
    const search = req.query.search || '';
    const selectedCategory = req.query.category || '';
    const selectedCompany = req.query.company || '';
    const page = Number.parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (selectedCategory) {
      query.categoryId = selectedCategory;  
    }
    if (selectedCompany) {
      query.company = selectedCompany;
    }

    // Fetch products
    const products = await Product.find(query)
      .populate('categoryId')
      .populate('company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch requirements for all products in the current page
    const productIds = products.map(product => product._id);
    const requirements = await Requirement.find({ productId: { $in: productIds } }).lean();
    
    // Map requirements to products
    const productsWithRequirements = products.map(product => {
      const requirement = requirements.find(req => req.productId.toString() === product._id.toString());
      return {
        ...product.toObject(),
        hasRequirement: !!requirement,
        requirementId: requirement ? requirement._id : null,
        requirement: requirement || null 
      };
    });

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const category = await Category.find({ isListed: true });
    const company = await Company.find({ isBlocked: false });

    res.render('product-management', {
      
      products: productsWithRequirements,
      category,
      company,
      search,
      selectedCategory,
      selectedCompany,
      currentPage: page,
      totalPages,
      admin: req.session.admin,
    });
  } catch (error) {
    console.error('Error loading product page:', error);
    res.redirect('/admin/pageError');
  }
};





const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const company = await Company.find({ isBlocked: false });

    res.render('add-product', {
      category,
      company,
      admin: req.session.admin,
    });
  } catch (error) {
    console.error('Error loading add product page:', error);
    res.redirect('/admin/pageError');
  }
};








const addProduct = async (req, res) => {
  try {
    console.log('Request body:', req.body);

    // Validate input
    const { errors, isValid } = validateProductInput(req.body);

    function validateProductInput(body) {
      const { name, regularPrice, salesPrice, categoryId, description, poster,gameFile } = body;

      if (!name || !regularPrice || !salesPrice || !categoryId || !description || !poster) {
        return { errors: { message: 'All required fields must be filled.' }, isValid: false };
      }

      if (isNaN(regularPrice) || Number(regularPrice) < 0) {
        return { errors: { message: 'Regular price must be a valid number.' }, isValid: false };
      }

      if (isNaN(salesPrice) || Number(salesPrice) < 0) {
        return { errors: { message: 'Sales price must be a valid number.' }, isValid: false };
      }

      if (Number(salesPrice) > Number(regularPrice)) {
        return { errors: { message: 'Sales price cannot be higher than regular price.' }, isValid: false };
      }

      const categories = Array.isArray(categoryId) ? categoryId : [categoryId];
      if (categories.length === 0) {
        return { errors: { message: 'At least one category is required.' }, isValid: false };
      }

      // Validate poster URL
      if (!poster.match(/^https:\/\/res\.cloudinary\.com\/.*\/image\/upload\/.*$/)) {
        return { errors: { message: 'Invalid poster URL.' }, isValid: false };
      }

      // Validate banner URLs
      if (body.banners && Array.isArray(body.banners)) {
        for (const url of body.banners) {
          if (!url.match(/^https:\/\/res\.cloudinary\.com\/.*\/image\/upload\/.*$/)) {
            return { errors: { message: 'Invalid banner URL.' }, isValid: false };
          }
        }
      }

      return { errors: {}, isValid: true };
    }

    if (!isValid) {
      console.log('Validation errors:', errors);
      return res.status(400).json({ success: false, errors });
    }

    // Find company
    const company = await Company.findById(req.body.company);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Handle categoryId as string or array
    const categoryId = Array.isArray(req.body.categoryId) ? req.body.categoryId : [req.body.categoryId];
    const categories = await Category.find({ _id: { $in: categoryId } });
    if (categories.length !== categoryId.length) {
      return res.status(404).json({ success: false, message: 'One or more categories not found' });
    }


    const newProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      systemRequirements: req.body.systemRequirements,
      trailer: req.body.trailer || null,
      poster: req.body.poster,
      banners: req.body.banners || [],
      company: req.body.company,
      categoryId: categoryId,
      regularPrice: req.body.regularPrice,
      salesPrice: req.body.salesPrice,
      gameFile:req.body.gameFile
    });

    const savedProduct = await newProduct.save();

    // Update company's products array
    company.products = company.products || [];
    company.products.push(savedProduct._id);
    await company.save();

    // Update categories' products array
    await Category.updateMany(
      { _id: { $in: categoryId } },
      { $push: { products: savedProduct._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: savedProduct,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the product',
      error: error.message,
    });
  }
};




const listProducts=async(req,res)=>{
  try {
    const {id}=req.query;
    if(!id){
      return res.redirect('/admin/product-management')
    }
    const product=await Product.findById(id)
    if(!product){
      return res.redirect('/pageError')
    }
    product.isListed=!product.isListed;
    await product.save()
    return res.redirect('/admin/product-management')
  } catch (error) {
    console.log(error)
    return res.status(500).send('server error')
  }
}







const toggleRecommended = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.redirect('/admin/pageError');
    }

    product.isRecommended = !product.isRecommended;
    await product.save();

    res.redirect('/admin/product-management');
  } catch (err) {
    console.error('Toggle Recommended Error:', err);
    res.redirect('/admin/pageError');
  }
};






const FreeProduct = async (req, res) => {
  try {
    const { id } = req.query;
    const product = await Product.findById(id);

    if (!product) return res.status(404).send('Product not found');

    const newFreeStatus = !product.isFree;
    product.isFree = newFreeStatus;

    if (newFreeStatus) {
      product.salesPrice = 0;
      product.regularPrice=0;
    }

    await product.save();
    res.redirect('/admin/product-management');
  } catch (err) {
    console.error('Error toggling free status:', err);
    res.redirect('/admin/pageError');
  }
};










const editProductPage = async (req, res) => {
  try {
    const productId = req.query.id;
    
    const [product, allCompanies, allCategories] = await Promise.all([
      Product.findById(productId)
        .populate('company', 'companyName')
        .populate('categoryId', 'name'),
      Company.find({}, 'companyName'), 
      Category.find({}, 'name')       
    ]);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.render('edit-product', {
      product,
      companies: allCompanies,
      categories: allCategories,
      page: 'product-management'
    });
  } catch (error) {
    console.error('Error rendering edit product page:', error);
    res.status(500).send('Server error');
  }
};





const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      description,
      systemRequirements,
      trailer,
      posterUrl,
      banners, // Correctly destructure banners
      company,
      categoryId,
      regularPrice,
      salesPrice,
      gameFile
    } = req.body;

    console.log('Received data:', req.body);
    console.log('Product ID:', productId);

    // Validate input data
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!description) missingFields.push('description');
    if (!systemRequirements) missingFields.push('systemRequirements');
    if (!posterUrl) missingFields.push('posterUrl');
    if (!company) missingFields.push('company');
    if (!categoryId || (Array.isArray(categoryId) && categoryId.length === 0)) missingFields.push('categoryId');
    if (!regularPrice && regularPrice !== 0) missingFields.push('regularPrice');
    if (!salesPrice && salesPrice !== 0) missingFields.push('salesPrice');

    if (missingFields.length > 0) {
      console.log('Validation failed: Missing fields:', missingFields);
      return res.status(400).json({ error: `All required fields must be filled: ${missingFields.join(', ')}` });
    }

    // Validate ObjectIDs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log('Invalid product ID:', productId);
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(company)) {
      console.log('Invalid company ID:', company);
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    const categoriesArray = Array.isArray(categoryId) ? categoryId : [categoryId];
    if (!categoriesArray.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      console.log('Invalid category ID(s):', categoriesArray);
      return res.status(400).json({ error: 'Invalid category ID(s)' });
    }

    // Validate trailer URL if provided
    if (trailer && !trailer.match(/^(http|https):\/\//)) {
      console.log('Invalid trailer URL:', trailer);
      return res.status(400).json({ error: 'Trailer URL must start with http:// or https://' });
    }

    // Validate banners
    let validatedBanners = [];
    if (banners) {
      if (!Array.isArray(banners)) {
        console.log('Invalid banners format:', banners);
        return res.status(400).json({ error: 'banners must be an array of URLs' });
      }
      // Validate each URL
      const invalidUrls = banners.filter((url) => typeof url !== 'string' || !url.match(/^(http|https):\/\//));
      if (invalidUrls.length > 0) {
        console.log('Invalid banner URLs:', invalidUrls);
        return res.status(400).json({ error: 'All banner URLs must start with http:// or https://' });
      }
      validatedBanners = banners;
    }
    console.log('Validated banners:', validatedBanners); // Debug log

    // Prepare update data
    const updateData = {
      name,
      description,
      systemRequirements,
      trailer: trailer || null,
      poster: posterUrl,
      banners: validatedBanners, // Use validated banners
      company,
      categoryId: categoriesArray,
      regularPrice: parseFloat(regularPrice),
      salesPrice: parseFloat(salesPrice),
      gameFile:gameFile,
      updatedAt: Date.now(),
    };

    console.log('Update details:', updateData); // Should show banners array

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData }, // Use $set to ensure all fields are updated
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('company', 'companyName')
      .populate('categoryId', 'name');

    if (!updatedProduct) {
      console.log('Product not found:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('Updated product banners:', updatedProduct.banners); // Debug log

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error.message, error.stack);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Product name must be unique' });
    }
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};








module.exports = {
  productpage,
  addProductPage,
  addProduct,
  listProducts,
  editProductPage,
  editProduct,
  toggleRecommended,
  FreeProduct,
  
};