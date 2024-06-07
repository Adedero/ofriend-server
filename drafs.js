/*
  
getContentReel: async(req, res) => {
    const posts = await Post.find()
    .skip(req.params.skip)
    .limit(req.params.limit)
    .populate('author', 'name imageUrl')
    .lean();

    const viewablePosts = [];
    const length = posts.length

    for (let i = 0; i < length; i++) {
      const [block, like, follow] = await Promise.all([
        Block.findOne({
          $or: [
            {
              blocker: req.user.id,
              blocked: posts[i].author
            },
            {
              blocked: posts[i].author,
              blocker: req.user.id
            }
          ]
        }),
        PostLike.findOne({
          post: posts[i]._id,
          liker: req.user.id
        }),
        Follow.findOne({
          user: posts[i].author,
          follower: req.user.id
        })
      ]);
      if (
        posts[i].status === 'PRIVATE' ||
        (posts[i].status === 'FOLLOWERS' && !follow) ||
        block
      ) {
        posts[i].isVisibleToViewer = false;
      }

      if (like) {
        posts[i].isLikedByViewer = true;
      }
    }
    return res.status(200).json(posts);
  },


*/

/* 
getContentReel: async (req, res) => {
    try {
      const { skip = 0, limit = 10 } = req.params;
      const userId = req.user.id;

      const posts = await Post.aggregate([
        { $skip: Number(skip) },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorDetails'
          }
        },
        { $unwind: '$authorDetails' },
        {
          $lookup: {
            from: 'postlikes',
            let: { postId: '$_id' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$post', '$$postId'] }, { $eq: ['$liker', userId] }] } } },
              { $project: { _id: 0, post: 1 } }
            ],
            as: 'likes'
          }
        },
        {
          $lookup: {
            from: 'follows',
            let: { authorId: '$authorDetails._id' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$user', '$$authorId'] }, { $eq: ['$follower', userId] }] } } },
              { $project: { _id: 0, user: 1 } }
            ],
            as: 'follows'
          }
        },
        {
          $lookup: {
            from: 'blocks',
            let: { authorId: '$authorDetails._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $and: [{ $eq: ['$blocker', userId] }, { $eq: ['$blocked', '$$authorId'] }] },
                      { $and: [{ $eq: ['$blocked', userId] }, { $eq: ['$blocker', '$$authorId'] }] }
                    ]
                  }
                }
              },
              { $project: { _id: 0, user: 1 } }
            ],
            as: 'blocks'
          }
        },
        {
          $addFields: {
            isVisibleToViewer: {
              $and: [
                { $not: { $in: ['$authorDetails._id', '$blocks.blocker'] } },
                { $not: { $in: ['$authorDetails._id', '$blocks.blocked'] } },
                {
                  $or: [
                    { $eq: ['$status', 'PUBLIC'] },
                    { $and: [{ $eq: ['$status', 'FOLLOWERS'] }, { $ne: [{ $size: '$follows' }, 0] }] }
                  ]
                }
              ]
            },
            isLikedByViewer: { $ne: [{ $size: '$likes' }, 0] }
          }
        },
       {
          $project: {
            authorDetails: 1,
            content: 1,
            status: 1,
            createdAt: 1,
            isVisibleToViewer: 1,
            isLikedByViewer: 1
          }
        }
      ]);

return res.status(200).json(posts);
    } catch (error) {
  console.error('Error fetching content reel:', error);
  return res.status(500).json({ error: 'Internal Server Error' });
}
  }
  
  */