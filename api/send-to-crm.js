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
        const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
        const LINK_ID = 4;

        // Получаем IP клиента
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

        // Подготовка данных для CRM
        const params = new URLSearchParams();
        params.append('api_token', API_TOKEN);
        params.append('link_id', LINK_ID);
        
        // Добавляем данные из запроса
        for (const [key, value] of Object.entries(req.body)) {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        }
        
        // Добавляем IP, если его нет в данных
        if (!req.body.ip && ip) {
            params.append('ip', ip);
        }

        // Отправка в CRM
        const crmResponse = await fetch(`${CRM_API_URL}?${params.toString()}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            timeout: 10000 // 10 секунд таймаут
        });

        // Обработка ответа CRM
        const responseText = await crmResponse.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            // Если ответ не JSON, пробуем извлечь данные из текста
            console.error('CRM response is not JSON:', responseText);
            
            // Пытаемся найти URL автологина в тексте
            const autoLoginMatch = responseText.match(/auto_login_url["']?\s*:\s*["']([^"']+)/i);
            const autoLoginUrl = autoLoginMatch ? autoLoginMatch[1] : null;
            
            if (autoLoginUrl) {
                responseData = { success: true, auto_login_url: autoLoginUrl };
            } else {
                throw new Error('Invalid response format from CRM');
            }
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