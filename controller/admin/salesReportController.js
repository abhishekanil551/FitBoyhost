// controllers/salesReportController.js
const mongoose = require('mongoose');
const Order = require('../../models/orderDb');
const OrderItem = require('../../models/OrderItemDB');
const Product = require('../../models/productDb');
const Coupon = require('../../models/couponDb');
const Offer = require('../../models/offerDb');
const Category = require('../../models/categoryDb');
const ExcelJS = require('exceljs');

const getDateRange = (period, customFrom, customTo) => {
    const today = new Date();
    let fromDate, toDate;

    switch (period) {
        case 'today':
            fromDate = new Date(today.setHours(0, 0, 0, 0));
            toDate = new Date(today.setHours(23, 59, 59, 999));
            break;
        case 'yesterday':
            fromDate = new Date(today.setDate(today.getDate() - 1));
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(fromDate);
            toDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            fromDate = new Date(today.setDate(today.getDate() - today.getDay()));
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(today.setHours(23, 59, 59, 999));
            break;
        case 'month':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today.setHours(23, 59, 59, 999));
            break;
        case 'year':
            fromDate = new Date(today.getFullYear(), 0, 1);
            toDate = new Date(today.setHours(23, 59, 59, 999));
            break;
        case 'custom':
            fromDate = customFrom ? new Date(customFrom) : new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = customTo ? new Date(customTo) : new Date(today);
            toDate.setHours(23, 59, 59, 999);
            break;
        default:
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today);
    }

    return { fromDate, toDate };
};

