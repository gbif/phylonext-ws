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
                } else {
                   // removeTokenCookie(res);
                    delete req.user;
                }
                next();
            })
            .catch(function(err) {
                console.log(err.statusCode)
                res.sendStatus(err.statusCode)
               // next(err);
            });
        });
}