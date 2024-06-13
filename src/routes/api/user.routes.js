const express = require('express');
const Router = express.Router();
const verifyAuth = require('../../middleware/check-auth');
const UserController = require('../../controllers/user.controller');

//Gets posts for the content reel
Router.get('/content-reel/:skip', verifyAuth, UserController.getContentReel);

//Gets followers and following for the sidebar in the home page
Router.get('/followers-and-following', verifyAuth, UserController.getFollowersAndFollowing);

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

//Like or unlike a post
Router.post('/toggle-post-like/:postId', verifyAuth, UserController.togglePostLike);

//Like or unlike a comment
Router.post('/toggle-comment-like/:commentId', verifyAuth, UserController.toggleCommentLike);

//Get people who have liked a post
Router.get('/get-post-likers/:postId/:skip/:limit', verifyAuth, UserController.getPostLikers);

//Check if a post is saved 
Router.get('/get-post-save-status/:postId', verifyAuth, UserController.getPostSaveStatus);

//Saves or unsaves a post
Router.put('/toggle-post-save/:postId', verifyAuth, UserController.togglePostSave);

//Follows or unfollows a user
Router.put('/toggle-user-follow/:authorId', verifyAuth, UserController.toggleUserFollow);

//delete a post
Router.delete('/delete-post/:postId', verifyAuth, UserController.deletePost);

//Gets saved posts of a user
Router.get('/get-saved-posts/:skip', verifyAuth, UserController.getSavedPosts);

//Gets user profile
Router.get('/get-user-profile/:userId', verifyAuth, UserController.getUserProfile);

//Update bio
Router.put('/update-bio', verifyAuth, UserController.updateBio);
//Remove bio
Router.put('/remove-bio', verifyAuth, UserController.removeBio);

//Update profile image url
Router.put('/update-image-url', verifyAuth, UserController.updateProfileImage);

//Update banner image url
Router.put('/update-banner-image-url', verifyAuth, UserController.updateBannerImage);

//Gets user's posts to show on their Profile
Router.get('/get-user-posts/:authorId/:skip', verifyAuth, UserController.getUserPosts);

//Gets user's media to show on their Profile
Router.get('/get-user-media/:authorId/:skip', verifyAuth, UserController.getUserMedia);

//Gets user's followers or following for their profile
Router.get('/get-user-follows/:userId/:skip/:type', verifyAuth, UserController.getUserFollows)




module.exports = Router;