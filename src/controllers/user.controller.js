const User = require('../models/user.model');
const Post = require('../models/content-reel/post.model');
const Comment = require('../models/content-reel/comment.model');
const PostLike = require('../models/content-reel/post-like.model');
const CommentLike = require('../models/content-reel/comment-like.model');
const Block = require('../models/content-reel/block.model');
const Follow = require('../models/content-reel/follow.model');
const SavedPost = require('../models/content-reel/saved-post.model');
const checkParams = require('../utils/check-params');
const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const Subscription = require('../models/content-reel/subscription.model');
const webpush = require('../services/push-notifications');



const UserController = {
  //Gets user full profile
  getFullProfile: async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId, {
      imageUrl: 0,
      bannerImageUrl: 0,
      followers: 0,
      following: 0,
      password: 0
    }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        info: 'User not found',
        message: 'No user with the supplied ID was found.'
      });
    }
    user.isViewingSelf = true;
    return res.status(200).json(user);
  },
  //Gets posts for the content reel
  //Second iteration
  getContentReel: async (req, res) => {
  
    let { skip, limit } = req.params;
    const { products } = req.query;
    checkParams(res, [limit, products ])
    skip = skip ? skip : 0
    const userId = req.user.id;

    // Fetch posts with the author details
    let posts;
    if (products === 'true') {
      posts = await Post.find({ isProduct: true })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate('author', 'name imageUrl')
        .populate({
          path: 'repostedPost',
          populate: {
            path: 'author',
            select: 'name imageUrl'
          }
        })
        .lean();
    } 

    if (products === 'false') {
      posts = await Post.find({ isProduct: false })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate('author', 'name imageUrl')
        .populate({
          path: 'repostedPost',
          populate: {
            path: 'author',
            select: 'name imageUrl'
          }
        })
        .lean();
    }
  
    const postIds = posts.map(post => post._id);
    const authorIds = posts.map(post => post.author._id);

    // Fetch likes, follows, and blocks in parallel
    const [likes, follows, blocks] = await Promise.all([
      PostLike.find({ post: { $in: postIds }, liker: userId }),
      Follow.find({ user: { $in: authorIds }, follower: userId }),
      Block.find({
        $or: [
          { blocker: userId, blockedUser: { $in: authorIds } },
          { blockedUser: userId, blocker: { $in: authorIds } },
        ],
      }),
    ]);

    const likedPostIds = new Set(likes.map(like => like.post.toString()));
    const followedUserIds = new Set(follows.map(follow => follow.user.toString()));
    const blockedUserIds = new Set(
      blocks.map(block =>
        block.blocker.toString() === userId ? block.blockedUser.toString() : block.blocker.toString()
      )
    );

    // Filter posts that are viewable
    const viewablePosts = posts.filter(post => {
      const postAuthorId = post.author._id.toString();
      const postId = post._id.toString();
      const isBlocked = blockedUserIds.has(postAuthorId);
      const isFollowed = followedUserIds.has(postAuthorId);

      const isViewable = !(post.status === 'PRIVATE' ||
        (post.status === 'FOLLOWERS' && !isFollowed) ||
        isBlocked);

      if (isViewable) {
        post.isVisibleToViewer = true;
        post.isLikedByViewer = likedPostIds.has(postId);
        post.viewerFollowsAuthor = isFollowed;
        post.isViewedByAuthor = (userId === post.author._id.toString());
      }

      return isViewable;
    });

    return res.status(200).json(viewablePosts);
    
  },

  //Get users to mention
  getUsersToMention: async (req, res) => {
    const text = req.params.search;
    const { skip, limit } = req.query;
    checkParams(res, [ text, limit ]);

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: req.user._id },
          name: { $regex: text, $options: 'i' }
        }
      },
      {
        $lookup: {
          from: 'blocks',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $eq: ['$blocker', req.user.id] }, { $eq: ['$blockedUser', '$$userId'] }] },
                    { $and: [{ $eq: ['$blocker', '$$userId'] }, { $eq: ['$blockedUser', req.user.id] }] }
                  ]
                }
              }
            }
          ],
          as: 'blockInfo'
        }
      },
      {
        $match: {
          'blockInfo.0': { $exists: false } 
        }
      },
      {
        $skip: Number(skip)
      },
      {
        $limit: Number(limit)
      },
      {
        $project: {
          _id: 1,
          name: 1,
          imageUrl: 1
        }
      }
    ]);

    return res.status(200).json(users);
  },

  //Gets 3 followers and 3 following for the home page
  getFollowersAndFollowing: async (req, res) => {
    const userId = req.user.id;
    const [ followers, following ] = await Promise.all([
      Follow.find({ user: userId }, { follower: 1 })
        .limit(3)
        .populate('follower', 'name imageUrl bio')
        .lean(),
      Follow.find({ follower: userId }, { user: 1 })
        .limit(3)
        .populate('user', 'name imageUrl bio')
        .lean()
    ]);
    return res.status(200).json({
      success: true,
      followers,
      following
    });
  },

  //Create Post
  createPost: async (req, res) => {
    const post = req.body;
    if (!post) {
      return res.status(400).json({
        success: false,
        info: 'Failed to create post',
        message: 'Your post cannot be empty.'
      });
    }
    const user = req.user;
    const processedPost = {
      author: user.id,
      ...post
    }

    const newPost = new Post(processedPost);

    if (processedPost.isReposting && processedPost.repostedPost) {
      await Promise.all([
        newPost.save(),
        Post.updateOne({ _id: processedPost.repostedPost }, { $inc: { reposts: 1 } })
      ])
    } else {
      await newPost.save();
    }

    return res.status(200).json({
      success: true,
      info: 'Post created',
      message: 'Your post has been created successfully.',
      post: newPost
    });
  },

  //Edit podt
  editPost: async (req, res) => {
    const { postId } = req.params;
    const { edit } = req.body
    checkParams(res, [postId, edit]);
    await Post.updateOne({ _id: postId }, { $set: edit });
    return res.status(200).json({
      success: true,
      info: 'Post edited',
      message: 'Post edited successfully'
    })
    
  },

  //Deletes a post
  deletePost: async (req, res) => {
    const { postId } = req.params;
    const { repostedPost } = req.query;
    checkParams(res, [postId]);
    const BATCH_SIZE = 100;

    let commentIds = [];
    let lastId = null;

    while (true) {
      const query = lastId ? { post: postId, _id: { $gt: lastId } } : { post: postId };
      const comments = await Comment.find(query, { _id: 1 }).limit(BATCH_SIZE).sort({ _id: 1 });

      if (comments.length === 0) {
        break;
      }

      commentIds = commentIds.concat(comments.map(comment => comment._id));
      lastId = comments[comments.length - 1]._id;
    }

    if (repostedPost) {
      await Promise.all([
        Post.deleteOne({ _id: postId }),
        Post.updateOne({ _id: repostedPost }, { $inc: { reposts: -1 } }),
        Comment.deleteMany({ post: postId }),
        PostLike.deleteMany({ post: postId }),
      ]);
    } else {
      await Promise.all([
        Post.deleteOne({ _id: postId }),
        Comment.deleteMany({ post: postId }),
        PostLike.deleteMany({ post: postId }),
      ]);
    }

    let totalDeletedCommentLikes = 0;
    while (commentIds.length > 0) {
      const batch = commentIds.splice(0, BATCH_SIZE);
      const commentLikeResult = await CommentLike.deleteMany({ comment: { $in: batch } });
      totalDeletedCommentLikes += commentLikeResult.deletedCount;
    }
    return res.status(200).json({
      success: true,
      info: 'Post deleted',
      message: 'Post deleted successfully',
    });
  },


  //Gets a post
  getPost: async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'Failed to get post. Post ID is required'
      });
    }

    let postQuery = Post.findById(postId)
      .populate('author', 'name imageUrl')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'author',
          select: 'name imageUrl'
        }
      })
      .lean();

    const post = await postQuery;

    if (!post) {
      return res.status(404).json({
        success: false,
        info: 'Not found',
        deleted: true,
        message: 'This post has been deleted'
      });
    }

    const [likes, follows, blocks] = await Promise.all([
      PostLike.find({ post: post._id, liker: userId }),
      Follow.find({ user: post.author._id, follower: userId }),
      Block.find({
        $or: [
          { blocker: userId, blockedUser: post.author._id },
          { blockedUser: userId, blocker: post.author._id }
        ]
      })
    ]);

    const isAuthor = userId === post.author._id.toString();
    const isLiked = likes.length > 0;
    const isFollowed = follows.length > 0;
    const isBlocked = blocks.length > 0;

    post.isViewedByAuthor = isAuthor;
    post.isLikedByViewer = isLiked;
    post.viewerFollowsAuthor = isFollowed;

    if (isBlocked || post.status === 'PRIVATE' || (post.status === 'FOLLOWERS' && !isFollowed)) {
      return res.status(403).json({
        success: false,
        info: 'Forbidden',
        message: 'You are not allowed to view this post'
      });
    }

    post.isVisibleToViewer = true;

    return res.status(200).json({
      success: true,
      post
    });
  },

  //Creates comment
  createComment: async (req, res) => {
    const comment = req.body;
    if (!comment) {
      return res.status(400).json({
        success: false,
        info: 'Failed to create comment',
        message: 'Your comment cannot be empty.'
      });
    }
    const user = req.user;
    const postAuthorId = comment.postAuthor;
    const commentAuthorId = user.id;

    const processedComment = {
      author: user.id,
      ...comment
    }

    const newComment = new Comment(processedComment);

    if (processedComment.isReply) {
      if (!processedComment.parentComment) {
        return res.status(400).json({
          success: false,
          info: 'Failed to create comment',
          message: 'Must provide a parent comment for this reply'
        });
      }

      const userToAlert = await User.findById(postAuthorId, { subscription: 1 }).lean();
      const sub = userToAlert.subscription;

      const payload = {
        title: 'Replies',
        body: `${user.name} replied to your comment on a post.`,
        url: `/app/post/${comment.post}`
      }
      await Promise.all([
        newComment.save(),
        Post.updateOne({ _id: comment.post }, { $inc: { comments: 1 } }),
        Comment.updateOne({ _id: processedComment.parentComment }, { $inc: { replies: 1 } }),
        sub && webpush.sendNotification(sub, JSON.stringify(payload))
      ]);

      await Notification.create({
        user: commentAuthorId,
        fromUser: user.id,
        type: 'reply',
        isRead: false,
        post: comment.post,
        comment: newComment._id,
        link: `app/post/${comment.post}`,
        description: `${user.name} replied to your comment on a post.`
      });

      return res.status(200).json({
        success: true,
        info: 'Comment created',
        message: 'Your comment has been created successfully.',
        comment: newComment
      });
    }

    const userToAlert = await User.findById(postAuthorId, { subscription: 1 }).lean();
    const sub = userToAlert.subscription;

    const payload = {
      title: 'Comments',
      body: `${user.name} commented on your post.`,
      url: `/app/post/${comment.post}`
    }

    await Promise.all([
      newComment.save(),
      Post.updateOne({ _id: comment.post }, { $inc: { comments: 1 } }),
      sub && webpush.sendNotification(sub, JSON.stringify(payload))
    ]);

    await Notification.create({
      user: postAuthorId,
      fromUser: user.id,
      type: 'comment',
      isRead: false,
      post: comment.post,
      comment: newComment._id,
      description: payload.body,
      link: payload.url
    });

    return res.status(200).json({
      success: true,
      info: 'Comment created',
      message: 'Your comment has been created successfully.',
      comment: newComment
    });
  },

  //Edit comment
  editComment: async (req, res) => {
    const { commentId } = req.params;
    const { edit } = req.body
    checkParams(res, [commentId, edit]);
    await Comment.updateOne({ _id: commentId }, { $set: edit });
    return res.status(200).json({
      success: true,
      info: 'Comment edited',
      message: 'Comment edited successfully'
    })
  },

  //Delete comment
  deleteComment: async (req, res) => {
    let { commentId, postId } = req.params;
    const { parent } = req.query;
  
    checkParams(res, [commentId, postId]);

    commentId = mongoose.Types.ObjectId.createFromHexString(commentId);

    const BATCH_SIZE = 100;

    //Delete replies of comment if it has any
    let replyIds = [];
    let lastId = null;

    while (true) {
      const query = lastId ? { parentComment: commentId, _id: { $gt: lastId } } : { parentComment: commentId };
      const replies = await Comment.find(query, { _id: 1 }).limit(BATCH_SIZE).sort({ _id: 1 });

      if (replies.length === 0) {
        break;
      }

      replyIds = replyIds.concat(replies.map(reply => reply._id));
      lastId = replies[replies.length - 1]._id;
    }

    if (mongoose.Types.ObjectId.isValid(parent)) {
      await Promise.all([
        Comment.deleteOne({ _id: commentId }),
        Comment.updateOne({ _id: parent }, { $inc: { replies: -1 } }),
        Comment.deleteMany({ parentComment: commentId }),
        CommentLike.deleteMany({ comment: commentId }),
        Post.updateOne({ _id: postId }, { $inc: { comments: -1 } })
      ]);
    } else {
      await Promise.all([
        Comment.deleteOne({ _id: commentId }),
        Comment.deleteMany({ parentComment: commentId }),
        CommentLike.deleteMany({ comment: commentId }),
        Post.updateOne({ _id: postId }, { $inc: { comments: -1 } })
      ]);
    }

    let totalDeletedReplyLikes = 0;
    while (replyIds.length > 0) {
      const batch = replyIds.splice(0, BATCH_SIZE);
      const replyLikeResult = await CommentLike.deleteMany({ comment: { $in: batch } });
      totalDeletedReplyLikes += replyLikeResult.deletedCount;
    }
    return res.status(200).json({
      success: true,
      info: 'Comment deleted',
      message: 'Comment deleted successfully',
    });
  },
  //Gets comments
  getComments: async (req, res) => {
    const { postId } = req.params;
    if (!postId) {
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Failed to get post. Post ID is required'
      });
    }

    const { skip, limit } = req.query;
    const limitInt = parseInt(limit, 10);
    const skipInt = parseInt(skip, 10);

    if (isNaN(skipInt) || isNaN(limitInt) || limitInt > 5) {
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Invalid request query parameters or request exceeds limit.'
      });
    }

    const comments = await Comment.find({ post: postId, isReply: false })
      .sort({ updatedAt: -1 })
      .populate('author', 'name imageUrl')
      .skip(skipInt)
      .limit(limitInt)
      .lean();

    const commentIds = comments.map(comment => comment._id);

    const commentLikes = await CommentLike.find({
      liker: req.user.id,
      comment: { $in: commentIds }
    }).lean();

    const likedCommentsSet = new Set(commentLikes.map(like => like.comment.toString()));

    comments.forEach(comment => {
      comment.isLikedByViewer = likedCommentsSet.has(comment._id.toString());
    });

    return res.status(200).json({
      success: true,
      comments
    });
  },
  
  //Gets replies
  getReplies: async (req, res) => {
    const { postId, commentId } = req.params;
    if (!postId || !commentId) {
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Failed to get repliees. Post and Comment IDs are required'
      });
    }

    const { skip, limit } = req.query;
    const limitInt = parseInt(limit, 10);
    const skipInt = parseInt(skip, 10);

    if (isNaN(skipInt) || isNaN(limitInt) || limitInt > 5) {
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Invalid request query parameters or request exceeds limit.'
      });
    }

    const replies = await Comment.find({ post: postId, isReply: true, parentComment: commentId })
      .sort({ createdAt: 1 })
      .populate('author', 'name imageUrl')
      .skip(skipInt)
      .limit(limitInt)
      .lean();

    const replyIds = replies.map(reply => reply._id);

    const replyLikes = await CommentLike.find({
      liker: req.user.id,
      comment: { $in: replyIds }
    }).lean();

    const likedRepliesSet = new Set(replyLikes.map(like => like.comment.toString()));

    replies.forEach(reply => {
      reply.isLikedByViewer = likedRepliesSet.has(reply._id.toString());
    });

    return res.status(200).json({
      success: true,
      replies
    });
  },

  //Likes and unlikes a post
  togglePostLike: async (req, res) => {
    const { postId } = req.params;
    if (!postId) {
      return res.status(401).json({
        success: false,
        info: 'Failed',
        message: 'No post ID provided.'
      });
    }
    const postLike = await PostLike.findOne({ liker: req.user.id, post: postId });

    if (postLike) {
      await Promise.all([
        Post.updateOne({ _id: postId }, { $inc: { likes: -1 } }),
        PostLike.deleteOne({ _id: postLike._id })
      ]);

      return res.status(200).json({
        success: true,
        liked: false,
        message: 'Post unliked.'
      });
    } else {
      await Promise.all([
        Post.updateOne({ _id: postId }, { $inc: { likes: 1 } }),
        PostLike.create({
          liker: req.user.id,
          post: postId
        })
      ]);

      return res.status(200).json({
        success: true,
        liked: true,
        message: 'Post liked.'
      });
    }
  },

  //Likes and unlikes a comment
  toggleCommentLike: async (req, res) => {
    const { commentId } = req.params;
    if (!commentId) {
      return res.status(401).json({
        success: false,
        info: 'Failed',
        message: 'No post ID provided.'
      });
    }
    const commentLike = await CommentLike.findOne({ liker: req.user.id, comment: commentId });

    if (commentLike) {
      await Promise.all([
        Comment.findByIdAndUpdate(commentId, { $inc: { likes: -1 } }),
        CommentLike.deleteOne({ _id: commentLike._id })
      ]);

      return res.status(200).json({
        success: true,
        liked: false,
        message: 'Comment unliked.'
      });
    } else {
      await Promise.all([
        Comment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } }),
        CommentLike.create({
          liker: req.user.id,
          comment: commentId
        })
      ]);

      return res.status(200).json({
        success: true,
        liked: true,
        message: 'Comment liked.'
      });
    }
  },

  //See people who have liked a post
  getPostLikers: async (req, res) => {
    if (!req.params) return;
    const { postId, skip, limit } = req.params;
    const skipInt = parseInt(skip);
    const limitInt = parseInt(limit);
    if (limit > 20) {
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Invalid request query parameters or request exceeds limit.'
      });
    }
    const postLikes = await PostLike.find({ post: postId }, { liker: 1 })
      .skip(skipInt)
      .limit(limitInt)
      .populate('liker', 'name imageUrl')
      .lean();

    return res.status(200).json({
      success: true,
      likers: postLikes
    });
  },

  //Check if a user has saved a post
  getPostSaveStatus: async (req, res) => {
    const { postId } = req.params;
    if (!postId) {
      return res.status(404).json({
        success: false,
        info: 'Post not found'
      })
    }
  
    const savedPost = SavedPost.find({
      user: req.user.id,
      post: postId
    }).lean();
    const isSaved = savedPost.length ? true : false;
    return res.status(200).json({
      success: true,
      isSaved
    })
  },

  //Saves or unsaves a post
  togglePostSave: async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;
    const savedPost = await SavedPost.findOne({ user: userId, post: postId });

    if (savedPost) {
      await SavedPost.deleteOne({ _id: savedPost._id });
      return res.status(200).json({
        success: true,
        isSaved: false
      });
    }

    await SavedPost.create({ user: userId, post: postId });
    return res.status(200).json({
      success: true,
      isSaved: true
    });
  },

  //follows or unfollows a user
  toggleUserFollow: async (req, res) => {
    const { authorId } = req.params;
    const userId = req.user.id;

    const [follow, subscription] = await Promise.all([
      Follow.findOne({ user: authorId, follower: userId }).lean(),
      Subscription.findOne({ user: authorId, subscriber: userId }).lean()
    ]);

    if (follow) {
      await Promise.all([
        User.updateOne({ _id: authorId }, { $inc: { followers: -1, subscribers: -1 } }),
        User.updateOne({ _id: userId }, { $inc: { following: -1 } }),
        Follow.deleteOne({ _id: follow._id }),
        subscription && Subscription.deleteOne({ _id: subscription._id })
      ])
      return res.status(200).json({
        success: true,
        isFollowing: false
      });
    }

    await Promise.all([
      User.updateOne({ _id: authorId }, { $inc: { followers: 1 } }),
      User.updateOne({ _id: userId }, { $inc: { following: 1 } }),
      Follow.create({ user: authorId, follower: userId })
    ])
    return res.status(200).json({
      success: true,
      isFollowing: true
    });
  },

  //Subscribes or unsubscribes from a user
  toggleUserSubscribe: async (req, res) => {
    const { authorId } = req.params;
    const userId = req.user.id;
    const sub = await Subscription.findOne({ user: authorId, subscriber: userId }).lean();

    if (sub) {
      await Promise.all([
        User.updateOne({ _id: authorId }, { $inc: { subscribers: -1 } }),
        Subscription.deleteOne({ _id: sub._id })
      ])
      return res.status(200).json({
        success: true,
        isSubscribed: false
      });
    }

    await Promise.all([
      User.updateOne({ _id: authorId }, { $inc: { subscribers: 1 } }),
      Subscription.create({ user: authorId, subscriber: userId })
    ])
    return res.status(200).json({
      success: true,
      isSubscribed: true
    });
  },

  //Gets lists of subscriptions
  getSubcriptions: async (req, res) => {
    const { skip, type } = req.query;
    const skipInt = parseInt(skip, 10);
    const limit = 10;

    if (type === 'subscribers') {
      const subscriptions = await Subscription.find(
        { user: req.user.id }, { subscriber: 1 })
        .skip(skipInt)
        .limit(limit)
        .populate({ path: 'subscriber', select: 'name imageUrl' })
        .lean();

      const subscribers = subscriptions.map(sub => {
        return {
          subId: sub._id,
          id: sub.subscriber._id,
          name: sub.subscriber.name,
          imageUrl: sub.subscriber.imageUrl
        }
      });

      return res.status(200).json(subscribers);
    }

    if (type === 'subscribedTo') {
      const subscriptions = await Subscription.find(
        { subscriber: req.user.id }, { user: 1 })
        .skip(skipInt)
        .limit(limit)
        .populate({ path: 'user', select: 'name imageUrl' })
        .lean();

      const subscribedToUsers = subscriptions.map(sub => {
        return {
          subId: sub._id,
          id: sub.user._id,
          name: sub.user.name,
          imageUrl: sub.user.imageUrl
        }
      });

      return res.status(200).json(subscribedToUsers);
    }
  },

  //Delete subscription
  deleteSubscription: async (req, res) => {
    const { subId, userId } = req.params;
    checkParams(res, [subId, userId]);

    await Promise.all([
      User.updateOne({ _id: userId }, { $inc: { subscribers: -1 } }),
      Subscription.deleteOne({ _id: subId })
    ]);

    return res.status(200).json({
      success: true,
      isSubscribed: false
    });
  },

  //Get saved posts
  getSavedPosts: async (req, res) => {
    const { skip } = req.query;
    const skipInt = parseInt(skip, 10);
    const savedPosts = await SavedPost.find(
      { user: req.user.id }, { post: 1, createdAt: 1 })
      .skip(skipInt)
      .limit(8)
      .populate({
        path: 'post',
        select: 'hasText textContent hasMedia media isReposting',
        populate: {
          path: 'author',
          select: 'name imageUrl'
        }
      });

    return res.status(200).json({
      success: true,
      savedPosts
    });
  },

  //Gets user profile
  getUserProfile: async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No user ID provided.'
      });
    }
    if (userId === req.user.id.toString()) {
      const user = await User.findById(userId, {
        name: 1,
        isOrg: 1,
        country: 1,
        region: 1,
        imageUrl: 1,
        bannerImageUrl: 1,
        bio: 1,
        following: 1,
        followers: 1,
        createdAt: 1,
        isViewingSelf: 1
      }).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          info: 'Not found',
          message: 'User not found.'
        });
      }

      user.isViewingSelf = true;
      user.viewerFollowsUser = false;
      user.viewerIsSubscribedToUser = false;

      return res.status(200).json(user);
    }

    const blocks = await Block.find({
      $or: [
        { blocker: req.user.id, blockedUser: userId },
        { blocker: userId, blockedUser: req.user.id }
      ]
    });

    if (blocks.length) {
      return res.status(403).json({
        success: false,
        info: 'Forbidden',
        message: 'You are not allowed to view this profile.'
      });
    }
    const [ user, isFollowing, isSubscribed ] = await Promise.all([
      User.findById(userId, {
        name: 1,
        isOrg: 1,
        country: 1,
        region: 1,
        imageUrl: 1,
        bannerImageUrl: 1,
        bio: 1,
        following: 1,
        followers: 1,
        createdAt: 1,
        isViewingSelf: 1
      }).lean(),

      Follow.find({ user: userId, follower: req.user.id }),
      Subscription.find({ user: userId, subscriber: req.user.id })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        info: 'Not found',
        message: 'User not found.'
      });
    }

    user.isViewingSelf = false;
    user.viewerFollowsUser = (isFollowing.length > 0);
    user.viewerIsSubscribedToUser = (isSubscribed.length > 0);

    return res.status(200).json(user);
  },

  //Update bio
  updateBio: async (req, res) => {
    const { bio } = req.body
    await User.findByIdAndUpdate(req.user.id, { $set: { bio: bio } });
    return res.status(200).json({
      success: true,
      message: 'Bio successfully changed'
    });
  },

  removeBio: async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { $set: { bio: '' } });
    return res.status(200).json({
      success: true,
      message: 'Bio successfully removed'
    });
  },

  //Update profile image URL
  updateProfileImage: async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No image URL provided.'
      });
    }

    await User.findByIdAndUpdate(req.user.id, { $set: { imageUrl: imageUrl } });
    return res.status(200).json({
      success: true,
      message: 'Profile image successfully changed'
    });
  },

  //Update banner image URL
  updateBannerImage: async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No image URL provided.'
      });
    }

    await User.findByIdAndUpdate(req.user.id, { $set: { bannerImageUrl: imageUrl } });
    return res.status(200).json({
      success: true,
      message: 'Banner image successfully changed'
    });
  },

  getUserPosts: async (req, res) => {
    const { authorId, skip } = req.params;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No user ID provided.'
      });
    }
    const SKIP = parseInt(skip, 10);
    const LIMIT = 8
    const userId = req.user.id;

    if (authorId === userId) {
      const userPosts = await Post.find({
        author: authorId
      }).skip(SKIP)
        .limit(LIMIT)
        .populate('author', 'name imageUrl')
        .populate({
          path: 'repostedPost',
          populate: {
            path: 'author',
            select: 'name imageUrl'
          }
        })
        .lean();

      const postIds = userPosts.map(post => post._id);

      const likes = await PostLike.find({ post: { $in: postIds }, liker: userId });

      const likedPostIds = new Set(likes.map(like => like.post.toString()));

      userPosts.forEach(post => {
        const postId = post._id.toString();
        post.isLikedByViewer = likedPostIds.has(postId);
        post.viewerFollowsAuthor = false;
        post.isViewedByAuthor = true;
      });

      return res.status(200).json(userPosts);
    }

    // Fetch posts with the author details
    const posts = await Post.find({
      author: authorId
    }).skip(SKIP)
      .limit(LIMIT)
      .populate('author', 'name imageUrl')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'author',
          select: 'name imageUrl'
        }
      })
      .lean();

    const postIds = posts.map(post => post._id);

    // Fetch likes, follows, and blocks in parallel
    const [likes, follows] = await Promise.all([
      PostLike.find({ post: { $in: postIds }, liker: userId }),
      Follow.find({ user: authorId, follower: userId }),
    ]);

    const likedPostIds = new Set(likes.map(like => like.post.toString()));
    
    posts.forEach(post => {
      const postId = post._id.toString();
      post.isLikedByViewer = likedPostIds.has(postId);
      post.viewerFollowsAuthor = follows.length > 0;
      post.isViewedByAuthor = (userId === authorId);
    });
    // Filter posts that are viewable
    const userPosts = posts.filter(post => {
      const postId = post._id.toString();
      const isFollowed = follows.length > 0;

      const isViewable = !(post.status === 'PRIVATE' ||
        (post.status === 'FOLLOWERS' && !isFollowed));

      if (isViewable) {
        post.isVisibleToViewer = true;
        post.isLikedByViewer = likedPostIds.has(postId);
        post.viewerFollowsAuthor = isFollowed;
        post.isViewedByAuthor = false;
      }

      return isViewable;
    });

    return res.status(200).json(userPosts);
  },

  getUserMedia: async (req, res) => {
    const { authorId, skip } = req.params;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No user ID provided.'
      });
    }
    const SKIP = parseInt(skip, 10);
    const LIMIT = 10
    const userId = req.user.id;

    if (authorId === userId) {
      const posts = await Post.find(
        {
          author: authorId,
          hasMedia: true
        },
        { media: 1 })
        .skip(SKIP)
        .limit(LIMIT)
        .lean();

      const media = posts.flatMap(post =>
        post.media.map((mediaItem, index) => ({
          url: mediaItem.url,
          type: mediaItem.type,
          postId: post._id.toString()
        }))
      );
      return res.status(200).json(media);
    }

    const posts = await Post.find({
      author: authorId,
      hasMedia: true
    }, { media: 1 })
      .skip(SKIP)
      .limit(LIMIT)
      .lean();

    const follows = await Follow.find({ user: authorId, follower: userId })

    // Filter posts that are viewable
    const viewablePosts = posts.filter(post => {
      const postId = post._id.toString();
      const isFollowed = follows.length > 0;
      const isViewable = !(post.status === 'PRIVATE' ||
        (post.status === 'FOLLOWERS' && !isFollowed));
      return isViewable;
    });

    const media = viewablePosts.flatMap(post =>
      post.media.map((mediaItem, index) => ({
        url: mediaItem.url,
        type: mediaItem.type,
        postId: post._id.toString()
      }))
    );
    return res.status(200).json(media); 
  },

  getUserFollows: async (req, res) => {
    const { userId, skip, type } = req.params;
    if (!userId || !type) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No user ID or type provided.'
      });
    } 
    const SKIP = parseInt(skip);
    const LIMIT = 10;

    if (type === 'followers') {
      const follows = await Follow.find({ user: userId })
        .populate('follower', 'name imageUrl')
        .skip(SKIP)
        .limit(LIMIT)
        .lean();

      const followers = follows.map(follow => {
        return {
          id: follow.follower._id,
          name: follow.follower.name,
          imageUrl: follow.follower.imageUrl
        }
      });
      
      return res.status(200).json(followers);
    }

    if (type === 'following') {
      const follows = await Follow.find({ follower: userId })
        .populate('user', 'name imageUrl')
        .skip(SKIP)
        .limit(LIMIT)
        .lean();

      const following = follows.map(follow => {
        return {
          id: follow.user._id,
          name: follow.user.name,
          imageUrl: follow.user.imageUrl
        }
      });

      return res.status(200).json(following);
    }

    return res.status(400).json({
      success: false,
      info: 'Bad request',
      message: 'Invalid type provided.'
    });
  },

  searchFollowing: async (req, res) => {
    const { userId, search, type, skip } = req.query;
    if (!userId || !search || !type || !skip ) {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'No user ID, search query, or type provided.'
      });
    }
    const SKIP = parseInt(skip, 10);
    const LIMIT = 10;

    let follows;
    // Handle followers type
    if (type === 'followers') {
      follows = await Follow.find({
        user: userId
      }, { follower: 1 })
        .skip(SKIP)
        .limit(LIMIT)
        .populate({
          path: 'follower',
          select: 'name imageUrl',
          match: { name: new RegExp(search, 'i') }  // Case-insensitive search
        })
        .lean();
    }

    // Handle following type
    else if (type === 'following') {
      follows = await Follow.find({
        follower: userId
      },{ user: 1 })
        .skip(SKIP)
        .limit(LIMIT)
        .populate({
          path: 'user',
          select: 'name imageUrl',
          match: { name: new RegExp(search, 'i') }  // Case-insensitive search
        })
        .lean();
    } else {
      return res.status(400).json({
        success: false,
        info: 'Bad request',
        message: 'Invalid type provided. Must be "followers" or "following".'
      });
    }

    follows = follows.filter(follow => follow[type === 'followers' ? 'follower' : 'user'] !== null);

    return res.status(200).json(follows);
  },

  getNotifications: async (req, res) => {
    const userId = req.user.id;
    const { skip, limit } = req.query;

    const [, notifications] = await Promise.all([
      Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      ),

      Notification.find({ user: userId })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', 'name imageUrl')
        .lean()
    ]);
    
    return res.status(200).json(notifications);
  },

  clearAllNotifications: async (req, res) => {
    await Notification.deleteMany({ user: req.user.id });
    return res.status(200).json({ success: true, message: 'All notifications cleared.' });
  },

  deleteNotification: async (req, res) => {
    const { id } = req.params;
    checkParams(res, [id]);

    await Notification.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  }
}

module.exports = UserController;
