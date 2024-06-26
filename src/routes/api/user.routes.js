const express = require('express');
const Router = express.Router();
const verifyAuth = require('../../middleware/check-auth');
const UserController = require('../../controllers/user.controller');
const ProfileController = require('../../controllers/user-profile.controller');
const ChatController = require('../../controllers/chat.controller');

//Gets full profile
Router.get('/get-full-profile', verifyAuth, UserController.getFullProfile);
//Gets posts for the content reel
Router.get('/content-reel/:skip', verifyAuth, UserController.getContentReel);

//Gets followers and following for the sidebar in the home page
Router.get('/followers-and-following', verifyAuth, UserController.getFollowersAndFollowing);

//Creates a post
Router.post('/create-post', verifyAuth, UserController.createPost);

//Edit post
Router.put('/edit-post/:postId', verifyAuth, UserController.editPost);

//delete a post
Router.delete('/delete-post/:postId', verifyAuth, UserController.deletePost);

//Gets a post to view
Router.get('/get-post/:postId', verifyAuth, UserController.getPost);

//Loads comments
Router.get('/get-comments/:postId', verifyAuth, UserController.getComments);

//Creates a comment or reply to a comment
//Updates comments count on the target post
Router.post('/create-comment', verifyAuth, UserController.createComment);

//Edit comment
Router.put('/edit-comment/:commentId', verifyAuth, UserController.editComment);

//Delete comment
Router.delete('/delete-comment/:commentId/:postId', verifyAuth, UserController.deleteComment);

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

//Subscribes or unsubscribes from a user
Router.put('/toggle-user-subscribe/:authorId', verifyAuth, UserController.toggleUserSubscribe);

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
Router.get('/get-user-follows/:userId/:skip/:type', verifyAuth, UserController.getUserFollows);

//Search for followers or following
Router.get('/search-following', verifyAuth, UserController.searchFollowing);

//Change name
Router.put('/change-name', verifyAuth, ProfileController.changeName);

//Change email
Router.put('/change-email', verifyAuth, ProfileController.changeEmail);

//Change birthday
Router.put('/change-birthday', verifyAuth, ProfileController.changeBirthday);

//Change gender
Router.put('/change-gender', verifyAuth, ProfileController.changeGender);

//Change country and region
Router.put('/change-country-and-region', verifyAuth, ProfileController.changeCountryAndRegion);

//Change address
Router.put('/change-address', verifyAuth, ProfileController.changeAddress);

//Change business description
Router.put('/change-business-description', verifyAuth, ProfileController.changeBusinessDescription);

//View blocked users
Router.get('/view-blocked-users', verifyAuth, ProfileController.getBlockedUsers);

//block user
Router.post('/block-user/:userId', verifyAuth, ProfileController.blockUser);

//unblock user
Router.post('/unblock-user/:userId', verifyAuth, ProfileController.unblockUser);

//Change password
Router.put('/change-password', verifyAuth, ProfileController.changePassword)

//Delete account
Router.delete('/delete-account', verifyAuth, ProfileController.deleteAccount);

//CHAT FUNCTIONALITIES
Router.post('/initialize-chat', verifyAuth, ChatController.initializeChat);

//Get chats
Router.get('/get-chats', verifyAuth, ChatController.getChats);

//Get messages 
Router.get('/get-messages/:chatId', verifyAuth, ChatController.getMessages);

//Send message
Router.post('/send-message', verifyAuth, ChatController.sendMessage);

//Delete message
Router.put('/delete-message/:id', verifyAuth, ChatController.deleteMessage);

//Edit message
Router.put('/edit-message/:id', verifyAuth, ChatController.editMessage);

//Clear messages
Router.delete('/clear-messages/:chatId', verifyAuth, ChatController.clearMessages);

//Delete chat
Router.delete('/delete-conversation/:chatId', verifyAuth, ChatController.deleteConversation);





module.exports = Router;