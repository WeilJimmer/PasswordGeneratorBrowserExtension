// popup.js

async function set_state(_key,_value,_ttl=20) {
    await StateManagerClient.setState(_key, _value, { ttl: _ttl * 1000 });
}

async function get_state(_key, _default=null) {
    const _value = await StateManagerClient.getState(_key);
    if (_value) return _value;
    return null;
}

async function send_generate_password(mode=0) {
    // mode: 0 = don't save in history, 1 = save in history
    let response = await chrome.runtime.sendMessage({ type: 'GENERATE_PASSWORD', mode: mode });
    return response;
}


// 當擴充功能彈出視窗開啟時
document.addEventListener('DOMContentLoaded', async () => {
    // 宣告定義
    const lengthSlider = document.getElementById('length');
    const lengthValue = document.getElementById('lengthValue');
    const numbersCheckbox = document.getElementById('numbers');
    const uppercaseCheckbox = document.getElementById('uppercase');
    const lowercaseCheckbox = document.getElementById('lowercase');
    const symbolsCheckbox = document.getElementById('symbols');
    const symbolsCharField = document.getElementById('symbols_char');
    const masterPasswordField = document.getElementById('master_password');
    const saltField = document.getElementById('domain');
    const versionField = document.getElementById('version');
    const currentUrlField = document.getElementById('currentUrl');
    const passwordField = document.getElementById('password');
    const checksumField = document.getElementById('checksum_span');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');

    // 設定 UI 元件的值
    masterPasswordField.value = await get_state('master_password', '');
    lengthSlider.value = await get_state('length', 40);
    lengthValue.value = await get_state('length', 40);
    numbersCheckbox.checked = await get_state('numbers_checked', true);
    symbolsCheckbox.checked = await get_state('symbols_checked', true);
    uppercaseCheckbox.checked = await get_state('uppercase_checked', true);
    lowercaseCheckbox.checked = await get_state('lowercase_checked', true);
    symbolsCharField.value = await get_state('symbols_char', '!@#$%^&*(){}[]=,.');
    saltField.value = await get_state('domain', '');
    versionField.value = await get_state('version', '1');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrlField.textContent = tab.url;
    await set_state('current_url', tab.url);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'PASSWORD_GENERATED') {
            passwordField.textContent = message.data.password;
            checksumField.textContent = message.data.checksum;
        }
    });
    lengthSlider.oninput = async function() {
        lengthValue.value = this.value;
        set_state('length', this.value);
        await send_generate_password();
    }
    masterPasswordField.addEventListener('input', async (e) => {
        const newPw = e.target.value;
        set_state('master_password', newPw);
        await send_generate_password();
    });
    numbersCheckbox.addEventListener('change', async (e) => {
        set_state('numbers_checked', e.target.checked);
        await send_generate_password();
    });
    uppercaseCheckbox.addEventListener('change', async (e) => {
        set_state('uppercase_checked', e.target.checked);
        await send_generate_password();
    });
    lowercaseCheckbox.addEventListener('change', async (e) => {
        set_state('lowercase_checked', e.target.checked);
        await send_generate_password();
    });
    symbolsCheckbox.addEventListener('change', async (e) => {
        set_state('symbols_checked', e.target.checked);
        await send_generate_password();
    });
    symbolsCharField.addEventListener('input', async (e) => {
        set_state('symbols_char', e.target.value);
        await send_generate_password();
    });
    saltField.addEventListener('input', async (e) => {
        set_state('domain', e.target.value);
        await send_generate_password();
    });
    versionField.addEventListener('input', async (e) => {
        set_state('version', e.target.value);
        await send_generate_password();
    });
    // 複製按鈕功能
    generateBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab.url;
        const newSalt = saltField.value;
        const response = await send_generate_password();
        passwordField.textContent = response.password;
        checksumField.textContent = response.checksum;
    });
    copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(passwordField.textContent).then(() => {
            const successMessage = document.getElementById('successMessage');
            successMessage.classList.add('show');
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 2000);
        });
    });
    setInterval(() => {
        set_state('master_password', masterPasswordField.value);
    }, 3000);
});