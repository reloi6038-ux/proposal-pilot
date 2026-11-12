const User = require('../models/User');
const Proposal = require('../models/Proposal');
const { generateProposal } = require('../services/aiService');

// @desc    Generate a proposal using AI (costs 1 credit)
// @route   POST /api/ai/generate
// @access  Private
const generate = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim().length < 20) {
      return res.status(400).json({
        message: 'Please provide a job description of at least 20 characters',
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, credits: { $gte: 1 } },
      { $inc: { credits: -1 } },
      { returnDocument: 'after' }
    ).select('credits name profile');

    if (!user) {
      const currentUser = await User.findById(req.user._id).select('credits');
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(402).json({
        message: 'Insufficient credits. Please purchase credits to continue.',
        credits: currentUser.credits,
      });
    }

    let result;
    try {
      result = await generateProposal({
        jobDescription: jobDescription.trim(),
        userProfile: {
          name: user.name,
          skills: user.profile?.skills || [],
          bio: user.profile?.bio || '',
          experience: user.profile?.experience || '',
        },
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError.message);

      await User.findByIdAndUpdate(req.user._id, { $inc: { credits: 1 } });

      const status = aiError.status || aiError.code;
      if (status === 429 || (aiError.message && aiError.message.includes('429'))) {
        return res.status(429).json({
          message: 'AI service is temporarily rate-limited. Your credit has been refunded. Please try again shortly.',
        });
      }
      if (status === 503 || (aiError.message && aiError.message.includes('503'))) {
        return res.status(503).json({
          message: 'AI service is temporarily overloaded. Your credit has been refunded. Please try again in a moment.',
        });
      }

      return res.status(502).json({
        message: 'AI generation failed. Your credit has been refunded.',
      });
    }

    const proposal = await Proposal.create({
      userId: req.user._id,
      jobDescription: jobDescription.trim(),
      generatedText: result.text,
      modelUsed: result.model,
    });

    const updatedUser = await User.findById(req.user._id).select('credits');

    res.status(201).json({
      proposalId: proposal._id,
      generatedText: result.text,
      creditsRemaining: updatedUser.credits,
    });
  } catch (error) {
    console.error('Generate controller error:', error);
    res.status(500).json({ message: 'Server error during generation' });
  }
};

// @desc    Get user's proposal history
// @route   GET /api/ai/history
// @access  Private
const getHistory = async (req, res) => {
  try {
    const proposals = await Proposal.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('jobDescription generatedText createdAt');
    res.json(proposals);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

// @desc    Get a single proposal by ID
// @route   GET /api/ai/proposals/:id
// @access  Private
const getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select('jobDescription generatedText modelUsed createdAt');

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ message: 'Failed to fetch proposal' });
  }
};

// @desc    Delete a proposal
// @route   DELETE /api/ai/proposals/:id
// @access  Private
const deleteProposal = async (req, res) => {
  try {
    const deleted = await Proposal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    res.json({ message: 'Proposal deleted' });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ message: 'Failed to delete proposal' });
  }
};

module.exports = { generate, getHistory, getProposalById, deleteProposal };