const User = require('../../models/userDb');
const Product = require('../../models/productDb');
const Order =require('../../models/orderDb')
const OrderItem=require('../../models/OrderItemDB');
const Company=require('../../models/companyDb');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');




const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin', { message: null });
};



const pageError=async(req,res)=>{
    res.render('pageError')
}



const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email, isAdmin: true });
        
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            
            if (passwordMatch) {
                req.session.admin = true;
                req.session.adminId = admin._id; // Store admin ID in session
                return res.redirect('/admin/dashboard');
            }
        }
        
        // If login fails
        res.render('adminLogin', { 
            message: 'Invalid email or password' 
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/pageError');
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            console.log('Order schema paths:', Object.keys(Order.schema.paths));
            console.log('OrderItem schema paths:', Object.keys(OrderItem.schema.paths));

            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today);

            // Chart filter handling
            const chartFilter = req.query.chartFilter || 'yearly';
            const queryStartDate = req.query.startDate || '';
            const queryEndDate = req.query.endDate || '';
            let chartStartDate, chartEndDate;
            if (chartFilter === 'custom' && queryStartDate && queryEndDate) {
                chartStartDate = new Date(queryStartDate);
                chartEndDate = new Date(queryEndDate);
            } else {
                chartStartDate = new Date(today.getFullYear() - 5, 0, 1);
                chartEndDate = new Date(today);
            }

            // Chart data aggregation
            let chartGroup;
            let chartFormat;
            switch (chartFilter) {
                case 'monthly':
                    chartGroup = { $dateToString: { format: '%Y-%m', date: '$orderDate' } };
                    chartFormat = '%Y-%m';
                    chartStartDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
                    break;
                case 'custom':
                    chartGroup = { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } };
                    chartFormat = '%Y-%m-%d';
                    break;
                default:
                    chartGroup = { $dateToString: { format: '%Y', date: '$orderDate' } };
                    chartFormat = '%Y';
            }

            const chartData = await Order.aggregate([
                {
                    $match: {
                        status: 'paid',
                        orderDate: { $gte: chartStartDate, $lte: chartEndDate },
                    },
                },
                {
                    $group: {
                        _id: chartGroup,
                        value: { $sum: '$total' },
                    },
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        label: '$_id',
                        value: { $round: ['$value', 2] },
                    },
                },
            ]);

            console.log('Chart Data:', JSON.stringify(chartData, null, 2));

            // Concurrent queries for counts
            const [userCount, productsCount] = await Promise.all([
                User.countDocuments(),
                Product.countDocuments(),
            ]);

            // Total Sales
            const salesData = await Order.aggregate([
                { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: 'paid' } },
                { $group: { _id: null, totalSales: { $sum: '$total' } } },
            ]);
            const totalSales = salesData[0]?.totalSales?.toFixed(2) || '0.00';

            // Total Orders
            const totalOrders = await Order.countDocuments({
                orderDate: { $gte: startDate, $lte: endDate },
                status: 'paid',
            });

            // Recent Orders (latest 4)
            const recentOrders = await Order.find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
                .sort({ orderDate: -1 })
                .limit(4)
                .populate('userId', 'name')
                .lean();

            // Top Selling Products (top 10 by units sold)
            const topProducts = await Order.aggregate([
                { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: 'paid' } },
                { $unwind: '$order_items' },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: 'order_items',
                        foreignField: '_id',
                        as: 'orderItem',
                    },
                },
                { $unwind: '$orderItem' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'orderItem.productId',
                        foreignField: '_id',
                        as: 'product',
                    },
                },
                { $unwind: '$product' },
                {
                    $group: {
                        _id: '$orderItem.productId',
                        name: { $first: '$product.name' },
                        units: { $sum: 1 },
                        revenue: { $sum: '$orderItem.price' },
                    },
                },
                { $sort: { units: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        units: 1,
                        revenue: { $round: ['$revenue', 2] },
                    },
                },
            ]);

            console.log('Top Products:', JSON.stringify(topProducts, null, 2));

            // Top Selling Categories (top 10 by units sold)
            const topCategories = await Order.aggregate([
                { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: 'paid' } },
                { $unwind: '$order_items' },
                {
                    $lookup: {
                        from: 'orderitems',
                        localField: 'order_items',
                        foreignField: '_id',
                        as: 'orderItem',
                    },
                },
                { $unwind: '$orderItem' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'orderItem.productId',
                        foreignField: '_id',
                        as: 'product',
                    },
                },
                { $unwind: '$product' },
                { $unwind: '$product.categoryId' },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'product.categoryId',
                        foreignField: '_id',
                        as: 'category',
                    },
                },
                { $unwind: '$category' },
                {
                    $group: {
                        _id: '$category._id',
                        name: { $first: '$category.name' },
                        units: { $sum: 1 },
                        revenue: { $sum: '$orderItem.price' },
                    },
                },
                { $sort: { units: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        units: 1,
                        revenue: { $round: ['$revenue', 2] },
                    },
                },
            ]);

            console.log('Top Categories:', JSON.stringify(topCategories, null, 2));

