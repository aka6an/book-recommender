module.exports = async function (context, req) {
    const apiKeyConfigured = !!process.env.GEMINI_API_KEY;
    
    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            apiKeyConfigured
        }
    };
};
