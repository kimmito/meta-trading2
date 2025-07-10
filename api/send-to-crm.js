export default async function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://meta-trading-ai.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
        const { api_token, link_id, ...leadData } = req.body;

        // Формируем URL для CRM
        const url = new URL(CRM_API_URL);
        Object.entries({ api_token, link_id, ...leadData }).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        // Отправка в CRM
        const crmResponse = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        // Получаем ответ от CRM
        const responseText = await crmResponse.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('Invalid JSON from CRM:', responseText);
            throw new Error('Invalid response format from CRM');
        }

        // Возвращаем ответ
        res.status(crmResponse.status).json({
            success: crmResponse.ok,
            ...responseData
        });

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}