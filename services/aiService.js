const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = 'gemini-3.6-flash'; // or 'gemini-3.5-flash-lite'

/**
 * Generate a tailored freelance proposal.
 * @param {Object} params
 * @param {string} params.jobDescription - The client's job post
 * @param {Object} params.userProfile - { name, skills, bio, experience }
 * @returns {Promise<{ text: string, model: string }>}
 */
const generateProposal = async ({ jobDescription, userProfile }) => {
  const skillsList = userProfile.skills?.length
    ? userProfile.skills.join(', ')
    : 'not specified';

  const prompt = `You are an expert freelance proposal writer. Write a compelling, personalized proposal based on the following information.

## Freelancer Profile
- Name: ${userProfile.name || 'Freelancer'}
- Skills: ${skillsList}
- Bio: ${userProfile.bio || 'Not provided'}
- Experience: ${userProfile.experience || 'Not provided'}

## Client's Job Description
${jobDescription}

## Instructions
Write a professional proposal that:
1. Opens with a personalized hook referencing the client's specific needs.
2. Highlights 2-3 relevant skills or experiences from the freelancer's profile.
3. Explains a concrete approach to solving the client's problem.
4. Ends with a clear call to action.
5. Is 200-350 words, confident but not arrogant, and free of generic filler.

Return only the proposal text, no preamble or explanation.`;

  // --- Guard 1: ensure the prompt is not empty ---
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is empty — jobDescription or userProfile fields are missing');
  }

  // --- Guard 2: ensure jobDescription itself is a non-empty string ---
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    throw new Error('jobDescription is empty or invalid');
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt, // string is valid for @google/genai
    });

    const text = response.text;
    if (!text || text.trim().length === 0) {
      throw new Error('AI returned an empty response (possibly blocked by safety filters)');
    }

    return { text: text.trim(), model: MODEL };
  } catch (err) {
    // --- Structured logging so the real reason is visible ---
    console.error('=== GEMINI API ERROR ===');
    console.error('Message:', err.message);
    console.error('Status:', err.status || err.statusCode);
    console.error('Error name:', err.name);
    console.error('Error body:', JSON.stringify(err.error || err, null, 2));
    console.error('========================');

    // Re-throw so aiController can decide refund/response
    throw err;
  }
};

module.exports = { generateProposal };