const getSalesReport = async (req, res) => {
    try {
        const { period = 'month', fromDate, toDate, grouping = 'monthly' } = req.query;
        const { fromDate: startDate, toDate: endDate } = getDateRange(period, fromDate, toDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date range' });
        }

        const orders = await Order.find({
            orderDate: { $gte: startDate, $lte: endDate },
            status: 'paid',
        })
            .populate('userId', 'email')
            .populate('couponId')
            .populate({
                path: 'order_items',
                populate: { path: 'productId', select: 'name categoryId offer' },
            });

        let totalSales = 0;
        let totalOrders = orders.length;
        let totalCouponDiscount = 0;
        let totalOfferDiscount = 0;
        let totalCategoryDiscount = 0;
        let productSales = {};
        let categorySales = {};

        for (const order of orders) {
            totalSales += order.total || 0;
            totalCouponDiscount += order.couponDiscount || 0;

            for (const item of order.order_items) {
                const product = item.productId;
                if (!product) continue;
                const price = item.price || 0;

                productSales[product._id] = productSales[product._id] || {
                    name: product.name || 'Unknown Product',
                    units: 0,
                    revenue: 0,
                    discount: 0,
                };
                productSales[product._id].units += 1;
                productSales[product._id].revenue += price;

                for (const catId of product.categoryId || []) {
                    categorySales[catId] = categorySales[catId] || {
                        revenue: 0,
                        discount: 0,
                        units: 0,
                        name: '',
                    };
                    categorySales[catId].revenue += price;
                    categorySales[catId].units += 1;
                }

                if (product.offer) {
                    const offer = await Offer.findById(product.offer);
                    if (offer && offer.discountPercentage) {
                        const discount = (price * offer.discountPercentage) / 100;
                        productSales[product._id].discount += discount;
                        for (const catId of product.categoryId || []) {
                            categorySales[catId].discount += discount;
                        }
                        if (offer.type === 'product') {
                            totalOfferDiscount += discount;
                        } else if (offer.type === 'category') {
                            totalCategoryDiscount += discount;
                        }
                    }
                }
            }
        }

        const categoryIds = Object.keys(categorySales);
        let categories = [];
        try {
            categories = await Category.find({ _id: { $in: categoryIds } }).select('name');
        } catch (catError) {
            console.error('Category query error:', catError);
        }
        categories.forEach(cat => {
            if (categorySales[cat._id]) {
                categorySales[cat._id].name = cat.name;
            }
        });

        // Aggregation for chart data
        let groupBy, dateFormat;
        const timezone = 'Asia/Kolkata';
        switch (grouping) {
            case 'daily':
                groupBy = {
                    year: { $year: { date: '$orderDate', timezone } },
                    month: { $month: { date: '$orderDate', timezone } },
                    day: { $dayOfMonth: { date: '$orderDate', timezone } },
                };
                dateFormat = {
                    $dateToString: { format: '%Y-%m-%d', date: '$orderDate', timezone },
                };
                break;
            case 'weekly':
                groupBy = {
                    year: { $year: { date: '$orderDate', timezone } },
                    week: { $week: { date: '$orderDate', timezone } },
                };
                dateFormat = {
                    $concat: [
                        { $dateToString: { format: '%Y-Wk', date: '$orderDate', timezone } },
                        { $toString: { $week: { date: '$orderDate', timezone } } },
                    ],
                };
                break;
            case 'monthly':
            default:
                groupBy = {
                    year: { $year: { date: '$orderDate', timezone } },
                    month: { $month: { date: '$orderDate', timezone } },
                };
                dateFormat = {
                    $dateToString: { format: '%Y-%m', date: '$orderDate', timezone },
                };
                break;
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: startDate, $lte: endDate },
                    status: 'paid',
                },
            },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'order_items',
                    foreignField: '_id',
                    as: 'order_items',
                },
            },
            { $unwind: '$order_items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.productId',
                    foreignField: '_id',
                    as: 'order_items.product',
                },
            },
            { $unwind: '$order_items.product' },
            {
                $lookup: {
                    from: 'offers',
                    localField: 'order_items.product.offer',
                    foreignField: '_id',
                    as: 'order_items.offer',
                },
            },
            {
                $group: {
                    _id: groupBy,
                    date: { $first: dateFormat },
                    totalSales: { $sum: '$total' },
                    totalDiscount: { $sum: '$couponDiscount' },
                    orderCount: { $sum: 1 },
                    offerDiscount: {
                        $sum: {
                            $cond: {
                                if: { $gt: [{ $size: '$order_items.offer' }, 0] },
                                then: {
                                    $divide: [
                                        { $multiply: ['$order_items.price', { $arrayElemAt: ['$order_items.offer.discountPercentage', 0] }] },
                                        100,
                                    ],
                                },
                                else: 0,
                            },
                        },
                    },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
            {
                $project: {
                    _id: 0,
                    date: 1,
                    totalSales: 1,
                    totalDiscount: 1,
                    offerDiscount: 1,
                    orderCount: 1,
                },
            },
        ]);

        if (grouping === 'daily') {
            const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const todayStr = new Date(today).toISOString().split('T')[0];
            if (!salesData.some(item => item.date === todayStr)) {
                salesData.push({ date: todayStr, totalSales: 0, totalDiscount: 0, offerDiscount: 0, orderCount: 0 });
            }
        }

        const salesChartData = {
            labels: salesData.map(item => item.date),
            sales: salesData.map(item => item.totalSales.toFixed(2)),
            discounts: salesData.map(item => (item.totalDiscount + item.offerDiscount).toFixed(2)),
        };

        const response = {
            success: true,
            totalSales: totalSales.toFixed(2),
            totalOrders,
            averageOrder: totalOrders ? (totalSales / totalOrders).toFixed(2) : '0.00',
            totalDiscount: (totalCouponDiscount + totalOfferDiscount + totalCategoryDiscount).toFixed(2),
            productDiscounts: totalOfferDiscount.toFixed(2),
            categoryDiscounts: totalCategoryDiscount.toFixed(2),
            couponDiscounts: totalCouponDiscount.toFixed(2),
            topProducts: Object.values(productSales)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 8)
                .map(item => ({
                    name: item.name,
                    units: item.units,
                    revenue: item.revenue.toFixed(2),
                    discount: item.discount.toFixed(2),
                })),
            categorySales: Object.values(categorySales).map(data => ({
                categoryId: data.categoryId || 'Unknown',
                name: data.name || 'Unknown Category',
                revenue: data.revenue.toFixed(2),
                discount: data.discount.toFixed(2),
                percentage: totalSales ? ((data.revenue / totalSales) * 100).toFixed(0) : 0,
            })),
            salesChartData,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error in getSalesReport:', error.message, error.stack);
        res.status(500).json({ success: 'false', message: 'Internal server error', error: error.message });
    }
};



