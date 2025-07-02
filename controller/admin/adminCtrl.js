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
        res.render('adminLogin', { 
            message: 'Invalid email or password' 
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/pageError');
    }
};

const loadDashboard = async (req, res) => {
    if (!req.session.adminId) return res.redirect('/admin/login');

    try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today);

        const chartFilter = req.query.chartFilter || 'yearly';
        const queryStartDate = req.query.startDate || '';
        const queryEndDate = req.query.endDate || '';

        let chartStartDate, chartEndDate;

        const MAX_CHART_RANGE_DAYS = 365;

        if (chartFilter === 'custom' && queryStartDate && queryEndDate &&
            !isNaN(Date.parse(queryStartDate)) && !isNaN(Date.parse(queryEndDate))) {

            chartStartDate = new Date(queryStartDate);
            chartEndDate = new Date(queryEndDate);

            const rangeInDays = Math.ceil((chartEndDate - chartStartDate) / (1000 * 60 * 60 * 24));
            if (rangeInDays > MAX_CHART_RANGE_DAYS) {
                chartEndDate = new Date(chartStartDate.getTime() + MAX_CHART_RANGE_DAYS * 86400000);
            }

        } else {
            // Default to 1 year range
            chartStartDate = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1);
            chartEndDate = today;
        }

        let chartGroup;
        switch (chartFilter) {
            case 'monthly':
                chartGroup = { $dateToString: { format: '%Y-%m', date: '$orderDate' } };
                chartStartDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
                break;
            case 'custom':
                chartGroup = { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } };
                break;
            default:
                chartGroup = { $dateToString: { format: '%Y', date: '$orderDate' } };
        }

        const chartDataRaw = await Order.aggregate([
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

        const chartData = chartDataRaw.length > 0
            ? chartDataRaw.map(d => ({
                label: d.label || 'N/A',
                value: typeof d.value === 'number' ? d.value : 0,
            }))
            : [{ label: 'No Data', value: 0 }];

        const [userCount, productsCount] = await Promise.all([
            User.countDocuments(),
            Product.countDocuments(),
        ]);

        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: startDate, $lte: endDate },
                    status: 'paid',
                },
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                },
            },
        ]);
        const totalSales = salesData[0]?.totalSales?.toFixed(2) || '0.00';

        const totalOrders = await Order.countDocuments({
            orderDate: { $gte: startDate, $lte: endDate },
            status: 'paid',
        });

        const recentOrders = await Order.find({
            orderDate: { $gte: startDate, $lte: endDate },
        })
            .sort({ orderDate: -1 })
            .limit(10)
            .populate('userId', 'name')
            .lean();

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
                    poster: { $first: '$product.poster' },
                    units: { $sum: 1 },
                    revenue: { $sum: '$orderItem.price' },
                },
            },
            { $sort: { units: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: 1,
                    poster: { $ifNull: ['$poster', '/images/product-placeholder.png'] },
                    units: 1,
                    revenue: { $round: ['$revenue', 2] },
                },
            },
        ]);

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

        const topCompanies = await Order.aggregate([
            { $match: { status: 'paid', orderDate: { $gte: startDate, $lte: endDate } } },
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
                id: product._id?.toString(),
                name: product.name || 'Unknown Product',
                poster: product.poster,
                units: product.units || 0,
                price: product.units ? (product.revenue / product.units).toFixed(2) : '0.00',
            })),
            topCategories: topCategories.map(category => ({
                id: category._id?.toString(),
                name: category.name || 'Unknown Category',
                units: category.units || 0,
                revenue: category.revenue.toFixed(2),
            })),
            topCompanies: topCompanies.map(company => ({
                id: company._id?.toString() || 'unknown',
                companyName: company.companyName || 'Unknown Company',
                logo: company.logo,
                units: company.units || 0,
                revenue: (company.revenue || 0).toFixed(2),
            })),
            chartData: {
                filter: chartFilter,
                labels: chartData.map(d => d.label),
                values: chartData.map(d => d.value),
            },
            startDate: queryStartDate,
            endDate: queryEndDate,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/pageError');
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
