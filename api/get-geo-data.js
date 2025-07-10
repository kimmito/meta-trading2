export default async function handler(req, res) {
    try {
        // Используем ipapi.co с проксированием через ваш сервер
        const response = await fetch('https://ipapi.co/json/', {
            headers: {
                'User-Agent': req.headers['user-agent'] || ''
            }
        });
        
        if (!response.ok) {
            throw new Error(`ipapi.co error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Возвращаем только необходимые данные
        res.status(200).json({
            ip: data.ip || 'unknown',
            country: data.country || 'RU'
        });
        
    } catch (error) {
        console.error('Geo data proxy error:', error);
        res.status(200).json({
            ip: 'unknown',
            country: 'RU'
        });
    }
}