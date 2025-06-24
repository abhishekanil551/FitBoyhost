const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const User = require("../../models/userDb");
const env = require("dotenv").config();
const session = require("express-session");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account for reset password",
      text: `Your OTP is ${otp}`,
      html: `<h>Your OTP: ${otp}</h>`,
    });

    console.log('Email sent for reset password:', otp);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!/^\d{6}$/.test(otp)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP format" });
    }
    if (otp === req.session.userOtp) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "OTP is not matching" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      console.log("Resent OTP:", otp);
      return res
        .status(200)
        .json({ success: true, message: "OTP resent successfully" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP" });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resend OTP" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Received Email:", email);
    const findUser = await User.findOne({ email: email });

    if (findUser) {
      const otp = generateOtp();
      const emailSend = await sendVerificationEmail(email, otp);
      console.log("Generated OTP:", otp);
      if (emailSend) {
        req.session.userOtp = otp;
        req.session.email = email;
        res
          .status(200)
          .json({ success: true, message: "OTP sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send OTP" });
      }
    } else {
      res.status(404).json({ success: false, message: "Email does not exist" });
    }
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Ensure all fields are provided
    if (!email || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    // Validate password length
    if (password.length < 8) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password should be at least 8 characters",
        });
    }

    // Validate password is a string and not empty
    if (typeof password !== 'string' || password.trim() === '') {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Clear session data
    req.session.userOtp = null;
    req.session.email = null;

    return res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





module.exports = {
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,

};