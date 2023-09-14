const express = require('express');
// eslint-disable-next-line new-cap
const router = express.Router();

/*
 * This services are already created on graphql.
 * Because of the FE request they were created also here.
 * If necessary you can look blogCategories, blogCategory,
 * blogCategory[Create, Update, Delete], blogPosts, blogPost
 * and blogPost[Create, Update, Delete] in graphql.
 * */
router.get('/categories', async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  try {
    const categories = await context.blogCategory.getAll({});
    res.json(categories);
  } catch (err) {
    // TODO: will add logger
    res.status(400).send('An error occurred');
  }
});

router.get('/posts', async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  try {
    const posts = await context.blogPost.getFiltered(req.query);
    res.json(posts);
  } catch (err) {
    // TODO: will add logger
    res.status(400).send('An error occurred');
  }
});

router.get('/posts/:id', async (req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  try {
    const post = await context.blogPost.getByIdOrPermalink(req.params.id);
    // eslint-disable-next-line no-unused-expressions
    post ? res.json(post) : res.status(404).send('record not found');
  } catch (err) {
    // TODO: will add logger
    res.status(400).send('An error occurred');
  }
});

module.exports = router;
