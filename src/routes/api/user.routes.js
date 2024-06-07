const express = require('express');
const Router = express.Router();
const verifyAuth = require('../../middleware/check-auth');
const UserController = require('../../controllers/user.controller');

//Gets posts for the content reel
Router.get('/content-reel/:skip', verifyAuth, UserController.getContentReel);

//Creates a post
Router.post('/create-post', verifyAuth, UserController.createPost);


module.exports = Router;