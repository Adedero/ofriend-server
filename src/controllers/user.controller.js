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
    
  },
  
}

module.exports = UserController;