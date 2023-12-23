const isAuth = (req,res,next) =>{
    if(req.session.isAuth)
    {
        next();
    }
    else
    {
        return res.send({
            status : 401,
            message : "Session is expired"
        })
    }
}

module.exports = {isAuth}