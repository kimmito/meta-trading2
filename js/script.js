// Упрощенный трекинг Facebook Pixel
function trackFacebookLead() {
    if (typeof fbq === 'function') {
        fbq('track', 'Lead', {
            currency: 'EUR',
            value: 10.0,
        });
        console.log('Facebook Pixel: Lead event tracked');
    } else {
        console.warn('Facebook Pixel not available for tracking');
    }
}

// Функция для проверки, было ли заблокировано всплывающее окно
function isPopupBlocked(popupWindow) {
    return !popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined';
}

// Альтернативный способ открытия авторизации
function openAuthFallback(authUrl) {
    // Вариант 1: Перенаправление текущей вкладки
    // window.location.href = authUrl;
    
    // Вариант 2: Открытие в новой вкладке (менее агрессивно)
    const newTab = window.open(authUrl, '_blank');
    if (newTab) {
        newTab.focus();
    } else {
        // Вариант 3: Показать кнопку для ручного перехода
        const fallbackDiv = document.createElement('div');
        fallbackDiv.style.position = 'fixed';
        fallbackDiv.style.bottom = '20px';
        fallbackDiv.style.left = '20px';
        fallbackDiv.style.padding = '15px';
        fallbackDiv.style.backgroundColor = '#f8f9fa';
        fallbackDiv.style.border = '1px solid #dee2e6';
        fallbackDiv.style.borderRadius = '5px';
        fallbackDiv.style.zIndex = '10000';
        
        const message = document.createElement('p');
        message.textContent = 'Для завершения регистрации перейдите по ссылке:';
        
        const link = document.createElement('a');
        link.href = authUrl;
        link.textContent = 'Перейти к авторизации';
        link.style.display = 'block';
        link.style.marginTop = '10px';
        link.style.color = 'blue';
        
        fallbackDiv.appendChild(message);
        fallbackDiv.appendChild(link);
        document.body.appendChild(fallbackDiv);
    }
}

// Main Application
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded');

    // Configuration - ЗАМЕНИТЕ НА URL ВАШЕГО WORKER
    const CRM_PROXY_URL = 'https://worker-meta.hgdfjghj2.workers.dev/';
    const LINK_ID = 4;

    // DOM Elements
    const elements = {
        form: document.getElementById('leadForm'),
        nameInput: document.getElementById('nameInput'),
        phoneInput: document.getElementById('phoneInput'),
        submitButton: document.getElementById('submitBtn'),
        thankYouPopup: document.getElementById('thankYouPopup'),
        closePopupBtn: document.getElementById('closePopup'),
        nameError: document.getElementById('nameError'),
        phoneError: document.getElementById('phoneError'),
    };

    // Phone Input Initialization
    let iti;
    if (window.intlTelInput) {
        iti = intlTelInput(elements.phoneInput, {
            initialCountry: 'ru',
            separateDialCode: true,
            preferredCountries: ['ru', 'us', 'gb', 'de', 'fr'],
            utilsScript: './intlTelInputWithUtils.min.js',
            customPlaceholder: () => '+7 (___) ___-__-__',
        });
    }

    // Form Validation
    function validateForm() {
        let isValid = true;
        const name = elements.nameInput.value.trim();
        const phone = elements.phoneInput.value.trim();

        // Clear previous errors
        elements.nameError.textContent = '';
        elements.phoneError.textContent = '';

        // Name validation
        if (!name || name.length < 2) {
            elements.nameError.textContent = 'Введите имя (минимум 2 символа)';
            isValid = false;
        }

        // Phone validation
        if (!phone) {
            elements.phoneError.textContent = 'Введите номер телефона';
            isValid = false;
        } else if (iti && !iti.isValidNumber()) {
            elements.phoneError.textContent = 'Введите корректный номер в формате: +79123456789';
            isValid = false;
        }

        return isValid;
    }

    // Form Submission
    elements.form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validateForm()) return;

        elements.submitButton.disabled = true;
        elements.submitButton.textContent = 'Отправка...';

        try {
            const phoneNumber = iti.getNumber();
            if (!phoneNumber) throw new Error('Неверный формат телефона');

            const ip = await fetch('https://api.ipify.org?format=json')
                .then((res) => res.json())
                .then((data) => data.ip || '8.8.8.8')
                .catch(() => '8.8.8.8');

            // Отправка данных через прокси-воркер
            const response = await fetch(CRM_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    link_id: LINK_ID,
                    fname: elements.nameInput.value.trim(),
                    email: `user${Date.now()}@meta.ai`,
                    fullphone: phoneNumber,
                    ip: ip,
                    country: iti.getSelectedCountryData().iso2.toUpperCase(),
                    language: navigator.language.slice(0, 2) || 'ru',
                    source: document.referrer || 'direct',
                    domain: window.location.hostname,
                }),
                mode: 'cors',
                credentials: 'omit',
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Ошибка сервера');
            }

            // Success actions
            elements.thankYouPopup.style.display = 'flex';
            elements.form.reset();

            // Трекинг конверсии
            trackFacebookLead();

            if (result.autologin) {
                // Пытаемся открыть всплывающее окно
                const authWindow = window.open(result.autologin, 'authWindow', 'width=500,height=600');
                
                // Проверяем, было ли окно заблокировано
                setTimeout(() => {
                    if (isPopupBlocked(authWindow)) {
                        // Используем альтернативный метод
                        openAuthFallback(result.autologin);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка: ' + error.message);
        } finally {
            elements.submitButton.disabled = false;
            elements.submitButton.textContent = 'Оставить заявку';
        }
    });

    // Popup close handlers
    elements.closePopupBtn.addEventListener('click', () => {
        elements.thankYouPopup.style.display = 'none';
    });

    elements.thankYouPopup.addEventListener('click', (e) => {
        if (e.target === elements.thankYouPopup) {
            elements.thankYouPopup.style.display = 'none';
        }
    });
});