'use strict';
let compose = require('composable-middleware');
let User = require('./user.model');


module.exports = {
    appendUser: appendUser
};



function appendUser() {
    return compose()
    // Attach user to request
        .use(function(req, res, next) {
            User.getFromToken(req.headers.authorization)
            .then((user) => {
                if (user) {
                    req.user = user;
                    res.setHeader('token', user?.token);
                } else {
                   // removeTokenCookie(res);
                    res.removeHeader('token');
                    delete req.user;
                }
                
                next();
            })
            .catch(function(err) {
                res.sendStatus(err.statusCode)
               // next(err);
            });
        });
}