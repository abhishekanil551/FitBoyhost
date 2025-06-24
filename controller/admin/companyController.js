const Company = require("../../models/companyDb");
const Product = require("../../models/productDb");
const multer = require("multer");
const cloudinary = require("../../config/cloudinary");

const companypage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const companyData = await Company.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalCompany = await Company.countDocuments();
    const totalPages = Math.ceil(totalCompany / limit);
    const reverseCompany = companyData.reverse();

    res.render("company-management", {
      companyData,
      currentPage: page,
      totalPages: totalPages,
      totalCompany: totalCompany,
    });
  } catch (error) {
    res.redirect("/admin/pageError");
    console.log("company page not load", error);
  }
};



const addCompany = async (req, res) => {
  try {
    const { name, description, email, logoUrl } = req.body;
    console.log("Received body:", req.body);

    // Validate input data
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name and email are required",
      });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ companyName: name.trim() });
    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "A company with this name already exists",
      });
    }

    // Create company object
    const companyData = {
      companyName: name,
      email,
      companyDescription: description?.trim(),
      companyLogo: logoUrl,
    };

    // Create and save new company
    const newCompany = new Company(companyData);
    await newCompany.save();

    return res.status(201).json({
      success: true,
      message: "Company added successfully",
      company: {
        id: newCompany._id,
        name: newCompany.companyName,
      },
    });
  } catch (error) {
    console.error("Company add failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add company",
    });
  }
};




const editCompany = async (req, res) => {
  try {
    const { name, description, email, logoUrl } = req.body;
    console.log("Edit Company Received body:", req.body);
    const { id } = req.params;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name and email are required",
      });
    }

    // Find company by ID first
    const existingCompany = await Company.findById(id);

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if another company with the same name exists (excluding current company)
    const duplicateCompany = await Company.findOne({ 
      companyName: name.trim(),
      _id: { $ne: id } 
    });

    if (duplicateCompany) {
      return res.status(409).json({
        success: false,
        message: "Another company with this name already exists",
      });
    }

    // Update the company
    await Company.findByIdAndUpdate(id, {
      companyName: name,
      email: email,
      companyDescription: description?.trim(),
      companyLogo: logoUrl,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Company updated successfully"
    });
  } catch (error) {
    console.error("Company edit failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to edit company: " + error.message,
    });
  }
};







const blockCompany = async (req, res) => {
  try {
    const id = req.query.id;
    await Company.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/company-management");
  } catch (error) {
    res.redirect("/admin/pageError");
    console.log("company block failed", error.message || error);
  }
};

const unblockCompany = async (req, res) => {
  try {
    const id = req.query.id;
    await Company.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/company-management");
  } catch (error) {
    res.redirect("/admin/pageError");
    console.log("company unblock failed", error.message || error);
  }
};

const deleteCompany = async (req, res) => {
  try {
    const id = req.query.id;
    const companyData = await Company.findById(id);
    const productData = await Product.find({ company: companyData._id });
    if (productData.length > 0) {
      await Product.deleteMany({ company: companyData._id });
    }
    await Company.deleteOne({ _id: id });
    res.redirect("/admin/company-management");
  } catch (error) {
    res.redirect("/admin/pageError");
    console.log("company delete failed", error.message || error);
  }
};

module.exports = {
  companypage,
  addCompany,
  blockCompany,
  unblockCompany,
  deleteCompany,
  editCompany,
};
