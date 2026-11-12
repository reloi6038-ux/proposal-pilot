const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  generate,
  getHistory,
  getProposalById,
  deleteProposal,
} = require('../controllers/aiController');

router.post(
  '/generate',
  protect,
  [
    body('jobDescription')
      .isString()
      .trim()
      .isLength({ min: 20, max: 5000 })
      .withMessage('Job description must be 20-5000 characters'),
  ],
  validate,
  generate
);

router.get('/history', protect, getHistory);

router.get(
  '/proposals/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid proposal id')],
  validate,
  getProposalById
);

router.delete(
  '/proposals/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid proposal id')],
  validate,
  deleteProposal
);

module.exports = router;