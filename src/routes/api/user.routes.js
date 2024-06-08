const express = require('express');
const Router = express.Router();
const verifyAuth = require('../../middleware/check-auth');
const UserController = require('../../controllers/user.controller');

//Gets posts for the content reel
Router.get('/content-reel/:skip', verifyAuth, UserController.getContentReel);

//Creates a post
Router.post('/create-post', verifyAuth, UserController.createPost);

//Gets a post to view
Router.get('/get-post/:postId', verifyAuth, UserController.getPost);

//Loads comments
Router.get('/get-comments/:postId', verifyAuth, UserController.getComments);

//Creates a comment or reply to a comment
//Updates comments count on the target post
Router.post('/create-comment', verifyAuth, UserController.createComment);

//Gets replies to a comment
Router.get('/get-replies/:postId/:commentId', verifyAuth, UserController.getReplies);


module.exports = Router;