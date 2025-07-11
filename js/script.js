document.addEventListener('DOMContentLoaded', function () {
    // Конфигурация CRM
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;

    // Получаем элементы
    const form = document.getElementById('leadForm');
    const nameInput = document.getElementById('nameInput');
    const phoneInput = document.getElementById('phoneInput');
    const submitButton = document.getElementById('submitBtn'); // Исправлено здесь
    const thankYouPopup = document.getElementById('thankYouPopup');
    const closePopupBtn = document.getElementById('closePopup');

    // Проверяем, что все необходимые элементы существуют
    if (!form || !nameInput || !phoneInput || !submitButton || !thankYouPopup || !closePopupBtn) {
        console.error('Один или несколько элементов не найдены!');
        return;
    }

    // Улучшенная функция форматирования телефона
    function formatPhoneToE164(phone) {
        // Удаляем все нецифровые символы
        const digits = phone.replace(/\D/g, '');

        // Проверяем минимальную длину
        if (digits.length < 10) {
            throw new Error('Номер должен содержать минимум 10 цифр');
        }

        // Российские номера
        if (/^[78]\d{10}$/.test(digits)) {
            return '+7' + digits.slice(1);
        }

        // Международные номера
        if (/^\d{10,15}$/.test(digits)) {
            return '+' + digits;
        }

        throw new Error('Неверный формат номера');
    }

    // Обработчик отправки формы
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Получаем значения
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Очищаем предыдущие ошибки
        const nameError = document.getElementById('nameError');
        const phoneError = document.getElementById('phoneError');
        if (nameError) nameError.textContent = '';
        if (phoneError) phoneError.textContent = '';

        // Валидация
        let isValid = true;

        if (!name || name.length < 2) {
            if (nameError) nameError.textContent = 'Введите имя (минимум 2 символа)';
            isValid = false;
        }

        try {
            formatPhoneToE164(phone); // Проверяем формат телефона
        } catch (error) {
            if (phoneError) phoneError.textContent = error.message;
            isValid = false;
        }

        if (!isValid) return;

        // Блокируем кнопку
        submitButton.disabled = true;
        submitButton.textContent = 'Отправляем...';

        try {
            // Форматируем телефон
            const formattedPhone = formatPhoneToE164(phone);

            // Подготавливаем данные для CRM
            const data = {
                link_id: LINK_ID,
                fname: name,
                email: `user${Date.now()}@meta.ai`, // Временный email
                fullphone: formattedPhone,
                ip: '127.0.0.1', // Фиксированный IP
                country: 'RU', // Фиксированная страна
                language: 'ru', // Фиксированный язык
                source: document.referrer || 'direct', // Источник перехода
                domain: window.location.hostname,
                user_agent: navigator.userAgent,
            };

            console.log('Отправляемые данные:', data); // Для отладки

            // Отправляем данные в CRM
            const response = await fetch(`${CRM_API_URL}?api_token=${API_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log('Ответ CRM:', result); // Для отладки

            if (!result.success) {
                // Специальная обработка ошибок CRM
                const errorMap = {
                    'Phone number not valid!': 'Неверный формат телефона',
                    'First name not valid!': 'Неверное имя',
                    'Duplicate!': 'Вы уже оставляли заявку',
                    'Error! (Unrecognized error)': 'Внутренняя ошибка сервера',
                };

                throw new Error(errorMap[result.message] || result.message || 'Неизвестная ошибка');
            }

            // Успешная отправка
            thankYouPopup.style.display = 'flex';

            // Автологин если есть ссылка
            if (result.autologin) {
                // Скрытый iframe для предварительной авторизации
                const iframe = document.createElement('iframe');
                iframe.src = result.autologin;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                // Перенаправление через 3 секунды
                setTimeout(() => {
                    window.location.href = result.autologin;
                }, 3000);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить заявку';
        }
    });

    // Закрытие попапа
    closePopupBtn.addEventListener('click', function () {
        thankYouPopup.style.display = 'none';
    });
});
