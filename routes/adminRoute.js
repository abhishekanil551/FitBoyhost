const express = require('express');
const route = express.Router();
const category = require('../models/categoryDb');
const fs = require('fs');
const path = require('path');

const adminCtrl = require('../controller/admin/adminCtrl');
const { userAuth, adminAuth } = require('../middlewares/auth');
const customerController = require('../controller/admin/customerController');
const categoryController = require('../controller/admin/categoryController');
const companyController = require('../controller/admin/companyController');
const productController = require('../controller/admin/productController');
const orderController = require('../controller/admin/orderController');
const gameRequirement=require('../controller/admin/gameRequirementCtrl');
const offerController=require('../controller/admin/offerController');
const couponController=require('../controller/admin/couponController');
const salesReportController=require('../controller/admin/salesReportController');



// login management
route.get('/pageError', adminCtrl.pageError);
route.get('/login', adminCtrl.loadLogin);
route.post('/login', adminCtrl.login);
route.get('/dashboard',adminCtrl.loadDashboard);
route.get('/logout', adminCtrl.logoutAdmin);



// customer management
route.get('/customer-management', adminAuth, customerController.customerInfo);
route.get('/block-customer', adminAuth, customerController.customerBlocked);
route.get('/unblock-customer', adminAuth, customerController.customerUnblocked);



// category management
route.get('/category-management', adminAuth, categoryController.categoryInfo);
route.post('/add-category', adminAuth, categoryController.addCategory);
route.put('/edit-category/:id', adminAuth, categoryController.editCategory);
route.get('/list-category', adminAuth, categoryController.listCategory);
route.get('/unlist-category', adminAuth, categoryController.unlistCategory);




// company controller
route.get('/company-management', adminAuth, companyController.companypage);
route.post('/addCompany', adminAuth, companyController.addCompany);
route.put('/editCompany/:id',adminAuth,companyController.editCompany)
route.get('/block-company', adminAuth, companyController.blockCompany);
route.get('/unblock-company', adminAuth, companyController.unblockCompany);
route.get('/delete-company', adminAuth, companyController.deleteCompany);




// product management
route.get('/product-management',adminAuth, productController.productpage);
route.get("/addproduct", adminAuth, productController.addProductPage)
route.post('/addProduct/add',adminAuth,productController.addProduct)
route.get('/list-products', adminAuth, productController.listProducts);
route.get('/editproductpage',adminAuth,productController.editProductPage);
route.put('/edit-product/:id',adminAuth,productController.editProduct);
route.get('/toggle-recommended',adminAuth,productController.toggleRecommended);
route.get('/free-product',adminAuth, productController.FreeProduct);
route.post('/gameFile',adminAuth,productController.uploadGameFile)


// game requirements
route.post('/add-requirement',adminAuth,gameRequirement.addRequirements);
route.post('/edit-requirement', adminAuth, gameRequirement.editRequirements);


// order Management
route.get('/order-Management',adminAuth,orderController.orderManagement);


// Offer Management
route.get('/offer-management', adminAuth, offerController.offerManagement);
route.post('/add-offer', adminAuth, offerController.addOffer);
route.post('/edit-offer', adminAuth, offerController.editOffer);
route.post('/delete-offer', adminAuth, offerController.deleteOffer); 


// coupon Management
route.get('/coupon-management',adminAuth,couponController.couponManagement)
route.post('/add-coupon',adminAuth, couponController.addCoupon);
route.post('/edit-coupon',adminAuth, couponController.editCoupon);
route.post('/delete-coupon', couponController.DeleteCoupon);


// sales report 
route.get('/sales-report', async (req, res) => {
  try {
    const initialData = {
      ba: {
        totalSales: '0.00',
        totalOrders: 0,
        averageOrder: '0.00',
        totalDiscount: '0.00',
        productDiscounts: '0.00',
        categoryDiscounts: '0.00',
        couponDiscounts: '0.00',
        reportPeriod: 'Loading...',
      },
    };
    res.render('sales-report', {
 initialData});
  } catch (error) {
    console.error('Error rendering sales report page:', error);
    res.status(500).send('error', { error: 'Server Error' });
  }
});
route.get('/api/sales-report', salesReportController.getSalesReport);
route.get('/api/sales-report/download/excel', salesReportController.downloadExcelReport);


module.exports = route;

