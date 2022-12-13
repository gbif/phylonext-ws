'use strict';
const express = require('express');
const cors = require('cors');
const router = express.Router();
const User = require('./user.model');
module.exports = function(app) {
    app.use(cors({exposedHeaders: ['token']}))
    app.use('/auth', router);
};



router.get('/login', function(req, res) {
    User.login(req.headers.authorization)
        .then((user) => {
            res.json(user)
        })
        .catch((err) => res.sendStatus(403));
})

router.post('/whoami', function(req, res) {
    User.getFromToken(req.headers.authorization)
    
    
        .then((user) => {
            if (user) {
                res.setHeader('token', user?.token);
                res.json(user)
            } else {
               // removeTokenCookie(res);
                res.removeHeader('token');
                throw "No user"
            }
        })
        .catch((err) => res.sendStatus(403));
})

