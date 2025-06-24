const Offer = require('../../models/offerDb');
const Product = require('../../models/productDb');
const Category = require('../../models/categoryDb');
const User = require('../../models/userDb');
const Order = require('../../models/orderDb');

const offerPage = async (req, res) => {
    try {
        const currentDate = new Date();

        // Fetch user data if logged in
        let userData = null;
        if (req.session.userId) {
            userData = await User.findById(req.session.userId)
                .populate('cart')
                .populate('wishlist')
                .lean();
        }

        // Fetch active offers
        const offers = await Offer.find({
            isListed: true,
            'duration.start': { $lte: currentDate },
            'duration.end': { $gte: currentDate }
        })
        .populate({
            path: 'products',
            match: { isListed: true, isBlocked: false },
            select: 'name regularPrice salesPrice poster banners isRecommended'
        })
        .populate({
            path: 'categoryId',
            select: 'name _id'
        })
        .lean();

        // Filter out offers with missing/null products or categories
        const validOffers = offers.map(offer => ({
            ...offer,
            products: Array.isArray(offer.products) ? offer.products.filter(p => p) : [],
            categoryId: Array.isArray(offer.categoryId) ? offer.categoryId.filter(c => c) : []
        }));

        const offerCategoryIds = validOffers
            .filter(offer => offer.type === 'category' && offer.categoryId.length > 0)
            .flatMap(offer => offer.categoryId.map(cat => cat._id.toString()))
            .filter((id, index, self) => self.indexOf(id) === index);

        const categories = await Category.find({ 
            isListed: true,
            _id: { $in: offerCategoryIds }
        })
        .select('name _id')
        .lean();

        const offerProductIds = [];
        const offerCategoryIdsSet = new Set();

        validOffers.forEach(offer => {
            if (offer.type === 'product' && offer.products) {
                offer.products.forEach(product => {
                    offerProductIds.push(product._id.toString());
                });
            }
            if (offer.type === 'category' && offer.categoryId) {
                offer.categoryId.forEach(cat => {
                    offerCategoryIdsSet.add(cat._id.toString());
                });
            }
        });

        const finalOfferCategoryIds = [...offerCategoryIdsSet];

        const allProducts = await Product.find({
            $and: [
                { isListed: true },
                { isBlocked: false },
                {
                    $or: [
                        { _id: { $in: offerProductIds } },
                        { categoryId: { $in: finalOfferCategoryIds } }
                    ]
                }
            ]
        })
        .populate('categoryId', 'name')
        .select('name regularPrice salesPrice poster banners categoryId isRecommended offer')
        .lean();

        let purchasedProducts = [];
        if (userData) {
            const userOrders = await Order.find({
                userId: userData._id,
                status: 'paid'
            })
            .populate({
                path: 'order_items',
                populate: {
                    path: 'productId',
                    select: '_id'
                }
            })
            .lean();

            purchasedProducts = userOrders.flatMap(order => 
                order.order_items
                    .filter(item => item.productId)
                    .map(item => item.productId._id.toString())
            );
        }

        const enhancedProducts = allProducts
            .filter(product => {
                const productId = product._id.toString();
                if (!userData) return true;
                return !purchasedProducts.includes(productId);
            })
            .map(product => {
                let discount = 0;
                let currentPrice = product.salesPrice;
                let isOnSale = false;
                const productId = product._id.toString();

                validOffers.forEach(offer => {
                    if (offer.type === 'product' && 
                        offer.products.some(p => p._id.toString() === productId)) {
                        discount = Math.max(discount, offer.discountPercentage);
                        currentPrice = Math.floor(product.regularPrice * (1 - discount / 100));
                        isOnSale = true;
                    }

                    if (offer.type === 'category' && offer.categoryId && product.categoryId) {
                        const productCategoryIds = Array.isArray(product.categoryId)
                            ? product.categoryId.map(cat => cat._id.toString())
                            : product.categoryId ? [product.categoryId._id.toString()] : [];

                        const offerCategoryIds = offer.categoryId.map(cat => cat._id.toString());

                        if (productCategoryIds.some(id => offerCategoryIds.includes(id))) {
                            discount = Math.max(discount, offer.discountPercentage);
                            currentPrice = Math.floor(product.regularPrice * (1 - discount / 100));
                            isOnSale = true;
                        }
                    }
                });

                const isInCart = userData ? userData.cart.some(cartItem => cartItem.toString() === productId) : false;
                const isInWishlist = userData ? userData.wishlist.some(wishItem => wishItem.toString() === productId) : false;

                return {
                    ...product,
                    _id: productId,
                    category: product.categoryId && product.categoryId.length > 0 ? 
                        (Array.isArray(product.categoryId) ? product.categoryId : [product.categoryId]).map(cat => ({
                            _id: cat._id.toString(),
                            name: cat.name
                        })) : 
                        [{ _id: null, name: 'Uncategorized' }],
                    currentPrice,
                    originalPrice: product.regularPrice,
                    regularPrice: product.regularPrice,
                    discount,
                    isOnSale,
                    isInCart,
                    isInWishlist,
                    image: product.poster || 'https://via.placeholder.com/300x200',
                    banners: product.banners || []
                };
            });

        res.render('offerPage', {
            userData,
            success: true,
            offers: validOffers.map(offer => ({
                ...offer,
                _id: offer._id.toString(),
                categoryId: offer.categoryId.map(cat => ({
                    _id: cat._id.toString(),
                    name: cat.name
                })),
                products: offer.products.map(p => ({ 
                    ...p, 
                    _id: p._id.toString() 
                })),
                banner: offer.banner || 'https://via.placeholder.com/500x300'
            })),
            products: enhancedProducts,
            categories: categories.map(category => ({
                ...category,
                _id: category._id.toString()
            }))
        });

    } catch (error) {
        console.error('Error fetching offer page data:', error);
        try {
            res.status(500).render('pageNotFount', {
                message: 'Unable to load offers. Please try again later.'
            });
        } catch (viewError) {
            res.status(500).send('Server error: Unable to load offers or render error page.');
        }
    }
};

module.exports = {
    offerPage
};
