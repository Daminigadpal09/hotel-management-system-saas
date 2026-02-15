// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const Hotel = require("../../models/Hotel");
// const User = require("../../models/User");



const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const Hotel=require("../../model/hotel");
const User= require("../../model/User");
exports.registerHotel=async(req,res)=>{
    try{
        const {hotelName,owerName,email,password}=req.body;
        const existingUser= await User.findOne({email});
        if(existingUser)
            return res.status(400).json({message:"Email already exists"});
        const hotel =await Hotel.create({name:hotelName});
        const hashedPassword= await bcrypt.hash(password,10);
        await User.create({
            name:owerName,
            email,
            password:hashedPassword,
            role:"owner",
            hotel_id:hotel.id
        })
        res.status(201).json({message:"Hotel registered successfully"})
    }
    catch(error){
        res.status(500).json({error:error.message})
    }

    };
    exports.login=async(req,res)=>{
        try{
            const {email,password}=req.body;
            const user=await User.findOne({email});
            if(!user)
                return res.status(400).json({message:"Invalid credentials"});

            const isMatch=await bcrypt.compare(password,user.password);
            if(!isMatch)
                return res.status(400).json({message:"Invalid credentials"});
            if(user.status!="active")
                return res.status(403).json({message:"Account suspended"});

            const token = jwt.sign(
                {
                    userId: user._id,
                    role: user.role,
                    hotel_id: user.hotel_id,
                    branch_id: user.branch_id
                },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            res.json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    role: user.role,
                    hotel_id: user.hotel_id,
                    branch_id: user.branch_id
                }
            });

        }
        catch(error){
            res.status(500).json({error:error.message})
        }
    }