const downloadExcelReport = async (req, res) => {
    try {
        const { period = 'month', fromDate, toDate } = req.query;
        const startDate = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = toDate ? new Date(toDate) : new Date();

        // Log query parameters for debugging
        console.log('Query parameters:', { period, startDate: startDate.toISOString(), endDate: endDate.toISOString() });

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('Invalid date range:', { fromDate, toDate });
            return res.status(400).json({ error: 'Invalid date range' });
        }

        // Fetch orders
        const orders = await Order.find({
            orderDate: { $gte: startDate, $lte: endDate },
            status: 'paid'
        })
            .populate('userId', 'email')
            .populate('couponId')
            .populate({
                path: 'order_items',
                populate: [
                    { path: 'productId', select: 'name categoryId offer' },
                    { path: 'productId.categoryId', select: 'name' },
                    { path: 'productId.offer', select: 'discountPercentage type' }
                ]
            });

        // Log fetched orders for debugging
        console.log('Fetched orders count:', orders.length);
        if (orders.length > 0) {
            console.log('Sample order:', JSON.stringify(orders[0], null, 2));
        } else {
            console.warn('No orders found for the specified criteria.');
        }

        // Create Excel workbook and worksheets
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
        const productWorksheet = workbook.addWorksheet('Product Statistics');

        // Define columns for Sales Report worksheet
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'User Email', key: 'email', width: 30 },
            { header: 'Order Date', key: 'date', width: 20 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Transaction ID', key: 'transactionId', width: 25 },
            { header: 'Total (₹)', key: 'total', width: 15 },
            { header: 'Coupon Code', key: 'couponCode', width: 15 },
            { header: 'Coupon Discount (₹)', key: 'couponDiscount', width: 15 },
            { header: 'Offer Discount (₹)', key: 'offerDiscount', width: 15 },
            { header: 'Products', key: 'products', width: 50 },
            { header: 'Categories', key: 'categories', width: 30 },
            { header: 'Order Notes', key: 'notes', width: 40 }
        ];

        // Style header row for Sales Report
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // Light gray
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Process orders and calculate product statistics
        const productStats = {};
        orders.forEach((order) => {
            // Calculate offer discount
            let offerDiscount = 0;
            const productDetails = order.order_items.map((item) => {
                const product = item.productId;
                if (!product) {
                    console.warn(`Missing product for order item: ${item._id}`);
                    return 'Unknown Product';
                }
                let discount = 0;
                if (product.offer && product.offer.discountPercentage) {
                    discount = (item.price * product.offer.discountPercentage) / 100;
                    offerDiscount += discount;
                }

                // Update product statistics (1 unit per OrderItem, as no quantity field)
                const productId = product._id.toString();
                if (!productStats[productId]) {
                    productStats[productId] = {
                        name: product.name || 'Unknown',
                        units: 0,
                        revenue: 0,
                        discount: 0,
                        categories: product.categoryId?.map(cat => cat.name || 'Unknown') || []
                    };
                }
                productStats[productId].units += 1; // Each OrderItem is 1 unit
                productStats[productId].revenue += item.price;
                productStats[productId].discount += discount;

                return `${product.name || 'Unknown'} (Unit Price: ₹${item.price.toFixed(2)}, Discount: ₹${discount.toFixed(2)})`;
            }).join('; ');

            // Get category names
            const categoryNames = order.order_items
                .map((item) => item.productId?.categoryId?.map((cat) => cat.name || 'Unknown').join(', ') || 'N/A')
                .filter((cat, index, self) => cat !== 'N/A' && self.indexOf(cat) === index)
                .join('; ');

            // Add order row
            worksheet.addRow({
                orderId: order.orderNumber || 'N/A',
                email: order.userId?.email || 'Unknown',
                date: order.orderDate ? order.orderDate.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A',
                paymentMethod: order.paymentMethod || 'N/A',
                transactionId: order.transactionId || 'N/A',
                total: (order.total || 0).toFixed(2),
                couponCode: order.couponCode || 'N/A',
                couponDiscount: (order.couponDiscount || 0).toFixed(2),
                offerDiscount: offerDiscount.toFixed(2),
                products: productDetails || 'N/A',
                categories: categoryNames || 'N/A',
                notes: order.notes || 'N/A'
            });
        });

        // Style data rows for Sales Report
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        // Add summary for Sales Report
        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2);
        const averageOrder = totalOrders ? (totalSales / totalOrders).toFixed(2) : '0.00';
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0).toFixed(2);
        const totalOfferDiscount = orders.reduce((sum, order) => {
            let discount = 0;
            order.order_items.forEach((item) => {
                if (item.productId?.offer?.discountPercentage) {
                    discount += (item.price * item.productId.offer.discountPercentage) / 100;
                }
            });
            return sum + discount;
        }, 0).toFixed(2);
        const totalDiscount = (parseFloat(totalCouponDiscount) + parseFloat(totalOfferDiscount)).toFixed(2);

        worksheet.addRow([]); // Empty row
        worksheet.addRow({
            orderId: 'Summary',
            email: '',
            date: '',
            paymentMethod: '',
            transactionId: '',
            total: `Total Sales: ₹${totalSales}`,
            couponCode: '',
            couponDiscount: `Total Coupon Discount: ₹${totalCouponDiscount}`,
            offerDiscount: `Total Offer Discount: ₹${totalOfferDiscount}`,
            products: `Total Orders: ${totalOrders}`,
            categories: `Average Order: ₹${averageOrder}`,
            notes: `Total Discount: ₹${totalDiscount}`
        });

        // Style summary row
        const summaryRow = worksheet.lastRow;
        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' } // Light gray
        };

        // Define columns for Product Statistics worksheet
        productWorksheet.columns = [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'Units Sold', key: 'units', width: 15 },
            { header: 'Revenue (₹)', key: 'revenue', width: 15 },
            { header: 'Discount (₹)', key: 'discount', width: 15 },
            { header: 'Categories', key: 'categories', width: 30 }
        ];

        // Style header row for Product Statistics
        productWorksheet.getRow(1).font = { bold: true };
        productWorksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        productWorksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add product data
        const productData = Object.values(productStats);
        productData.forEach((product) => {
            productWorksheet.addRow({
                name: product.name,
                units: product.units,
                revenue: product.revenue.toFixed(2),
                discount: product.discount.toFixed(2),
                categories: product.categories.join(', ') || 'N/A'
            });
        });

        // Style product data rows
        productWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        // Add product summary
        const totalUnitsSold = productData.reduce((sum, p) => sum + p.units, 0);
        const totalProductRevenue = productData.reduce((sum, p) => sum + p.revenue, 0).toFixed(2);
        const totalProductDiscount = productData.reduce((sum, p) => sum + p.discount, 0).toFixed(2);

        productWorksheet.addRow([]); // Empty row
        productWorksheet.addRow({
            name: 'Total',
            units: totalUnitsSold,
            revenue: `₹${totalProductRevenue}`,
            discount: `₹${totalProductDiscount}`,
            categories: ''
        });

        // Style product summary row
        const productSummaryRow = productWorksheet.lastRow;
        productSummaryRow.font = { bold: true };
        productSummaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write workbook
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error in downloadExcelReport:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to generate Excel report', details: error.message });
    }
};

module.exports = { getSalesReport, downloadExcelReport };