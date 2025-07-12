document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM полностью загружен');

    // Конфигурация
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;

    console.log('Конфигурация:', { CRM_API_URL, API_TOKEN, LINK_ID });

    // Элементы DOM
    const elements = {
        form: document.getElementById('leadForm'),
        nameInput: document.getElementById('nameInput'),
        phoneInput: document.getElementById('phoneInput'),
        submitButton: document.getElementById('submitBtn'),
        thankYouPopup: document.getElementById('thankYouPopup'),
        closePopupBtn: document.getElementById('closePopup'),
    };

    console.log('Найденные элементы:', elements);

    // Проверка элементов
    if (Object.values(elements).some((el) => !el)) {
        console.error(
            'Не все элементы найдены:',
            Object.entries(elements)
                .filter(([_, el]) => !el)
                .map(([name]) => name),
        );
        return;
    }

    // Инициализация intlTelInput
    let iti;
    function initPhoneInput() {
        console.log('Инициализация intlTelInput...');
        if (window.intlTelInput) {
            iti = intlTelInput(elements.phoneInput, {
                initialCountry: 'ru',
                separateDialCode: true,
                preferredCountries: ['ru', 'us', 'gb', 'de', 'fr'],
                utilsScript: './intlTelInputWithUtils.min.js',
                customPlaceholder: function () {
                    return '+7 (___) ___-__-__';
                },
            });

            console.log('intlTelInput успешно инициализирован', iti);
            return true;
        }
        console.error('intlTelInput не найден в window');
        return false;
    }

    // Валидация формы
    function validateForm() {
        console.log('Начало валидации формы...');
        let isValid = true;
        const name = elements.nameInput.value.trim();
        const phone = elements.phoneInput.value.trim();

        console.log('Введенные данные:', { name, phone });

        // Очистка предыдущих ошибок
        document.querySelectorAll('.error-message').forEach((el) => (el.textContent = ''));

        // Валидация имени
        if (!name || name.length < 2) {
            console.log('Ошибка валидации: неверное имя');
            showError('nameError', 'Введите имя (минимум 2 символа)');
            isValid = false;
        }

        // Валидация телефона
        if (!phone) {
            console.log('Ошибка валидации: телефон не введен');
            showError('phoneError', 'Введите номер телефона');
            isValid = false;
        } else if (iti && !iti.isValidNumber()) {
            console.log('Ошибка валидации: неверный формат телефона');
            showError('phoneError', 'Введите корректный номер в формате: +79123456789');
            isValid = false;
        }

        console.log('Результат валидации:', isValid ? 'Успешно' : 'Ошибка');
        return isValid;
    }

    function showError(elementId, message) {
        console.log(`Показ ошибки [${elementId}]: ${message}`);
        let errorElement = document.getElementById(elementId);
        if (!errorElement) {
            console.log('Создание нового элемента для ошибки');
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.id = elementId;
            const inputId = elementId.replace('Error', 'Input');
            const inputElement = document.getElementById(inputId);
            if (inputElement && inputElement.parentNode) {
                inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
            }
        }
        errorElement.textContent = message;
    }

    // Инициализация
    if (!initPhoneInput()) {
        console.error('Ошибка инициализации intlTelInput');
        showError('phoneError', 'Ошибка загрузки валидатора телефона');
    }

    // Обработчик отправки формы
    elements.form.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log('Форма отправлена');

        if (!validateForm()) {
            console.log('Отправка отменена из-за ошибок валидации');
            return;
        }

        // Блокировка кнопки
        elements.submitButton.disabled = true;
        elements.submitButton.textContent = 'Отправка...';
        console.log('Кнопка заблокирована');

        try {
            console.log('Начало обработки формы');
            const phoneNumber = iti.getNumber();
            console.log('Номер телефона после форматирования:', phoneNumber);

            if (!phoneNumber) {
                throw new Error('Неверный формат телефона');
            }

            const ip = await getIP();
            console.log('Определен IP адрес:', ip);

            const data = {
                link_id: LINK_ID,
                fname: elements.nameInput.value.trim(),
                email: `user${Date.now()}@meta.ai`, // Временный email
                fullphone: phoneNumber,
                ip: ip,
                country: iti.getSelectedCountryData().iso2.toUpperCase(),
                language: navigator.language.slice(0, 2) || 'ru',
                source: document.referrer || 'direct',
                domain: window.location.hostname,
            };

            console.log('Подготовленные данные для отправки:', data);

            const response = await fetch(`${CRM_API_URL}?api_token=${API_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(data),
            });

            console.log('Ответ сервера получен. Статус:', response.status);

            const result = await response.json();
            console.log('Разобранный ответ сервера:', result);

            if (!result.success) {
                console.error('Ошибка в ответе сервера:', result.message);
                throw new Error(result.message || 'Ошибка сервера');
            }

            console.log('Успешная отправка данных. Показ попапа...');
            elements.thankYouPopup.style.display = 'flex';
            elements.form.reset();

            if (result.autologin) {
                console.log('Обнаружена ссылка для автологина:', result.autologin);
                handleAutologin(result.autologin);
            }
        } catch (error) {
            console.error('Произошла ошибка:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            console.log('Завершение обработки формы. Разблокировка кнопки.');
            elements.submitButton.disabled = false;
            elements.submitButton.textContent = 'Оставить заявку';
        }
    });

    // Получение IP
    async function getIP() {
        console.log('Определение IP адреса...');
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            console.log('IP адрес определен:', data.ip);
            return data.ip || '8.8.8.8';
        } catch (error) {
            console.error('Ошибка при определении IP:', error);
            return '8.8.8.8';
        }
    }

    // Обработка автологина
    function handleAutologin(url) {
        console.log('Попытка открытия окна автологина:', url);
        const authWindow = window.open(url, 'authWindow', 'width=500,height=600');

        if (!authWindow) {
            console.error('Не удалось открыть окно автологина (возможно, заблокировано браузером)');
            alert('Пожалуйста, разрешите всплывающие окна для автоматической авторизации');
            return;
        }

        console.log('Окно автологина успешно открыто');
        let checkAttempts = 0;
        const maxAttempts = 20; // Проверять в течение 10 секунд (500ms * 20)

        const checkWindow = setInterval(() => {
            checkAttempts++;
            if (authWindow.closed) {
                console.log('Окно автологина закрыто пользователем');
                clearInterval(checkWindow);
            } else if (checkAttempts >= maxAttempts) {
                console.log('Превышено время ожидания закрытия окна');
                clearInterval(checkWindow);
                authWindow.close();
            }
        }, 500);
    }

    // Закрытие попапа
    elements.closePopupBtn.addEventListener('click', function () {
        console.log('Закрытие попапа по кнопке');
        elements.thankYouPopup.style.display = 'none';
    });

    elements.thankYouPopup.addEventListener('click', function (e) {
        if (e.target === elements.thankYouPopup) {
            console.log('Закрытие попапа по клику вне контента');
            elements.thankYouPopup.style.display = 'none';
        }
    });

    console.log('Инициализация завершена');
});
