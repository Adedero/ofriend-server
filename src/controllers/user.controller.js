const User = require('../models/user.model');
const Post = require('../models/content-reel/post.model');
const Comment = require('../models/content-reel/comment.model');
const PostLike = require('../models/content-reel/post-like.model');
const CommentLike = require('../models/content-reel/comment-like.model');
const Block = require('../models/content-reel/block.model');
const Report = require('../models/content-reel/report.model');
const Follow = require('../models/content-reel/follow.model');

const UserController = {
  //Gets posts for the content reel
  //Second iteration
  getContentReel: async (req, res) => {
    const { skip = 0 } = req.params;
    const limit = 10;

    // Fetch posts with the author details
    const posts = await Post.find()
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('author', 'name imageUrl')
      .lean();

    const postIds = posts.map(post => post._id);
    const authorIds = posts.map(post => post.author._id);

    // Fetch likes, follows, and blocks in parallel
    const [likes, follows, blocks] = await Promise.all([
      PostLike.find({ post: { $in: postIds }, liker: req.user.id }),
      Follow.find({ user: { $in: authorIds }, follower: req.user.id }),
      Block.find({
        $or: [
          { blocker: req.user.id, blocked: { $in: authorIds } },
          { blocked: req.user.id, blocker: { $in: authorIds } },
        ],
      }),
    ]);

    const likedPostIds = new Set(likes.map(like => like.post.toString()));
    const followedUserIds = new Set(follows.map(follow => follow.user.toString()));
    const blockedUserIds = new Set(
      blocks.map(block =>
        block.blocker.toString() === req.user.id ? block.blocked.toString() : block.blocker.toString()
      )
    );

    const viewablePosts = posts.map(post => {
      const isBlocked = blockedUserIds.has(post.author._id.toString());
      const isLiked = likedPostIds.has(post._id.toString());
      const isFollowed = followedUserIds.has(post.author._id.toString());

      if (post.status === 'PRIVATE' || (post.status === 'FOLLOWERS' && !isFollowed) || isBlocked) {
        post.isVisibleToViewer = false;
      } else {
        post.isVisibleToViewer = true;
      }

      post.isLikedByViewer = isLiked;

      return post;
    });

    return res.status(200).json(viewablePosts);
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
      return res.status(401).json({
        success: false,
        info: 'Bad request',
        message: 'Failed to get post. Post ID is required'
      });
    }

    //Check if viewer of post is author
    //Check if viewer likes post

    //Check if post can be seen by viewer if
    //Post is public or viewer follows author and post status === 'FOLLOWERS'
    //Post is private (cannot be viewed)
    //Check if viewer is blocked by author
    //Check if post is private
    //Check if post has been reported by viewer
    const post = await Post.findById(postId)
      .populate('author', 'name imageUrl')
      .lean();

    if (req.user.id === post.author._id) {
      post.isViewedByAuthor = true;
    }

    // Fetch likes, follows, and blocks in parallel
    const [likes, follows, blocks] = await Promise.all([
      PostLike.find({ post: post._id, liker: userId }),
      Follow.find({ user: post.author._id, follower: userId }),
      Block.find({
        $or: [
          { blocker: userId, blockedUser: post.author._id },
          { blockedUser: userId, blocker: post.author._id },
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

    const isBlocked = blockedUserIds.has(post.author._id.toString());
    const isLiked = likedPostIds.has(post._id.toString());
    const isFollowed = followedUserIds.has(post.author._id.toString());

    if (post.status === 'PRIVATE' || (post.status === 'FOLLOWERS' && !isFollowed) || isBlocked) {
      post.isVisibleToViewer = false;
    } else {
      post.isVisibleToViewer = true;
    }
    post.isLikedByViewer = isLiked;
    //console.log(post);
    if (!post.isVisibleToViewer) {
      return res.status(404).json({
        success: false,
        info: 'Not found.',
        message: 'You are not allowed to view this post'
      });
    }
    return res.status(200).json({
      success: true,
      post
    })
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
      .sort({ updatedAt: -1 })
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
}

module.exports = UserController;