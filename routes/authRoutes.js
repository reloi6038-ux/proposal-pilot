const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
} = require('../controllers/authController');

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 72 })
      .withMessage('Password must be 6-72 characters'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
  ],
  validate,
  registerUser
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password required'),
  ],
  validate,
  loginUser
);

router.get('/me', protect, getMe);

router.put(
  '/profile',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('profile.skills')
      .optional()
      .isArray({ max: 50 })
      .withMessage('Skills must be an array of up to 50 items'),
    body('profile.skills.*')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 60 })
      .withMessage('Each skill must be ≤60 characters'),
    body('profile.bio')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Bio ≤1000 characters'),
    body('profile.experience')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Experience ≤2000 characters'),
  ],
  validate,
  updateProfile
);

module.exports = router;