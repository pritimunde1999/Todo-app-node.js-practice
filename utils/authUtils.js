const validator = require('validator')


const cleanUpAndValidate = ({email,username, name , password}) =>{
    return new Promise ((resolve,reject)=>{
        if(!email || !password || !username || !name) reject("missing credentials");

        if(typeof email !== 'string') reject('Data type of email is incorrect')
        if(typeof name !== 'string') reject('Data type of name is incorrect')
        if(typeof username !== 'string') reject('Data type of username is incorrect')
        if(typeof password !== 'string') reject('Data type of password is incorrect')

        if(username.length <3 || username.length>30) reject("username should be of 3-30 chars")
        if(password.length <3 || password.length>30) reject("password should be of 3-30 chars")

        if(!validator.isEmail(email)) reject("Foramt of email is wrong")

        resolve()
    })
}

module.exports = {cleanUpAndValidate}