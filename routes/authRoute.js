const express = require('express');
const { userRegister, userLogin, getUser, taskerRegister, taskerLogin, getTasker } = require('../controllers/auth-controller');
const { protectUser, protectTasker } = require('../middlewares/authMiddleware');


const router = express.Router();

//user routes
router.post('/user-register', userRegister);
router.post('/user-login', userLogin);
router.get('/user', protectUser, getUser);

//tasker routes
router.post('/tasker-register', taskerRegister);
router.post('/tasker-login', taskerLogin);
router.get('/tasker', protectTasker, getTasker);

module.exports = router;