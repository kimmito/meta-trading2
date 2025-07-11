document.addEventListener('DOMContentLoaded', function () {
    // Конфигурация CRM
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;

    // Получаем элементы
    const form = document.getElementById('leadForm');
    const nameInput = document.getElementById('nameInput');
    const phoneInput = document.getElementById('phoneInput');
    const submitButton = form.querySelector('button[type="submit"]');
    const thankYouPopup = document.getElementById('thankYouPopup');
    const closePopupBtn = document.getElementById('closePopup');

    // Функция форматирования телефона по стандарту E.164
    function formatPhoneToE164(phone) {
        // Удаляем все нецифровые символы
        const digits = phone.replace(/\D/g, '');

        // Российские номера (начинаются с 7 или 8)
        if (/^[78]/.test(digits) && digits.length === 11) {
            return '+7' + digits.slice(1);
        }

        // Номера без кода страны (10 цифр)
        if (digits.length === 10) {
            return '+7' + digits;
        }

        // Международные номера
        if (digits.length > 10) {
            return '+' + digits;
        }

        throw new Error('Неверный формат телефона. Введите 10 или 11 цифр');
    }

    // Обработчик отправки формы
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Получаем значения
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Валидация
        if (!name) {
            document.getElementById('nameError').textContent = 'Пожалуйста, введите ваше имя';
            return;
        }

        if (!phone) {
            document.getElementById('phoneError').textContent = 'Пожалуйста, введите номер телефона';
            return;
        }

        // Очищаем ошибки
        document.getElementById('nameError').textContent = '';
        document.getElementById('phoneError').textContent = '';

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
                email: `user${Date.now()}@meta.ai`,
                fullphone: formattedPhone,
                ip: '127.0.0.1',
                country: 'RU',
                language: 'ru',
                source: 'Meta Landing',
                domain: window.location.hostname,
            };

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

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Ошибка сервера');
            }

            // Показываем попап благодарности
            thankYouPopup.style.display = 'flex';

            // Если есть ссылка автологина - перенаправляем
            if (result.autologin) {
                // Создаем скрытый iframe для авторизации
                const iframe = document.createElement('iframe');
                iframe.src = result.autologin;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                // Перенаправляем через 3 секунды
                setTimeout(() => {
                    window.location.href = result.autologin;
                }, 3000);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            // Разблокируем кнопку
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить заявку';
        }
    });

    // Закрытие попапа
    closePopupBtn.addEventListener('click', function () {
        thankYouPopup.style.display = 'none';
    });
});
