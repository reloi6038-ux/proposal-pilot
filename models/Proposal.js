const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobDescription: {
      type: String,
      required: true,
      maxlength: [5000, 'Job description cannot exceed 5000 characters'],
    },
    generatedText: {
      type: String,
      required: true,
    },
    modelUsed: {
      type: String,
      default: 'gemini-3.8-flash',
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proposal', proposalSchema);