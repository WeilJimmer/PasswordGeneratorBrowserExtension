// options.js
// Author: Weil Jimmer

import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

import '../modules/theme.js';
import '../modules/heartbeat.js';
import { SMW } from '../modules/state.js';
import { UIStartUp } from '../modules/startup.js';

console.log('===== options.js loaded =====', new Date().toISOString());

class OptionsManager {
    static _instance = null;
    static getInstance() {
        if (!OptionsManager._instance) {
            OptionsManager._instance = new OptionsManager();
        }
        return OptionsManager._instance;
    }
    constructor() {
        if (OptionsManager._instance) {
            return OptionsManager._instance;
        }
        OptionsManager._instance = this;
        this._initialized = false;
        this.currentTab = 'settings';
        this.history = [];
        this.elements = {
            sourceCodeLink: document.getElementById('sourceCodeLink'),
            descriptSpan: document.getElementById('descriptSpan'),
            versionSpan: document.getElementById('versionSpan'),
        };
        this.settingsUI = {
            remember_generated_random_password_into_history: document.getElementById('remember_generated_random_password_into_history'),
            remember_generated_fixed_password_into_history: document.getElementById('remember_generated_fixed_password_into_history'),
            remember_generated_parameter_into_history: document.getElementById('remember_generated_parameter_into_history'),
            remember_last_parameters: document.getElementById('remember_last_parameters'),
            remember_master_password: document.getElementById('remember_master_password'),
            auto_search_history: document.getElementById('auto_search_history'),
            hide_generated_pw: document.getElementById('hide_generated_pw'),
            storge_cloud_sync: document.getElementById('storge_cloud_sync'),
            forgot_password: document.getElementById('forgot_password'),
            max_history: document.getElementById('max_history'),
        };
        this.historyUI = {
            refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
            historyTableBody: document.getElementById('historyTableBody'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        };
        this.exportUI = {
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            copyBtn: document.getElementById('copyBtn'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            importFileInput: document.getElementById('importFileInput'),
            importTextArea: document.getElementById('importTextArea'),
        }
    }

    async init() {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        this.initAboutUI();
        this.initExportUI();
        this.initHistoryUI();
        this.initSettingsUI();
        this.setupEventListeners();
    }

    initAboutUI() {
        console.log('initAboutUI');
        let version = chrome.runtime.getManifest().version;
        let description = chrome.runtime.getManifest().description;
        let sourceCodeURL = chrome.runtime.getManifest().homepage_url;
        this.elements.versionSpan.innerText = version;
        this.elements.descriptSpan.innerText = description;
        this.elements.sourceCodeLink.innerText = sourceCodeURL;
        this.elements.sourceCodeLink.href = sourceCodeURL;
    }

    async initExportUI() {
        console.log('initExportUI');
        this.exportUI.exportBtn.addEventListener('click', async () => {
            this.exportUI.importTextArea.value = await SMW.get_dump_storage_data();
        });
        this.exportUI.importBtn.addEventListener('click', async () => {
            SMW.set_dump_storage_data(this.exportUI.importTextArea.value);
        });
        this.exportUI.copyBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(this.exportUI.importTextArea.value);
            this.showMessage(chrome.i18n.getMessage('message_copied_to_clipboard'));
        });
        this.exportUI.clearAllBtn.addEventListener('click', async () => {
            this.exportUI.importTextArea.value = '';
        });
    }

    async initSettingsUI() {
        console.log('initSettingsUI');
        for (let key in this.settingsUI) {
            let v = await SMW.get_settings(key);
            console.log(key, v);
            if (v != null) {
                if (this.settingsUI[key].type == 'checkbox') {
                    this.settingsUI[key].checked = v;
                } else {
                    this.settingsUI[key].value = v;
                }
            }
        }
    }

    initHistoryUI() {
        console.log('initHistoryUI');
        this.historyUI.refreshHistoryBtn.addEventListener('click', () => {
            this.refreshHistory();
        });
        this.historyUI.clearHistoryBtn.addEventListener('click', () => {
            SMW.clear_history();
            this.refreshHistory();
        });
    }

