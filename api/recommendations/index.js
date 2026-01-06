const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function (context, req) {
    context.log('Function triggered. Method:', req.method);
    
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

    // Ensure we always return JSON
    const jsonResponse = (status, body) => {
        context.res = {
            status,
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? { error: body } : body
        };
    };

    try {
        context.log('Request body:', JSON.stringify(req.body));
        
        const preferences = req.body?.preferences;

        if (!preferences || preferences.trim() === '') {
            jsonResponse(400, 'Please provide your reading preferences');
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        context.log('API Key configured:', !!apiKey);
        
        if (!apiKey) {
            jsonResponse(500, 'Gemini API key not configured. Add GEMINI_API_KEY in Azure Portal → Settings → Environment variables.');
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

        context.log('Calling Gemini API...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        context.log('Gemini raw response:', text);

        // Clean up response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        context.log('Gemini cleaned response:', text);

        const parsed = JSON.parse(text);
        context.log('Parsed structure:', JSON.stringify(Object.keys(parsed)));
        
        // Handle different possible response structures
        let recommendations;
        if (parsed.recommendations) {
            recommendations = parsed.recommendations;
        } else if (Array.isArray(parsed)) {
            recommendations = parsed;
        } else if (parsed.books) {
            recommendations = parsed.books;
        } else {
            // If it's an object with numbered keys or other structure, try to extract
            context.log('Unexpected structure, full parsed:', JSON.stringify(parsed));
            jsonResponse(500, `Unexpected response structure: ${JSON.stringify(Object.keys(parsed))}`);
            return;
        }
        
        jsonResponse(200, { recommendations });

    } catch (error) {
        context.log.error('Error:', error.message);
        context.log.error('Stack:', error.stack);

        if (error instanceof SyntaxError) {
            jsonResponse(500, 'Failed to parse AI response');
        } else {
            jsonResponse(500, `Failed to generate recommendations: ${error.message}`);
        }
    }
};
