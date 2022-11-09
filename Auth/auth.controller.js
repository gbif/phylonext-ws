'use strict';
const express = require('express');
const cors = require('cors');
const router = express.Router();
const User = require('./user.model');

module.exports = function(app) {
    app.use(cors())
    app.use('/auth', router);
};



router.get('/login', function(req, res) {
    User.login(req.headers.authorization)
        .then((user) => {
            console.log(user)
            res.json(user)
        })
        .catch((err) => res.sendStatus(403));
})

