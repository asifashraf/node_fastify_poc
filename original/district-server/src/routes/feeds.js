const express = require('express');
const feedController = require('../controllers/feeds-controller');
// eslint-disable-next-line new-cap
const router = express.Router();

/*
 * This services are already created on graphql.
 * Because of the FE request they were created also here.
 * If necessary you can look blogCategories, blogCategory,
 * blogCategory[Create, Update, Delete], blogPosts, blogPost
 * and blogPost[Create, Update, Delete] in graphql.
 * */

router.get('/xml/3d425058a554ff9e8d4c95ashg7ef93e81753f79/:country/:lang', feedController.getFeeds);

router.get('/generateXmlFeed/3d425058a554ff9e8d4c95ashg7ef93e81753f79/:country/:lang', feedController.generateFeeds);

module.exports = router;
