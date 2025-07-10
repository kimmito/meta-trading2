document.addEventListener('DOMContentLoaded', function() {
    const CRM_PROXY_URL = '/api/send-to-crm';
    const FB_PIXEL_ID = '1521989735836913';

    // Улучшенный показ сообщений
    function showAlert(message, isSuccess = false) {
        // Удаляем старые сообщения
        document.querySelectorAll('.custom-alert').forEach(el => el.remove());
        
        const alert = document.createElement('div');
        alert.className = `custom-alert ${isSuccess ? 'success' : 'error'}`;
        alert.innerHTML = `
            <div class="alert-content">
                <span>${message}</span>
                <button class="close-alert">&times;</button>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Автоскрытие через 5 секунд
        const timer = setTimeout(() => alert.remove(), 5000);
        
        // Ручное закрытие
        alert.querySelector('.close-alert').addEventListener('click', () => {
            clearTimeout(timer);
            alert.remove();
        });
    }

    // Стили для алертов
    const style = document.createElement('style');
    style.textContent = `
        .custom-alert {
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        }
        .custom-alert.error {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ef9a9a;
        }
        .custom-alert.success {
            background-color: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #a5d6a7;
        }
        .alert-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .close-alert {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
            color: inherit;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Форматирование телефона
    function formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('8')) return '+7' + cleaned.slice(1);
        if (cleaned.length === 10) return '+7' + cleaned;
        if (cleaned.length > 10) return '+' + cleaned;
        return null;
    }

    // Отправка данных через прокси с повторными попытками
    async function sendToCRM(data, retries = 2) {
        try {
            const response = await fetch(CRM_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            // Клонируем ответ для безопасного чтения
            const responseClone = response.clone();
            
            try {
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Ошибка сервера');
                return result;
            } catch (e) {
                // Если JSON не парсится, пробуем прочитать как текст
                const text = await responseClone.text();
                console.error('Failed to parse response:', text);
                throw new Error(text || 'Ошибка сервера');
            }
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return sendToCRM(data, retries - 1);
            }
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
                language: navigator.language.substring(0, 2) || 'ru',
                user_agent: navigator.userAgent
            };

            // Отправка в CRM
            const result = await sendToCRM(leadData);

            // Триггер Facebook Pixel (с защитой от блокировщиков)
            try {
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'Lead', {}, { eventID: generateEventId() });
                } else {
                    // Fallback для случаев, когда FB Pixel заблокирован
                    const pixelUrl = `https://www.facebook.com/tr/?id=${FB_PIXEL_ID}&ev=Lead&dl=${encodeURIComponent(window.location.href)}`;
                    navigator.sendBeacon(pixelUrl);
                }
            } catch (fbError) {
                console.warn('Facebook Pixel error:', fbError);
            }

            // Обработка автологина
            if (result.auto_login_url) {
                handleAutoLogin(result.auto_login_url);
            }

            // Показ попапа благодарности
            showThankYouPopup();
            form.reset();

        } catch (error) {
            showAlert(error.message || 'Ошибка при отправке формы. Пожалуйста, попробуйте позже.');
            console.error('Form submission error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Автологин с защитой от блокировщиков
    function handleAutoLogin(url) {
        // 1. Пробуем iframe
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
        } catch (e) {
            console.warn('iFrame auto-login failed:', e);
        }
        
        // 2. Пробуем новое окно
        setTimeout(() => {
            try {
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (e) {
                console.warn('Window.open auto-login failed:', e);
                // 3. Последний вариант - редирект через 3 секунды
                showAlert('Сейчас вы будете перенаправлены...', true);
                setTimeout(() => {
                    window.location.href = url;
                }, 3000);
            }
        }, 1000);
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

    // Генерация ID для событий
    function generateEventId() {
        return 'xxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});