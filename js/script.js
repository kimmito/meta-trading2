document.addEventListener('DOMContentLoaded', function() {
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;
    const FB_PIXEL_ID = '1521989735836913';

    // Улучшенный показ сообщений
    function showAlert(message, isSuccess = false) {
        const alert = document.createElement('div');
        alert.className = `custom-alert ${isSuccess ? 'success' : 'error'}`;
        alert.textContent = message;
        
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.padding = '15px';
        alert.style.background = isSuccess ? '#d4edda' : '#f8d7da';
        alert.style.color = isSuccess ? '#155724' : '#721c24';
        alert.style.borderRadius = '4px';
        alert.style.zIndex = '10000';
        
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    // Форматирование телефона
    function formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('8')) return '+7' + cleaned.slice(1);
        if (cleaned.length === 10) return '+7' + cleaned;
        if (cleaned.length > 10) return '+' + cleaned;
        return null;
    }

    // Отправка данных в CRM через прокси
    async function sendToCRM(data) {
        try {
            const response = await fetch('/api/send-to-crm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка сервера');
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка отправки в CRM:', error);
            throw error;
        }
    }

    // Обработчик отправки формы
    document.querySelector('.request-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Блокируем кнопку
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        try {
            const name = form.querySelector('input[type="text"]').value.trim();
            const phone = form.querySelector('input[type="tel"]').value.trim();

            // Валидация
            if (!name) throw new Error('Введите ваше имя');
            if (!phone) throw new Error('Введите номер телефона');

            // Форматирование телефона
            const formattedPhone = formatPhone(phone);
            if (!formattedPhone) throw new Error('Введите корректный номер (минимум 10 цифр)');

            // Подготовка данных
            const leadData = {
                name: name,
                phone: formattedPhone,
                email: `user${Date.now()}@${window.location.hostname.replace('www.', '')}`,
                ip: await getIP(),
                country: await getCountry(),
                language: navigator.language.substring(0, 2) || 'ru',
                user_agent: navigator.userAgent
            };

            // Отправка в CRM
            const result = await sendToCRM({
                api_token: API_TOKEN,
                link_id: LINK_ID,
                ...leadData
            });

            // Триггер Facebook Pixel
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead', {}, { eventID: generateEventId() });
            }

            // Обработка автологина
            if (result.auto_login_url) {
                handleAutoLogin(result.auto_login_url);
            }

            // Показ попапа благодарности
            showThankYouPopup();
            form.reset();

        } catch (error) {
            showAlert(error.message);
            console.error('Ошибка формы:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Автологин через iframe (сохраняет User-Agent и IP)
    function handleAutoLogin(url) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.getElementById('autoLoginContainer').appendChild(iframe);
        
        // Дополнительно открываем в новом окне на случай блокировки iframe
        setTimeout(() => {
            window.open(url, '_blank', 'noopener,noreferrer');
        }, 1000);
    }

    // Получение IP
    async function getIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    // Определение страны
    async function getCountry() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return data.country || 'RU';
        } catch {
            return 'RU';
        }
    }

    // Показ попапа благодарности
    function showThankYouPopup() {
        const popup = document.getElementById('thankYouPopup');
        if (!popup) return;
        
        popup.classList.add('active');

        const closeBtn = document.getElementById('closePopup');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => popup.classList.remove('active'));
        }

        popup.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                popup.classList.remove('active');
            }
        });
    }

    // Генерация ID для Facebook Pixel
    function generateEventId() {
        return 'xxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});