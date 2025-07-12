document.addEventListener('DOMContentLoaded', function () {
    const CRM_API_URL = 'https://tracking.roischoolsummer.online/api/v3/integration';
    const API_TOKEN = 'FFoHrZXOZL0WIrxx7fupXOcd7RbAqquSST9SAh5v516S5u3Lo9ChkFprZ0d3';
    const LINK_ID = 4;

    const form = document.getElementById('leadForm');
    const nameInput = document.getElementById('nameInput');
    const phoneInput = document.getElementById('phoneInput');
    const submitButton = document.getElementById('submitBtn');
    const thankYouPopup = document.getElementById('thankYouPopup');
    const closePopupBtn = document.getElementById('closePopup');

    if (!form || !nameInput || !phoneInput || !submitButton || !thankYouPopup || !closePopupBtn) {
        console.error('Один или несколько элементов не найдены!');
        return;
    }

    // Инициализация intl-tel-input
    const iti = window.intlTelInput(phoneInput, {
        initialCountry: 'ru',
        separateDialCode: true,
        preferredCountries: ['ru', 'us', 'gb', 'de', 'fr'],
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
    });

    // Создаем элементы для отображения ошибок
    const nameError = document.createElement('div');
    nameError.className = 'error-message text-danger mt-1';
    nameError.id = 'nameError';
    nameInput.parentNode.insertBefore(nameError, nameInput.nextSibling);

    const phoneError = document.createElement('div');
    phoneError.className = 'error-message text-danger mt-1';
    phoneError.id = 'phoneError';
    phoneInput.parentNode.insertBefore(phoneError, phoneInput.nextSibling);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Очищаем предыдущие ошибки
        nameError.textContent = '';
        phoneError.textContent = '';

        let isValid = true;

        // Валидация имени
        if (!name || name.length < 2) {
            nameError.textContent = 'Введите имя (минимум 2 символа)';
            isValid = false;
        }

        // Валидация телефона
        if (phone.trim() === '') {
            phoneError.textContent = 'Введите номер телефона';
            isValid = false;
        } else if (!iti.isValidNumber()) {
            phoneError.textContent = 'Введите корректный номер телефона';
            isValid = false;
        }

        if (!isValid) return;

        submitButton.disabled = true;
        submitButton.textContent = 'Отправляем...';

        try {
            const phoneNumber = iti.getNumber(); // Получаем номер в формате E164
            const countryCode = iti.getSelectedCountryData().iso2;

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

            console.log('Отправляемые данные:', data);
            const response = await fetch(`${CRM_API_URL}?api_token=${API_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Origin: window.location.origin,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log('Ответ CRM:', result);

            if (!result.success) {
                const errorMap = {
                    'Phone number not valid!': 'Неверный формат телефона',
                    'First name not valid!': 'Неверное имя',
                    'Duplicate!': 'Вы уже оставляли заявку',
                    'Error! (Unrecognized error)': 'Внутренняя ошибка сервера',
                };
                throw new Error(errorMap[result.message] || result.message || 'Неизвестная ошибка');
            }

            thankYouPopup.style.display = 'flex';

            form.reset();

            if (result.autologin) {
                const authWindow = window.open(result.autologin, 'authWindow', 'width=500,height=600');

                setTimeout(() => {
                    if (authWindow && !authWindow.closed) {
                        authWindow.close();
                    }
                }, 2000);

                const checkWindow = setInterval(() => {
                    if (authWindow.closed) {
                        clearInterval(checkWindow);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить заявку';
        }
    });

    closePopupBtn.addEventListener('click', function () {
        thankYouPopup.style.display = 'none';
    });

    thankYouPopup.addEventListener('click', function (e) {
        if (e.target === thankYouPopup) {
            thankYouPopup.style.display = 'none';
        }
    });
});
