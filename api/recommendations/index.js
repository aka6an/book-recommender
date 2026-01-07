const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fetch book cover and details from Google Books API
async function getBookDetails(title, author) {
    try {
        const query = encodeURIComponent(`${title} ${author}`);
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
        );
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0].volumeInfo;
            const imageLinks = book.imageLinks || {};
            
            // Get the best available image (prefer larger sizes)
            const coverImage = imageLinks.thumbnail || 
                              imageLinks.smallThumbnail || 
                              null;
            
            // Convert http to https and optionally increase size
            const coverUrl = coverImage 
                ? coverImage.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
                : null;
            
            return {
                coverUrl,
                isbn: book.industryIdentifiers?.[0]?.identifier || null,
                previewLink: book.previewLink || null
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching book details:', error);
        return null;
    }
}

// Generate Amazon search URL
function getAmazonLink(title, author, isbn) {
    // If we have ISBN, use it for more accurate results
    if (isbn) {
        return `https://www.amazon.com/s?k=${encodeURIComponent(isbn)}&i=stripbooks`;
    }
    // Otherwise search by title and author
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.com/s?k=${query}&i=stripbooks`;
}

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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
            context.log('Unexpected structure, full parsed:', JSON.stringify(parsed));
            jsonResponse(500, `Unexpected response structure: ${JSON.stringify(Object.keys(parsed))}`);
            return;
        }

        // Enrich each recommendation with cover image and Amazon link
        context.log('Enriching recommendations with book details...');
        const enrichedRecommendations = await Promise.all(
            recommendations.map(async (book) => {
                const details = await getBookDetails(book.title, book.author);
                
                return {
                    ...book,
                    coverUrl: details?.coverUrl || null,
                    amazonUrl: getAmazonLink(book.title, book.author, details?.isbn),
                    previewUrl: details?.previewLink || null
                };
            })
        );

        context.log('Enrichment complete');
        jsonResponse(200, { recommendations: enrichedRecommendations });

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
