const User = require('../models/user.model');
const Post = require('../models/content-reel/post.model');
const Comment = require('../models/content-reel/comment.model');
const PostLike = require('../models/content-reel/post-like.model');
const CommentLike = require('../models/content-reel/comment-like.model');
const Block = require('../models/content-reel/block.model');
const Report = require('../models/admin/report.model');
const Follow = require('../models/content-reel/follow.model');
const SavedPost = require('../models/content-reel/saved-post.model')

const UserController = {
  //Gets posts for the content reel
  //Second iteration
  getContentReel: async (req, res) => {
  
    const { skip } = req.params;
    const limit = 10;
    const userId = req.user.id;

    // Fetch posts with the author details
    const posts = await Post.find()
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

    const postIds = posts.map(post => post._id);
    const authorIds = posts.map(post => post.author._id);

    // Fetch likes, follows, and blocks in parallel
    const [likes, follows, blocks] = await Promise.all([
      PostLike.find({ post: { $in: postIds }, liker: userId }),
      Follow.find({ user: { $in: authorIds }, follower: userId }),
      Block.find({
        $or: [
          { blocker: userId, blocked: { $in: authorIds } },
          { blocked: userId, blocker: { $in: authorIds } },
        ],
      }),
    ]);

    const likedPostIds = new Set(likes.map(like => like.post.toString()));
    const followedUserIds = new Set(follows.map(follow => follow.user.toString()));
    const blockedUserIds = new Set(
      blocks.map(block =>
        block.blocker.toString() === userId ? block.blocked.toString() : block.blocker.toString()
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
        Post.findByIdAndUpdate(
          processedPost.repostedPost,
          { $inc: { reposts: 1 } },
        )
      ])
    } else {
      await newPost.save();
    }

    return res.status(200).json({
      success: true,
      info: 'Post created',
      message: 'Your post has been created successfully.',
      postId: newPost._id
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
      await Promise.all([
        newComment.save(),
        Post.findByIdAndUpdate(comment.post, { $inc: { comments: 1 } }),
        Comment.findByIdAndUpdate(processedComment.parentComment, { $inc: { replies: 1 } })
      ]);
    }

    await Promise.all([
      newComment.save(),
      Post.findByIdAndUpdate(comment.post, { $inc: { comments: 1 } })
    ]);

    return res.status(200).json({
      success: true,
      info: 'Comment created',
      message: 'Your comment has been created successfully.',
      comment: newComment
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
        Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } }),
        PostLike.deleteOne({ _id: postLike._id })
      ]);

      return res.status(200).json({
        success: true,
        liked: false,
        message: 'Post unliked.'
      });
    } else {
      await Promise.all([
        Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } }),
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
    const follow = await Follow.findOne({ user: authorId, follower: userId }).lean();

    if (follow) {
      await Promise.all([
        User.findByIdAndUpdate(authorId, { $inc: { followers: -1 } }),
        User.findByIdAndUpdate(userId, { $inc: { following: -1 } }),
        Follow.deleteOne({ _id: follow._id })
      ])
      return res.status(200).json({
        success: true,
        isFollowing: false
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(authorId, { $inc: { followers: 1 } }),
      User.findByIdAndUpdate(userId, { $inc: { following: 1 } }),
      Follow.create({ user: authorId, follower: userId })
    ])
    return res.status(200).json({
      success: true,
      isFollowing: true
    });
  },

  //Deletes a post
  deletePost: async (req, res) => {
    const { postId } = req.params;
    //Delete Post
    //Delete comments
    //Delete Post Likes
    //Delete Comment Likes
    //Delete pictures???
    return;
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
    const [ user, isFollowing ] = await Promise.all([
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

      Follow.find({ user: userId, follower: req.user.id })
    ])

    user.isViewingSelf = (userId === req.user.id);
    user.viewerFollowsUser = (isFollowing.length) > 0;

    if (isFollowing.length) user.viewer

    if (!user) {
      return res.status(404).json({
        success: false,
        info: 'Not found',
        message: 'User not found.'
      });
    }

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
}

module.exports = UserController;
