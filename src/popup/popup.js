// popup.js
// Author: Weil Jimmer
// Description: This file contains the popup manager class that is used to manage the popup window of the extension.
// The popup manager class is responsible for initializing the popup window and handling messages from the background script.

import '../modules/theme.js';
import '../modules/heartbeat.js';
import { SMW } from '../modules/state.js';
import { UIStartUp } from '../modules/startup.js';
import { evaluateStrength, crackTimeParts } from '../modules/strength.js';

console.log('===== popup.js loaded =====', new Date().toISOString());

var freeze_generate_password_event = false;
async function send_generate_password(mode=0) {
    // mode: 0 = don't save in history, 1 = save in history, 2 = save + copy
    if (freeze_generate_password_event) return;
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(
                { type: 'GENERATE_PASSWORD', mode: mode },
                response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

const AUTOFILL_OPTIONS = {
    DO_NOTHING : 'do-nothing',
    AUTOFILL_DOMAIN : 'autofill-domain',
    AUTOFILL_URL : 'autofill-url',
    AUTOFILL_KEYWORD : 'autofill-keyword'
}

class PopupManager {
    static _instance = null;
    static getInstance() {
        if (!PopupManager._instance) {
            PopupManager._instance = new PopupManager();
        }
        return PopupManager._instance;
    }
    constructor() {
        if (PopupManager._instance) {
            return PopupManager._instance;
        }
        PopupManager._instance = this;
        this._initialized = false;
        this.need_hide_password = false;
        this.need_search_history_salt = true;
        this.elements = {
            hidePasswordField: document.getElementById('hide_password_input'),
            masterPasswordField: document.getElementById('master_password'),
            generateCopyBtn: document.getElementById('generateCopyBtn'),
            symbolsCharField: document.getElementById('symbols_char'),
            autofillSelect: document.getElementById('auto_fill_salt'),
            uppercaseCheckbox: document.getElementById('uppercase'),
            lowercaseCheckbox: document.getElementById('lowercase'),
            checksumField: document.getElementById('checksum_span'),
            settingsBtn: document.getElementById('settingsBtn'),
            generateBtn: document.getElementById('generateBtn'),
            lengthValue: document.getElementById('lengthValue'),
            numbersCheckbox: document.getElementById('numbers'),
            symbolsCheckbox: document.getElementById('symbols'),
            passwordField: document.getElementById('password'),
            versionField: document.getElementById('version'),
            lengthSlider: document.getElementById('length'),
            resetBtn: document.getElementById('resetBtn'),
            copyBtn: document.getElementById('copyBtn'),
            saltField: document.getElementById('salt'),
        };
    }

    async init() {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        this.setupMessageListener();
        this.initializeUI();
    }

    sendMessage(type, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage(
                    { type, data },
                    response => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'BACKGROUND_INITIALIZED') {
                this.onBackgroundReady();
            }else if (message.type === 'PASSWORD_GENERATED') {
                let pw_element = this.need_hide_password ? this.elements.hidePasswordField : this.elements.passwordField;
                pw_element.value = message.data.password;
                this.elements.checksumField.textContent = '['+message.data.checksum+']';
                if (message.data.need_copy) this.copyPw();
                // Update password strength meter — an ERROR result carries an
                // error message, not a password: clear the meter, don't score it.
                if (message.data.checksum === 'ERROR') {
                    this.clearStrengthMeter();
                } else {
                    this.updateStrengthMeter(message.data.parameters, message.data.checksum);
                }
            }
        });
    }

    clearStrengthMeter() {
        const meter = document.getElementById('strengthMeter');
        const label = document.getElementById('strengthLabel');
        const entropyText = document.getElementById('entropyText');
        if (meter) {
            meter.style.width = '0%';
            meter.style.backgroundColor = '';
        }
        if (label) {
            label.textContent = '';
            label.style.color = '';
        }
        if (entropyText) entropyText.textContent = '';
    }

    updateStrengthMeter(parameters, checksum) {
        const meter = document.getElementById('strengthMeter');
        const label = document.getElementById('strengthLabel');
        const entropyText = document.getElementById('entropyText');
        if (!meter || !label) return;

        // Score the charset/length the generator ACTUALLY used (from background),
        // not the popup's current checkbox state.
        const result = evaluateStrength(parameters, checksum);
        if (result == null) {
            this.clearStrengthMeter();
            return;
        }
        const { entropy, level, percent, derived } = result;

        const levelText = {
            'weak': this.i18n('strength_weak'),
            'fair': this.i18n('strength_fair'),
            'good': this.i18n('strength_good'),
            'strong': this.i18n('strength_strong'),
            'excellent': this.i18n('strength_excellent'),
        };
        const levelColor = {
            'weak': '#ef4444',
            'fair': '#f59e0b',
            'good': '#3b82f6',
            'strong': '#10b981',
            'excellent': '#059669',
        };

        // Update meter bar
        meter.style.width = percent + '%';
        meter.style.backgroundColor = levelColor[level];

        // Update label with level + crack time estimate
        const crackTime = this.formatCrackTime(entropy);
        label.style.color = levelColor[level];
        label.textContent = `${levelText[level]} · ${crackTime}`;

        // Derived (HMAC) passwords are only as strong as the master password —
        // the entropy shown is an upper bound of the character space, not the
        // real search space. Say so, but only in derived mode.
        if (derived) {
            label.textContent += ` (${this.i18n('strength_derived_note')})`;
        }

        // Update entropy text (i18n label + value)
        if (entropyText) {
            entropyText.textContent = `${this.i18n('strength_entropy')}: ${entropy.toFixed(1)} ${this.i18n('strength_bits')}`;
        }
    }

    /**
     * Render crack time from pure parts (i18n unit keys), e.g. "3.2s", "> 1,000y".
     */
    formatCrackTime(entropy) {
        const parts = crackTimeParts(entropy);
        if (parts.value === undefined) return this.i18n(parts.unit);
        const num = Number.isInteger(parts.value)
            ? parts.value.toLocaleString('en-US')
            : parts.value.toFixed(1);
        return `${num}${this.i18n(parts.unit)}`;
    }

    /**
     * Simple i18n helper for strength meter labels.
     * Falls back to English if translation not found.
     */
    i18n(key) {
        try {
            const msg = chrome.i18n.getMessage(key);
            return msg ? msg : this.i18nFallback(key);
        } catch {
            return this.i18nFallback(key);
        }
    }

    i18nFallback(key) {
        const fallbacks = {
            'strength_weak': 'Weak',
            'strength_fair': 'Fair',
            'strength_good': 'Good',
            'strength_strong': 'Strong',
            'strength_excellent': 'Excellent',
            'strength_entropy': 'Entropy',
            'strength_bits': 'bits',
            'strength_derived_note': 'actual strength is no more than the master password',
            'unit_ms': 'ms',
            'unit_s': 's',
            'unit_min': 'min',
            'unit_h': 'h',
            'unit_d': 'd',
            'unit_y': 'y',
            'crack_lt_1ms': '< 1ms',
            'crack_gt_1000y': '> 1,000y',
        };
        return fallbacks[key] || key;
    }

    getKeywordFromUrl(domain){
        if (domain.indexOf('www.')===0) domain = domain.substring(4);
        return domain.replace(/\./g, '-');
    }

    getPureURL(url){
        const urlObj = new URL(url);
        return urlObj.protocol + '//' + urlObj.hostname + urlObj.pathname;
    }

    async getActiveTabURL(){
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
                return tabs[0].url;
            }
            console.warn('No active tab found');
            return '';
        } catch (e) {
            console.error('Error getting active tab URL:', e);
            return '';
        }
    }

    async parseCurrentURL(){
        try{
            const url = new URL(await this.getActiveTabURL());
            const domain = url.hostname;
            const keyword = this.getKeywordFromUrl(domain);
            const pureURL = this.getPureURL(url.href);
            return {domain, keyword, pureURL};
        }catch(e){
            console.error('Error parsing URL:', e);
            return {domain:'', keyword:'', pureURL:''};
        }
    }

    async setAutofillOptions(){
        const url_set = await this.parseCurrentURL();
        const options = this.elements.autofillSelect.value;
        let final_salt = '';
        if (options == AUTOFILL_OPTIONS.DO_NOTHING) return;
        if (options == AUTOFILL_OPTIONS.AUTOFILL_DOMAIN) final_salt = url_set.domain;
        if (options == AUTOFILL_OPTIONS.AUTOFILL_URL) final_salt = url_set.pureURL;
        if (options == AUTOFILL_OPTIONS.AUTOFILL_KEYWORD) final_salt = url_set.keyword;
        this.elements.saltField.value = final_salt;
        if (this.need_search_history_salt) {
            setTimeout(async () => {
                const found = await SMW.search_history(final_salt);
                if (found) this.readUIState();
                console.log('search_history:', found);
            }, 100);
        }
    }

    async initializeUI() {
        // 初始化按鈕和其他 UI 元素
        await this.readUIState();
        await this.setAllUiState();
        await this.initializeEventListeners();
    }

    async readUIState(){
        freeze_generate_password_event = true;
        // read settings
        this.need_search_history_salt = await SMW.get_settings('auto_search_history', true);
        this.need_hide_password = await SMW.get_settings('hide_generated_pw', false);
        // read states
        this.elements.lowercaseCheckbox.checked = await SMW.get_state('lowercaseChecked', true);
        this.elements.uppercaseCheckbox.checked = await SMW.get_state('uppercaseChecked', true);
        this.elements.numbersCheckbox.checked = await SMW.get_state('numbersChecked', true);
        this.elements.symbolsCheckbox.checked = await SMW.get_state('symbolsChecked', true);
        this.elements.lengthSlider.value = parseInt(await SMW.get_state('pwlength'));
        this.elements.versionField.value = parseInt(await SMW.get_state('version'));
        this.elements.lengthValue.value = parseInt(await SMW.get_state('pwlength'));
        this.elements.autofillSelect.value = await SMW.get_state('autoFillOption');
        this.elements.symbolsCharField.value = await SMW.get_state('symbols');
        this.elements.masterPasswordField.value = await SMW.get_state('pw');
        this.elements.saltField.value = await SMW.get_state('salt');
        // set UI elements
        if (this.need_hide_password) {
            this.elements.hidePasswordField.style.display = 'block';
            this.elements.passwordField.style.display = 'none';
        }else{
            this.elements.passwordField.style.display = 'block';
            this.elements.hidePasswordField.style.display = 'none';
        }
        freeze_generate_password_event = false;
    }

    async setAllUiState(){
        let pw_timeout = await SMW.get_settings('forgot_password', 20);
        await this.setAutofillOptions();
        await SMW.set_state('lowercaseChecked', this.elements.lowercaseCheckbox.checked);
        await SMW.set_state('uppercaseChecked', this.elements.uppercaseCheckbox.checked);
        await SMW.set_state('numbersChecked', this.elements.numbersCheckbox.checked);
        await SMW.set_state('symbolsChecked', this.elements.symbolsCheckbox.checked);
        await SMW.set_state('autoFillOption', this.elements.autofillSelect.value);
        await SMW.set_state('pwlength', this.elements.lengthValue.value);
        await SMW.set_state('version', this.elements.versionField.value);
        await SMW.set_state('symbols', this.elements.symbolsCharField.value);
        await SMW.set_state('salt', this.elements.saltField.value);
        await SMW.set_state('pw', this.elements.masterPasswordField.value, pw_timeout);
    }

    copyPw(){
        let pw_element = this.need_hide_password ? this.elements.hidePasswordField : this.elements.passwordField;
        navigator.clipboard.writeText(pw_element.value).then(() => {
            const successMessage = document.getElementById('successMessage');
            successMessage.classList.add('show');
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 2000);
        });
    }

    async initializeEventListeners() {
        // 初始化事件監聽器
        this.elements.lengthValue.addEventListener('input', async (e) => {
            this.elements.lengthSlider.value = e.target.value;
            SMW.set_state('pwlength', e.target.value);
            await send_generate_password();
        });
        this.elements.lengthSlider.addEventListener('input', async (e) => {
            this.elements.lengthValue.value = e.target.value;
            SMW.set_state('pwlength', e.target.value);
            await send_generate_password();
        });
        this.elements.masterPasswordField.addEventListener('input', async (e) => {
            const newPw = e.target.value;
            let pw_timeout = await SMW.get_settings('forgot_password', 20);
            SMW.set_state('pw', newPw, pw_timeout);
            await send_generate_password();
        });
        this.elements.numbersCheckbox.addEventListener('change', async (e) => {
            SMW.set_state('numbersChecked', e.target.checked);
            await send_generate_password();
        });
        this.elements.uppercaseCheckbox.addEventListener('change', async (e) => {
            SMW.set_state('uppercaseChecked', e.target.checked);
            await send_generate_password();
        });
        this.elements.lowercaseCheckbox.addEventListener('change', async (e) => {
            SMW.set_state('lowercaseChecked', e.target.checked);
            await send_generate_password();
        });
        this.elements.symbolsCheckbox.addEventListener('change', async (e) => {
            SMW.set_state('symbolsChecked', e.target.checked);
            await send_generate_password();
        });
        this.elements.symbolsCharField.addEventListener('input', async (e) => {
            SMW.set_state('symbols', e.target.value);
            await send_generate_password();
        });
        this.elements.saltField.addEventListener('input', async (e) => {
            SMW.set_state('salt', e.target.value);
            await send_generate_password();
        });
        this.elements.versionField.addEventListener('input', async (e) => {
            SMW.set_state('version', e.target.value);
            await send_generate_password();
        });
        this.elements.autofillSelect.addEventListener('change', async (e) => {
            SMW.set_state('autoFillOption', e.target.value);
            await this.setAutofillOptions();
            SMW.set_state('salt', this.elements.saltField.value);
            await send_generate_password();
        });
        this.elements.settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        this.elements.generateBtn.addEventListener('click', async () => {
            this.setAllUiState();
            await send_generate_password(1); // human trigger
        });
        this.elements.generateCopyBtn.addEventListener('click', async () => {
            this.setAllUiState();
            await send_generate_password(2); // human trigger and need to copy
        });
        this.elements.resetBtn.addEventListener('click', async () => {
            await SMW.clear_all_states();
            await this.readUIState();
            await send_generate_password();
        });
        this.elements.copyBtn.addEventListener('click', () => {
            this.copyPw();
        });
    }
}

const popupManager = PopupManager.getInstance();
const uiStartUp = UIStartUp.getInstance(popupManager);
