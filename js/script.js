document.addEventListener('DOMContentLoaded', function () {
    // Конфигурационные константы
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;

    // Получаем элементы DOM
    const elements = {
        form: document.getElementById('leadForm'),
        nameInput: document.getElementById('nameInput'),
        phoneInput: document.getElementById('phoneInput'),
        submitButton: document.getElementById('submitBtn'),
        thankYouPopup: document.getElementById('thankYouPopup'),
        closePopupBtn: document.getElementById('closePopup'),
    };

    // Проверяем, что все элементы существуют
    if (Object.values(elements).some((el) => !el)) {
        console.error('Не все необходимые элементы найдены на странице');
        return;
    }

    // Добавляем элементы для ошибок (если их нет в HTML)
    if (!document.getElementById('nameError')) {
        const nameError = document.createElement('div');
        nameError.className = 'error-message';
        nameError.id = 'nameError';
        elements.nameInput.parentNode.insertBefore(nameError, elements.nameInput.nextSibling);
    }

    if (!document.getElementById('phoneError')) {
        const phoneError = document.createElement('div');
        phoneError.className = 'error-message';
        phoneError.id = 'phoneError';
        elements.phoneInput.parentNode.insertBefore(phoneError, elements.phoneInput.nextSibling);
    }

    // Инициализация intl-tel-input
    let iti;
    function initPhoneInput() {
        try {
            if (typeof intlTelInput === 'undefined') {
                throw new Error('Библиотека intlTelInput не загружена');
            }

            iti = intlTelInput(elements.phoneInput, {
                initialCountry: 'ru',
                separateDialCode: true,
                preferredCountries: ['ru', 'us', 'gb', 'de', 'fr'],
                utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
                customPlaceholder: function (selectedCountryPlaceholder) {
                    return selectedCountryPlaceholder;
                },
                nationalMode: false,
                autoPlaceholder: 'aggressive',
            });

            console.log('intlTelInput успешно инициализирован');
            return true;
        } catch (error) {
            console.error('Ошибка инициализации intlTelInput:', error);
            elements.phoneInput.placeholder = 'Номер телефона (в международном формате)';
            return false;
        }
    }

    // Пытаемся инициализировать с задержкой
    setTimeout(() => {
        if (!initPhoneInput()) {
            console.warn('Повторная попытка инициализации intlTelInput');
            setTimeout(initPhoneInput, 500);
        }
    }, 100);

    // Обработчик отправки формы
    elements.form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = elements.nameInput.value.trim();
        const phone = elements.phoneInput.value.trim();

        // Очищаем предыдущие ошибки
        document.getElementById('nameError').textContent = '';
        document.getElementById('phoneError').textContent = '';

        let isValid = true;

        // Валидация имени
        if (!name || name.length < 2) {
            document.getElementById('nameError').textContent = 'Введите имя (минимум 2 символа)';
            isValid = false;
        }

        // Валидация телефона
        if (!phone) {
            document.getElementById('phoneError').textContent = 'Введите номер телефона';
            isValid = false;
        } else if (iti && !iti.isValidNumber()) {
            document.getElementById('phoneError').textContent = 'Введите корректный номер телефона';
            isValid = false;
        }

        if (!isValid) return;

        // Блокируем кнопку отправки
        elements.submitButton.disabled = true;
        elements.submitButton.textContent = 'Отправляем...';

        try {
            const phoneNumber = iti ? iti.getNumber() : phone;
            const countryCode = iti ? iti.getSelectedCountryData().iso2 : 'ru';

            const data = {
                link_id: LINK_ID,
                fname: name,
                email: `user${Date.now()}@meta.ai`,
                fullphone: phoneNumber,
                ip: '127.0.0.1',
                country: countryCode.toUpperCase(),
                language: 'ru',
                source: document.referrer || 'direct',
                domain: window.location.hostname,
                user_agent: navigator.userAgent,
            };

            console.log('Отправка данных:', data);
            const response = await fetch(`${CRM_API_URL}?api_token=${API_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log('Ответ сервера:', result);

            if (!result.success) {
                const errorMap = {
                    'Phone number not valid!': 'Неверный формат телефона',
                    'First name not valid!': 'Неверное имя',
                    'Duplicate!': 'Вы уже оставляли заявку',
                    'Error! (Unrecognized error)': 'Внутренняя ошибка сервера',
                };
                throw new Error(errorMap[result.message] || result.message || 'Неизвестная ошибка');
            }

            // Показываем попап успешной отправки
            elements.thankYouPopup.style.display = 'flex';
            elements.form.reset();

            // Обработка автологина (если есть)
            if (result.autologin) {
                handleAutologin(result.autologin);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            // Разблокируем кнопку
            elements.submitButton.disabled = false;
            elements.submitButton.textContent = 'Оставить заявку';
        }
    });

    // Обработчик автологина
    function handleAutologin(url) {
        const authWindow = window.open(url, 'authWindow', 'width=500,height=600');

        setTimeout(() => {
            if (authWindow && !authWindow.closed) {
                authWindow.close();
            }
        }, 2000);
    }

    // Закрытие попапа
    elements.closePopupBtn.addEventListener('click', function () {
        elements.thankYouPopup.style.display = 'none';
    });

    elements.thankYouPopup.addEventListener('click', function (e) {
        if (e.target === elements.thankYouPopup) {
            elements.thankYouPopup.style.display = 'none';
        }
    });
});
