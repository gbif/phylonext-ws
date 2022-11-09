
'use strict';
const config = require('../config');
const  request = require('request-promise');

module.exports = {
    
    login: login,
    getFromToken: getFromToken
};

async function login(auth) {
    let loginRequest = {
        url: `${config.GBIF_API}user/login`,
        method: 'GET',
        headers: {
            authorization: auth
        },
        json: true
    };
    try {
        let response = await request(loginRequest);
        return response;
    } catch (error) {
        throw error
    }
    
}

async function getFromToken(auth) {
    let options = {
        method: 'GET',
        url: `${config.GBIF_API}user/login`,
        headers: {
            authorization: auth
        },
        json: true
    };
    try {
        let response = await request(options);
        
        return response;
    } catch (error) {
       // console.log(error)
        throw error;  
    }
    
} 