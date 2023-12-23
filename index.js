const express = require('express');
const mongoose = require('mongoose');
const { cleanUpAndValidate } = require('./utils/authUtils');
const userModel = require('./models/userModel');
require("dotenv").config();
const bcrypt = require('bcrypt');
const { cleanUpAndValidateLogin } = require('./utils/authLogin');
const session = require('express-session');
const { isAuth } = require('./middlewares/isAuth');
const mongoDbSession = require('connect-mongodb-session')(session);
const validator = require('validator')



const app = express();
const PORT = process.env.PORT;
const store = new mongoDbSession({
    uri: process.env.MONGO_URI,
    collection : "sessions"
})



//DB CONNECTED 
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("MongoDB Connected")
})
.catch(e=>console.log(e))




 //MIDDLEWARES 
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use(
    session({
       secret : process.env.SECRET_KEY,
       resave : false,
       saveUninitialized : false,
       store : store
    })
)



app.get('/',(req,res)=>{
    res.send("Server working")
})


app.get('/register',(req,res)=>{
    return res.render("register")
})


app.get('/login',(req,res)=>{
    return res.render("login")
})

app.post('/register',async(req,res)=>{
    const {name , email , username , password} = req.body;

    //validate data 
    try{
       await cleanUpAndValidate({name , email , username , password})
    }
    catch(e){
        return res.send({
            status: 400,
            error: e,
        });
    }


    //unique fields not to add in db
    try{
        const emailExists = await userModel.findOne({email})

        if(emailExists){
            return res.send({
                status : 400,
                message:"User Email already exists",
                data: email
            })
        }

        const userNameExists = await userModel.findOne({username})

        if(userNameExists){
            return res.send({
                status : 400,
                message:"User username already exists",
                data: username
            })
        }

        //hashing the password
        const hashedPassword = await bcrypt.hash(password,parseInt(process.env.SALT))


        //add to database
        const userObj = new userModel({
        name: name,
        email:email,
        username:username,
        password : hashedPassword
    })

    const userDb = await userObj.save();

    return res.redirect('/login')
    }
    catch(err){
        return res.send({
            status:500,
            message : 'Database error',
            error : err
        })
    }
})



app.post('/login',async (req,res)=>{
   const {loginId, password} = req.body;
   
    //validate
   try{
      await cleanUpAndValidateLogin({loginId,password});
   }
   catch(err){
      return res.send({
        status : 400,
        error : err
      })
   }



    
    try{
        
        let userDb = {}
        
        if(validator.isEmail(loginId))
        {
           
            userDb = await userModel.findOne({email:loginId})
        }
        else
        {
           
            userDb = await userModel.findOne({username: loginId})
        }

        console.log(userDb)
        if(!userDb){
            return res.send({
                status : 400,
                message : "Login id not found.. please register"
            })
        }

        const isMatch = await bcrypt.compare(password,userDb.password)
        console.log(isMatch)
        if(!isMatch){
            return res.send({
                status : 400,
                message : 'Password incorrect'
            })
        }


        //session based auth
        req.session.isAuth = true;
        req.session.user={
            userId : userDb._id,
            username : userDb.username,
            email : userDb.email
        } 

        return res.redirect('/dashboard');
    }
    catch(err){
        return res.send({
            status:500,
            message : 'Database error',
            error : err
        })
    }
})

app.get('/dashboard',isAuth, (req,res)=>{
    return res.send("dashboard page")
})

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})