const topCompanies = await Order.aggregate([
    {
        $match: {
            status: 'paid',
            orderDate: { $gte: startDate, $lte: endDate },
        },
    },
    { $unwind: '$order_items' },
    {
        $lookup: {
            from: 'orderitems',
            localField: 'order_items',
            foreignField: '_id',
            as: 'orderItem',
        },
    },
    { $unwind: '$orderItem' },
    {
        $lookup: {
            from: 'products',
            localField: 'orderItem.productId',
            foreignField: '_id',
            as: 'product',
        },
    },
    { $unwind: '$product' },
    {
        $lookup: {
            from: 'companies',
            localField: 'product.company',
            foreignField: '_id',
            as: 'company',
        },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
        $group: {
            _id: { $ifNull: ['$company._id', 'unknown'] },
            companyName: { $first: { $ifNull: ['$company.companyName', 'Unknown Company'] } },
            logo: { $first: { $ifNull: ['$company.companyLogo', '/images/company-placeholder.png'] } },
            units: { $sum: 1 },
            revenue: { $sum: '$orderItem.price' },
        },
    },
    { $sort: { units: -1 } },
    { $limit: 10 },
    {
        $project: {
            _id: 0,
            companyName: 1,
            logo: 1,
            units: 1,
            revenue: { $round: ['$revenue', 2] },
        },
    },
]);


            console.log('Top Companies:', JSON.stringify(topCompanies, null, 2));

            res.render('dashboard', {
                title: 'Dashboard',
                currentPage: 'dashboard',
                userCount,
                productsCount,
                totalSales,
                totalOrders,
                recentOrders: recentOrders.map(order => ({
                    orderId: order.orderNumber || 'Unknown',
                    customer: order.userId?.name || 'Unknown',
                    date: order.orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    amount: (order.total || 0).toFixed(2),
                    status: order.status || 'Unknown',
                })),
                topProducts: topProducts.map(product => ({
                    id: product._id.toString(),
                    name: product.name || 'Unknown Product',
                    units: product.units || 0,
                    price: product.units ? (product.revenue / product.units).toFixed(2) : '0.00',
                })),
                topCategories: topCategories.map(category => ({
                    id: category._id.toString(),
                    name: category.name || 'Unknown Category',
                    units: category.units || 0,
                    revenue: category.revenue.toFixed(2),
                })),
                topCompanies: topCompanies.map(company => ({
                    id: company._id ? company._id.toString() : 'unknown',
                    companyName: company.companyName || 'Unknown Company',
                    logo: company.logo,
                    units: company.units || 0,
                    revenue: (company.revenue || 0).toFixed(2),
                })),
                chartData: {
                    filter: chartFilter,
                    labels: chartData.map(d => d.label || 'Unknown'),
                    values: chartData.map(d => d.value || 0),
                },
                startDate: queryStartDate,
                endDate: queryEndDate,
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.redirect('/pageError');
        }
    } else {
        res.redirect('/admin/login');
    }
};

const logoutAdmin = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log('Error destroying session:', err);
                return res.redirect('/pageError');
            }
            res.redirect('/admin/login');
        });
    } catch (error) {
        console.log('Unexpected error during logout:', error);
        res.redirect('/pageError');
    }
};




module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logoutAdmin,
};
