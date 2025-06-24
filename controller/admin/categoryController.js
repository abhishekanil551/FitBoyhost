const category=require('../../models/categoryDb');
const products=require('../../models/productDb');



const categoryInfo = async (req, res) => {
    try {
        const search = req.query.search || ''; 
        const page = parseInt(req.query.page) || 1; 
        const limit = 8;  
        const skip = (page - 1) * limit;  

        const query = {};
        
        // If a search term is provided, add search criteria to the query
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },  
                { description: { $regex: search, $options: 'i' } } 
            ];
        }

        const categoryData = await category.find(query)
            .limit(limit)
            .sort({ createdAt: -1 })
            .skip(skip);


        const totalCategories = await category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);  // Calculate total pages for pagination

        // Render the category management page with the search term and results
        res.render('category-management', {
            categoryData,
            currentPage: page,
            totalPages,
            totalCategories,
            search  // Send the search term back to the view for the input field
        });
    } catch (error) {
        console.error('Error loading category info:', error);
        res.redirect('/admin/pageError');
    }
};





const addCategory = async (req, res) => {
    const { name, description } = req.body;
    console.log('Incoming Request Body:', req.body); 

    try {
        const existingCategory = await category.findOne({ 
            name: { $regex: `^${name}$`, $options: 'i' } 
          });
            if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const newCategory = new category({ name, description });
        await newCategory.save();

        return res.json({ message: 'Category created successfully' });

    } catch (error) {
        console.error('Error in addCategory:', error); 
        return res.status(500).json({ error: error.message || 'internal server error' });
    }
};







const listCategory=async (req, res)=>{
    try {
        let id=req.query.id;
        await category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect('/admin/category-management');
    } catch (error) {
        res.redirect('/admin/pageError');
        console.error('Error listing category:', error);
    }
}


const unlistCategory=async (req, res)=>{
    try {
        let id=req.query.id;
        await category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect('/admin/category-management');
    } catch (error) {
        res.redirect('/admin/pageError');
        console.error('Error unlisting category:', error);
    }
}






const editCategory = async (req, res) => {
    try {
      const id = req.params.id;
      const { categoryName, description } = req.body;
  
      // Check if another category with the same name exists (excluding current one)
      const existingCategory = await category.findOne({
        name: { $regex: `^${categoryName}$`, $options: 'i' },
        _id: { $ne: id }   
      });
      
      if (existingCategory) {
        return res.status(400).json({ error: 'Category already exists' });
      }
  
      const updatedCategory = await category.findByIdAndUpdate(
        id,
        { name: categoryName, description: description },
        { new: true }
      );
  
      if (!updatedCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }
  
      return res.json({ 
        message: 'Category updated successfully',
        category: updatedCategory 
      });
    } catch (error) {
      console.error('Error editing category:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };



module.exports={
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    editCategory,
}
