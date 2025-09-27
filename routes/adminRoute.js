const express = require("express");
const route = express.Router();
const category = require("../models/categoryDb");
const fs = require("fs");
const path = require("path");

const adminCtrl = require("../controller/admin/adminCtrl");
const { userAuth, adminAuth } = require("../middlewares/auth");
const customerController = require("../controller/admin/customerController");
const categoryController = require("../controller/admin/categoryController");
const companyController = require("../controller/admin/companyController");
const productController = require("../controller/admin/productController");
const orderController = require("../controller/admin/orderController");
const gameRequirement = require("../controller/admin/gameRequirementCtrl");
const offerController = require("../controller/admin/offerController");
const couponController = require("../controller/admin/couponController");
const salesReportController = require("../controller/admin/salesReportController");
const userIssuesController = require("../controller/admin/user-IssuesCtrl");
const pointsManagement = require("../controller/admin/pointsController");
const missionController = require("../controller/admin/missonController");
const vouchersController=require('../controller/admin/vouchersController');
const spinPrizeController=require('../controller/admin/spinPrizesController');

// login management
route.get("/pageError", adminCtrl.pageError);
route.get("/login", adminCtrl.loadLogin);
route.post("/login", adminCtrl.login);
route.get("/dashboard", adminCtrl.loadDashboard);
route.get("/logout", adminCtrl.logoutAdmin);

// customer management
route.get("/customer-management", adminAuth, customerController.customerInfo);
route.get("/block-customer", adminAuth, customerController.customerBlocked);
route.get("/unblock-customer", adminAuth, customerController.customerUnblocked);

// category management
route.get("/category-management", adminAuth, categoryController.categoryInfo);
route.post("/add-category", adminAuth, categoryController.addCategory);
route.put("/edit-category/:id", adminAuth, categoryController.editCategory);
route.get("/list-category", adminAuth, categoryController.listCategory);
route.get("/unlist-category", adminAuth, categoryController.unlistCategory);

// company controller
route.get("/company-management", adminAuth, companyController.companypage);
route.post("/addCompany", adminAuth, companyController.addCompany);
route.put("/editCompany/:id", adminAuth, companyController.editCompany);
route.get("/block-company", adminAuth, companyController.blockCompany);
route.get("/unblock-company", adminAuth, companyController.unblockCompany);
route.get("/delete-company", adminAuth, companyController.deleteCompany);

// product management
route.get("/product-management", adminAuth, productController.productpage);
route.get("/addproduct", adminAuth, productController.addProductPage);
route.post("/addProduct/add", adminAuth, productController.addProduct);
route.get("/list-products", adminAuth, productController.listProducts);
route.get("/editproductpage", adminAuth, productController.editProductPage);
route.put("/edit-product/:id", adminAuth, productController.editProduct);
route.get("/toggle-recommended", adminAuth, productController.toggleRecommended);
route.get("/free-product", adminAuth, productController.FreeProduct);

// game requirements
route.post("/add-requirement", adminAuth, gameRequirement.addRequirements);
route.post("/edit-requirement", adminAuth, gameRequirement.editRequirements);

// order Management
route.get("/order-Management", adminAuth, orderController.orderManagement);

// Offer Management
route.get("/offer-management", adminAuth, offerController.offerManagement);
route.post("/add-offer", adminAuth, offerController.addOffer);
route.post("/edit-offer", adminAuth, offerController.editOffer);
route.post("/delete-offer", adminAuth, offerController.deleteOffer);

// coupon Management
route.get("/coupon-management", adminAuth, couponController.couponManagement);
route.post("/add-coupon", adminAuth, couponController.addCoupon);
route.post("/edit-coupon", adminAuth, couponController.editCoupon);
route.post("/delete-coupon", adminAuth, couponController.DeleteCoupon);

// sales report
route.get("/sales-report", adminAuth, async (req, res) => {
  try {
    const initialData = {
      ba: {
        totalSales: "0.00",
        totalOrders: 0,
        averageOrder: "0.00",
        totalDiscount: "0.00",
        productDiscounts: "0.00",
        categoryDiscounts: "0.00",
        couponDiscounts: "0.00",
        reportPeriod: "Loading...",
      },
    };
    res.render("sales-report", {
      initialData,
    });
  } catch (error) {
    console.error("Error rendering sales report page:", error);
    res.status(500).send("error", { error: "Server Error" });
  }
});
route.get("/api/sales-report", salesReportController.getSalesReport);
route.get("/api/sales-report/download/excel", salesReportController.downloadExcelReport);

// user-Issues
route.get("/issue-management", adminAuth, userIssuesController.getUserIssues);
route.post("/fixIssues/:issueId", adminAuth, userIssuesController.solution);
route.post("/refund/:issueId", adminAuth, userIssuesController.refund);

// pointsManagement
route.get("/points-management", adminAuth, pointsManagement.pointsManagement);
route.get("/products", adminAuth, pointsManagement.getAvailableProducts);
route.post("/points-management/add", adminAuth, pointsManagement.addToPointsShop);
route.delete("/points-management/:id",adminAuth, pointsManagement.deleteFromPointsShop);

// Mission Management
route.get("/missions-management", adminAuth, missionController.mission);
route.post('/add-mission', adminAuth, missionController.addMission);
route.post('/edit-mission', adminAuth, missionController.editMission);
route.post('/delete-mission', adminAuth, missionController.deleteMission);
route.post('/toggle-mission-status', adminAuth, missionController.missionStatus);

// vouchers Management
route.get('/voucher-management',adminAuth,vouchersController.vouchers);
route.post('/add-voucher', adminAuth,vouchersController.addVoucher);
route.post('/edit-voucher', adminAuth,vouchersController.editVoucher);
route.post('/delete-voucher', adminAuth,vouchersController.deleteVoucher);
route.post('/toggle-voucher-status',adminAuth,vouchersController.statusvoucher);


// spin Prize Management 
route.get('/spinPrize-management',adminAuth, spinPrizeController.renderSpinPrizePage);
route.post('/add-spinPrize',adminAuth, spinPrizeController.addSpinPrize);
route.post('/edit-spinPrize',adminAuth, spinPrizeController.editSpinPrize);
route.post('/delete-spinPrize',adminAuth, spinPrizeController.deleteSpinPrize);
route.post('/toggle-status-spinPrize',adminAuth, spinPrizeController.toggleSpinPrizeStatus);



module.exports = route;
