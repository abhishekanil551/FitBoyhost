const User = require('../../models/userDb');
const path = require('path');
const express = require('express');
const app = express();


const customerInfo=async (req,res)=>{

    try {
        let search=''
        if(req.query.search){
            search=req.query.search;
        }
        let page=1;
        if(req.query.page){
            page=req.query.page
        }
        const limit=10
        const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
        })
        .sort({createdOn:-1})
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();


        const count =await User.find({
            isAdmin:false,
            $or:[
                {name: { $regex: search, $options: 'i' }},
                {email: { $regex: search, $options: 'i' }}
            ],
        }).countDocuments();
        const totalPages = Math.ceil(count / limit);

        res.render('customer-management', { 
            userData,  
            search,
            currentPage: page,
            totalPages
        });
        } catch (error) {
         console.error("Error loading customer info:", error);
         res.redirect('/admin/pageError');
    }
}



const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/customer-management');
    } catch (error) {
        res.redirect('/admin/pageError');
    }
};




const customerUnblocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/customer-management');
    } catch (error) {
        res.redirect('/pageError');
    }
};





module.exports={
    customerInfo,
    customerBlocked,
    customerUnblocked,

}