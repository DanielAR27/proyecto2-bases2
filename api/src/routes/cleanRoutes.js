const express = require('express');
const router = express.Router();
const cleanController = require('../controllers/cleanController');

router.delete('/user/:id', cleanController.cleanByUser);

module.exports = router;
