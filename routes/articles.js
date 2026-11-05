const express=require('express');
const router=express.Router();

router.get('/',(req,res)=>{
    res.send('Welcome to the Articles page!');
});

module.exports=router;