
const cleanUpAndValidateLogin = ({loginId , password}) =>{
    return new Promise ((resolve,reject)=>{
        if(!loginId || !password ) reject("missing credentials");

        
        if(typeof loginId !== 'string') reject('Data type of loginID is incorrect')
        if(typeof password !== 'string') reject('Data type of password is incorrect')


        resolve()
    })
}

module.exports = {cleanUpAndValidateLogin}