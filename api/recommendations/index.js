module.exports = async function (context, req) {
    context.log('Health check triggered');
    
    const apiKeyConfigured = !!process.env.GEMINI_API_KEY;
    const apiKeyLength = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0;
    
    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                apiKeyConfigured: apiKeyConfigured,
                apiKeyLength: apiKeyLength
            }
        }
    };
};
