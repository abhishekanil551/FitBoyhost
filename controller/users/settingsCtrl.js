const User = require("../../models/userDb");
const Product = require("../../models/productDb");
const Order = require("../../models/orderDb");
const OrderItem = require("../../models/OrderItemDB");
const nodemailer = require("nodemailer");
require("dotenv").config();
const WalletTransaction = require("../../models/walletDb");
const crypto = require("crypto");
const StatusCodes=require('../../statusCodes');



const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  const html = `
    <h2>Email Verification</h2>
    <p>Your OTP is: <strong>${otp}</strong></p>
    <p>This OTP will expire in 10 minutes.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"FitBoy Games" <${process.env.NODEMAILER_EMAIL}>`,
      to: toEmail,
      subject: "Verify your email address",
      html,
    });

    console.log("OTP email sent to:", toEmail);
  } catch (err) {
    console.error("Error sending OTP email:", err.message);
    throw err;
  }
};

const settingsPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }


    const userData = await User.findById(userId).lean();
    if (!userData) {
      return res.redirect("/pageNotFound");
    }


    res.render("ProfileSettings", {
      user: userData,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
    });
  } catch (error) {
    console.error("Error loading settings page:", error);
    res.redirect("/pageNotFound");
  }
};

const addressPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId).lean();
    if (!userData) {
      return res.redirect("/pageNotFound");
    }


    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    const totalAddresses = userData.addresses.length;
    const totalPages = Math.ceil(totalAddresses / limit);
    const paginatedAddresses = userData.addresses.slice(skip, skip + limit);

    // Edit address modal setup
    const editAddressId = req.query.editAddressId;
    let editModalData = null;
    if (editAddressId) {
      editModalData = userData.addresses.find(
        (addr) => addr._id.toString() === editAddressId
      );
    }

    res.render("AddressBook", {
      user: userData,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
      editModalData,
      addresses: paginatedAddresses,
      currentPage: page,
      totalPages,
      queryString: "", 
    });
  } catch (error) {
    console.error("Error loading settings page:", error);
    res.redirect("/pageNotFound");
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const newAddress = {
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country,
      isDefault: req.body.isDefault === "on" || false,
    };

    console.log("Adding address:", newAddress); // Debug

    const user = await User.findById(userId);

    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(StatusCodes.OK).json({ message: "Address added successfully" });
  } catch (err) {
    console.error("Error adding address:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to add address" });
  }
};

const editAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.body.addressId;
    const updatedData = {
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country,
      isDefault:
        req.body.isDefault === true || req.body.isDefault === "on" || false,
    };

    console.log("Received addressId:", addressId); // Debug
    console.log("Updated data:", updatedData); // Debug

    // Validate required fields
    if (!updatedData.street || !updatedData.city) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Street and City are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
    }

    if (updatedData.isDefault) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) addr.isDefault = false;
      });
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      ...updatedData,
    };
    await user.save();

    console.log("Updated user addresses:", user.addresses); // Debug

    res.status(StatusCodes.OK).json({ message: "Address updated successfully" });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    console.log("Deleting addressId:", addressId); // Debug

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    if (!user.addresses) {
      user.addresses = [];
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
    }


    if (user.addresses[addressIndex].isDefault && user.addresses.length === 1) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({
          message: "Cannot delete the only address, which is set as default.",
        });
    }


    user.addresses.splice(addressIndex, 1);


    if (
      user.addresses.length > 0 &&
      !user.addresses.some((addr) => addr.isDefault)
    ) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    console.log("Updated user addresses after deletion:", user.addresses); // Debug

    res.status(StatusCodes.OK).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to delete address" });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    console.log("Setting default addressId:", addressId); // Debug

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Address not found" });
    }


    user.addresses.forEach((addr) => (addr.isDefault = false));


    user.addresses[addressIndex].isDefault = true;

    await user.save();

    console.log(
      "Updated user addresses after setting default:",
      user.addresses
    ); 

    res.status(StatusCodes.OK).json({ message: "Default address updated successfully" });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to set default address" });
  }
};

const updateName = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Name is required" });
    }

    if (name.length < 2) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Name must be at least 2 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    user.name = name;
    await user.save();

    res.status(StatusCodes.OK).json({ message: "Name updated successfully" });
  } catch (error) {
    console.error("Error updating name:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to update name" });
  }
};

const requestEmailChange = async (req, res) => {
  const { newEmail } = req.body;
  console.log("new email:", newEmail);

  if (!newEmail || typeof newEmail !== "string" || !newEmail.includes("@")) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Valid email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log("OTP for email change:", otp);

  req.session.pendingEmailChange = {
    newEmail,
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  try {
    await sendOtpEmail(newEmail, otp);
    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Error in sendOtpEmail:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to send OTP email" });
  }
};

const confirmEmailChange = async (req, res) => {
  const { otp } = req.body;
  const sessionData = req.session.pendingEmailChange;

  if (!sessionData || Date.now() > sessionData.expiresAt) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "OTP expired or not requested." });
  }

  if (parseInt(otp) !== sessionData.otp) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid OTP." });
  }

  try {
    await User.findByIdAndUpdate(req.session.userId, {
      email: sessionData.newEmail,
    });

    delete req.session.pendingEmailChange;
    res.json({ message: "Email updated successfully." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error updating email." });
  }
};

const OrdersDetailsPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId).lean();
    if (!userData) {
      return res.redirect("/pageNotFount");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5; 
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({ userId })
      .populate({
        path: "order_items",
        populate: {
          path: "productId",
          model: "Product",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();


    const query = { ...req.query };
    delete query.page;
    const queryString = new URLSearchParams(query).toString();

    res.render("userOrders", {
      orders,
      user: userData,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
      totalPages,
      currentPage: page,
      queryString,
    });
  } catch (error) {
    console.error("Error loading settings page:", error);
    res.redirect("/pageNotFount");
  }
};

const walletPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId).populate("wallet").lean();

    if (!userData) {
      return res.redirect("/pageNotFound");
    }

    // Fetch wallet transactions
    const transactions = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .lean();


    const walletBalance = transactions.reduce((sum, tx) => {
      return tx.type === "credit" ? sum + tx.amount : sum - tx.amount;
    }, 0);


    console.log("User ID:", userId);
    console.log("Transactions:", transactions);
    console.log("Calculated Balance:", walletBalance);


    res.render("wallet", {
      user: userData,
      walletBalance: walletBalance,
      transactions: transactions,
    });
  } catch (error) {
    console.error("Error loading wallet page:", error);
    res.redirect("/pageNotFound");
  }
};

const referAndEarn = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select("referalCode");
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).send("User not found");
    }
    const referralLink = `http://fitboy.xyz/?ref=${user.referalCode}`;

    res.render("referAndEarn", {
      referralLink,
      referalCode: user.referalCode,
    });
  } catch (error) {
    console.log("Error in referAndEarn:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Something went wrong");
  }
};

module.exports = {
  settingsPage,
  addressPage,
  addAddress,
  editAddress,
  deleteAddress,
  setDefaultAddress,
  updateName,
  requestEmailChange,
  confirmEmailChange,
  OrdersDetailsPage,
  walletPage,
  referAndEarn,
};
