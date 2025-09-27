const Product = require("../../models/productDb");
const PointsShop = require("../../models/pointsDb");

const pointsManagement = async (req, res) => {
  try {
    const search = req.query.search || "";
    const selectedCategory = req.query.category || "";
    const selectedCompany = req.query.company || "";
    const page = Number.parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const allPointsShop = await PointsShop.find({ isListed: true }).populate({
      path: "gameId",
      populate: [
        { path: "categoryId", select: "_id name" },
        { path: "company", select: "_id name" },
      ],
    });

    const pointsProducts = allPointsShop.map(item => ({
      _id: item._id,
      name: item.gameId.name,
      description: item.gameId.description,
      poster: item.gameId.poster,
      pointsRequired: item.pointsRequired,
      category: item.gameId.categoryId.map(cat => cat.name).join(", "), // convert categories to string
      company: item.gameId.company.name,
      regularPrice: item.gameId.regularPrice
    }));

    // Filter based on query
    const filtered = allPointsShop.filter((item) => {
      if (!item.gameId) return false;
      const game = item.gameId;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !game.name.toLowerCase().includes(searchLower) &&
          !game.description?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Category filter (array)
      if (selectedCategory) {
        if (
          !game.categoryId.some(
            (cat) => cat._id.toString() === selectedCategory
          )
        ) {
          return false;
        }
      }

      // Company filter
      if (selectedCompany) {
        if (game.company._id.toString() !== selectedCompany) {
          return false;
        }
      }

      return true;
    });

    // Paginate in memory
    const paginated = filtered.slice(skip, skip + limit);

    const products = paginated.map((item) => ({
      _id: item._id,
      name: item.gameId.name,
      description: item.gameId.description,
      poster: item.gameId.poster,
      pointsRequired: item.pointsRequired,
      regularPrice: item.gameId.regularPrice,
      categoryId: item.gameId.categoryId,
      company: item.gameId.company,
    }));

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("pointsShop-management", {
      products,
      totalPages,
      currentPage: page,
      search,
      selectedCategory,
      selectedCompany,
      pointsProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const getAvailableProducts = async (req, res) => {
  try {
    const pointsShopGameIds = await PointsShop.find().distinct("gameId");
    const products = await Product.find({
      _id: { $nin: pointsShopGameIds },
      isListed: true,
    }).select("name poster regularPrice _id");
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const addToPointsShop = async (req, res) => {
  try {
    const { gameIds } = req.body;

    const games = await Product.find({ _id: { $in: gameIds } });

    const gamesToAdd = games.map((game) => ({
      gameId: game._id,
      pointsRequired: Math.ceil(game.regularPrice * 10),
      isListed: true,
    }));

    await PointsShop.insertMany(gamesToAdd, { ordered: false });

    res
      .status(201)
      .json({ message: "Games added to Points Shop successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteFromPointsShop = async (req, res) => {
  try {
    const { id } = req.params;
    await PointsShop.findByIdAndDelete(id);
    res.json({ message: "Game removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  pointsManagement,
  getAvailableProducts,
  addToPointsShop,
  deleteFromPointsShop,
};
