const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function (context, req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }

    try {
        const preferences = req.body?.preferences;

        if (!preferences || preferences.trim() === '') {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Please provide your reading preferences' }
            };
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Gemini API key not configured' }
            };
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Based on these reading preferences: "${preferences}"
        
        Recommend exactly 3 books. Return ONLY valid JSON in this exact format, no markdown or extra text:
        {
            "recommendations": [
                {
                    "title": "Book Title",
                    "author": "Author Name",
                    "reason": "Brief explanation why this book matches the preferences (2-3 sentences)"
                }
            ]
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const recommendations = JSON.parse(text);

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: recommendations
        };

    } catch (error) {
        context.log.error('Error generating recommendations:', error);

        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: { 
                error: error instanceof SyntaxError 
                    ? 'Failed to parse AI response' 
                    : 'Failed to generate recommendations. Please try again.'
            }
        };
    }
};
