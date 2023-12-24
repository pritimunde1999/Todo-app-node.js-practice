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
const validator = require('validator');
const sessionModel = require('./models/sessionModel');
const todoModel = require('./models/todoModel');



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

app.use(express.static("public"));



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
    return res.render("dashboard")
})

app.post('/logout', isAuth , (req,res)=>{
    req.session.destroy((err)=>{
        if(err) throw err;

        return res.redirect('/login')
    })
})

app.post('/logout_from_all_devices', isAuth, async(req,res)=>{
    console.log(req.session.user.username);
    const username = req.session.user.username;

    try{
        const deleteSessionCount = await sessionModel.deleteMany({
            "session.user.username" : username
        })

        console.log(deleteSessionCount)

        res.redirect('/login')
    }
    catch(err){
        return res.send("Logout unsuccessfull");
    }
})


app.post('/create-item', isAuth, async(req,res)=>{
    const todoText = req.body.todo;
    const username = req.session.user.username;

    if(!todoText)
    {
        return res.send({
            status : 400,
            message : 'Missing todo text!'
        })
    }

    if(typeof todoText !== 'string')
    {
        return res.send({
            status : 400,
            message : 'Todo text is not a string'
        })
    }

    if(todoText.length <3 || todoText.length>100)
    {
        res.send({
            status : 400,
            message : 'Todo text length should be 3 to 100 characters'
        })
    }

    const todoObj = new todoModel({
        todo: todoText,
        username: username
    })

    try{

        const todoDb = await todoObj.save();

        return res.send({
            status: 201,
            message: "Todo created successfully",
            data: todoDb,
          });
    }
    catch(err){
        return res.send({
            status: 500,
            message: "Database error",
            error: err,
          });
    }

})


app.post('/edit-item', isAuth, async(req,res)=>{
    
    const { id, newData } = req.body;

  //data validation

  if (!id || !newData) {
    return res.send({
      status: 400,
      message: "Missing credentials",
    });
  }

  if (newData.length < 3 || newData.length > 50) {
    return res.send({
      status: 400,
      message: "Todo length should be in range of 3-50 chars",
    });
  }

  //find the todo from db

  try {
    const todoDb = await todoModel.findOne({ _id: id });
    if (!todoDb) {
      return res.send({
        status: 400,
        message: "Todo not found",
      });
    }

    //check ownership
    if (todoDb.username !== req.session.user.username) {
      return res.send({
        status: 401,
        message: "Not allowed to edit, authorization failed",
      });
    }

    //update the todo in DB
    const todoPrev = await todoModel.findOneAndUpdate(
      { _id: id },
      { todo: newData }
    );

    return res.send({
      status: 200,
      message: "Todo updated successfully",
      data: todoPrev,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
})

app.post('/delete-item', isAuth, async(req,res)=>{
    const {id} = req.body;

    if(!id){
        return res.send({
            status : 400,
            message : 'Missing Credentials'
        })
    }

    try{
       const todoDb = await todoModel.findOne({_id : id});
       if(!todoDb){
        return res.send({
            status : 404,
            message : 'No Todo Found with given ID'
        })
       }

        //check ownership 

        if(todoDb.username !== req.session.user.username)
        {
            return res.send({
                status : 404 ,
                message : 'Cannot edit todo ... authorization failed!'
            })
        }

        const todoPrev = await todoModel.findOneAndDelete({ _id: id });

        return res.send({
            status: 200,
            message: "Todo deleted successfully",
            data: todoPrev,
        });
    }
    catch(err){
        return res.send({
            status: 500,
            message: "Database error",
            error: err,
        });
    }
})

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})