    setupEventListeners() {
        // tab switch
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        // submit settings form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (SMW.save_all()){
                this.showMessage(chrome.i18n.getMessage('message_settings_saved'));
            }else{
                this.showMessage(chrome.i18n.getMessage('message_settings_saved_error'), 'error');
            }
        });
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STORAGE_IMPORT_RESULT') {
                if (message.success) {
                    this.showMessage(chrome.i18n.getMessage('message_import_success'));
                } else {
                    this.showMessage(chrome.i18n.getMessage('message_import_fail'), 'error');
                }
            }
        });
        this.settingsUI.remember_generated_random_password_into_history.addEventListener('change', (e) => {
            SMW.set_settings('remember_generated_random_password_into_history', e.target.checked);
        });
        this.settingsUI.remember_generated_fixed_password_into_history.addEventListener('change', (e) => {
            SMW.set_settings('remember_generated_fixed_password_into_history', e.target.checked);
        });
        this.settingsUI.remember_generated_parameter_into_history.addEventListener('change', (e) => {
            SMW.set_settings('remember_generated_parameter_into_history', e.target.checked);
            if (!e.target.checked){
                SMW.set_settings('remember_generated_random_password_into_history', false);
                SMW.set_settings('remember_generated_fixed_password_into_history', false);
                this.settingsUI.remember_generated_random_password_into_history.checked = false;
                this.settingsUI.remember_generated_fixed_password_into_history.checked = false;
            }
        });
        this.settingsUI.remember_last_parameters.addEventListener('change', (e) => {
            SMW.set_settings('remember_last_parameters', e.target.checked);
        });
        this.settingsUI.remember_master_password.addEventListener('change', (e) => {
            SMW.set_settings('remember_master_password', e.target.checked);
            if (e.target.checked){
                SMW.set_settings('forgot_password', 0);
                this.settingsUI.forgot_password.value = 0;
            }
        });
        this.settingsUI.auto_search_history.addEventListener('change', (e) => {
            SMW.set_settings('auto_search_history', e.target.checked);
        });
        this.settingsUI.hide_generated_pw.addEventListener('change', (e) => {
            SMW.set_settings('hide_generated_pw', e.target.checked);
        });
        this.settingsUI.storge_cloud_sync.addEventListener('change', (e) => {
            SMW.set_settings('storge_cloud_sync', e.target.checked);
        });
        this.settingsUI.forgot_password.addEventListener('change', (e) => {
            let _v = parseInt(e.target.value);
            if (isNaN(_v)){
                _v = 20;
            }else{
                if (_v < 0 || _v > 60){
                    _v = 20;
                }
            }
            if (_v > 0){
                SMW.set_settings('remember_master_password', false);
                this.settingsUI.remember_master_password.checked = false;
            }
            SMW.set_settings('forgot_password', _v); // unit: seconds
        });
        this.settingsUI.max_history.addEventListener('change', (e) => {
            let _v = parseInt(e.target.value);
            if (isNaN(_v)){
                _v = 100;
            }else{
                if (_v < 0 || _v > 1000){
                    _v = 100;
                }
            }
            SMW.set_settings('max_history', _v);
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active',
            item.getAttribute('data-tab') === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        this.currentTab = tabId;
        if (tabId === 'history') {
            this.refreshHistory();
        }
    }

    async loadSettings() {
        try {
            const data = await chrome.storage.sync.get('settings');
                this.settings = data.settings || {
                autoSaveInterval: 5,
                enableNotifications: true
            };
            this.updateSettingsForm();
        } catch (error) {
            console.error('loading settings fail:', error);
        }
    }

    updateSettingsForm() {
        const form = document.getElementById('settingsForm');
        form.autoSaveInterval.value = this.settings.autoSaveInterval;
        form.enableNotifications.checked = this.settings.enableNotifications;
    }

    async loadHistory() {
        try {
            const response = await SMW.get_historys();
            if (response.success){
                this.history = response.data;
            }else{
                this.history = [];
            }
            this.updateHistoryTable();
        } catch (error) {
            console.error('loading history fail:', error);
        }
    }

    parseParameters(history_dict) {
        let text = '';
        if (!history_dict.is_initial_valuies){
            if (history_dict.numbersChecked){
                text += '0-9';
            }
            if (history_dict.lowercaseChecked){
                text += 'a-z';
            }
            if (history_dict.uppercaseChecked){
                text += 'A-Z';
            }
            if (history_dict.symbolsChecked){
                text += history_dict.symbols;
            }
        }
        if (text!=''){
            text = `【${text}】**${parseInt(history_dict.pwlength)}`;
        }else{
            text = '＜NoParameters＞';
        }
        return text;
    }

    async copyPw(pw) {
        try {
            await navigator.clipboard.writeText(pw);
            this.showMessage(chrome.i18n.getMessage('message_copied_to_clipboard'));
        } catch (err) {
            console.error('copy fail:', err);
            this.showMessage(chrome.i18n.getMessage('message_copied_to_clipboard_fail'), 'error');
        }
    }

    updateHistoryTable() {
        const tbody = this.historyUI.historyTableBody;
        if (!tbody) return;
        tbody.innerHTML = '';
        for (let i=0; i<this.history.length; i++){
            let item = this.history[i];
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            let div1 = document.createElement('div');
            div1.classList.add('of');
            div1.innerText = '【'+(i+1)+'】'+new Date(item.timestamp).toLocaleString();
            td1.appendChild(div1);
            tr.appendChild(td1);
            let td2 = document.createElement('td');
            let div2 = document.createElement('div');
            div2.classList.add('of');
            div2.innerText = this.parseParameters(item);
            td2.appendChild(div2);
            tr.appendChild(td2);
            let td3 = document.createElement('td');
            let div3 = document.createElement('div');
            div3.classList.add('of');
            div3.innerText = item.salt;
            td3.appendChild(div3);
            tr.appendChild(td3);
            let td4 = document.createElement('td');
            let div4 = document.createElement('div');
            div4.classList.add('of');
            div4.innerText = item.pw;
            td4.appendChild(div4);
            tr.appendChild(td4);
            let td5 = document.createElement('td');
            let copyBtn = document.createElement('button');
            copyBtn.classList.add('btn', 'btn-primary');
            copyBtn.innerText = chrome.i18n.getMessage('button_copy');
            copyBtn.addEventListener('click', () => {
                this.copyPw(item.pw);
            });
            td5.appendChild(copyBtn)
            td5.appendChild(document.createTextNode(' '));
            let clearBtn = document.createElement('button');
            clearBtn.classList.add('btn', 'btn-primary');
            clearBtn.innerText = chrome.i18n.getMessage('button_delete');
            clearBtn.addEventListener('click', () => {
                SMW.delete_history(i, item.timestamp);
                this.refreshHistory();
            });
            td5.appendChild(clearBtn);
            tr.appendChild(td5);
            tbody.appendChild(tr);
        }

    }

    refreshHistory() {
        this.loadHistory();
        this.showMessage(chrome.i18n.getMessage('message_history_updated'));
    }

    showMessage(message, type = 'success') {
        toastr[type](message);
    }
}

// 初始化
toastr.options = {
    positionClass: 'toast-bottom-right',
    timeOut: 1000,
};

const optionsManager = OptionsManager.getInstance();
const uiStartUp = UIStartUp.getInstance(optionsManager);
