// background.js
// Author: Weil Jimmer
// Description: This file is the background script for the Chrome extension. It initializes the StateManager class and listens for messages from the content script.
// The StateManager class is responsible for managing the state of the extension and handling messages from the content script.

import { PWG } from '../modules/password.js';
import { HistoryItem } from '../modules/history.js';
import { StorageManager } from '../modules/storage.js';

var stateManager = null;

class StateManager {

    constructor() {
        this.isInitialized = false;
        this.state = new Map();
        this.cleanupTimes = new Map();
        this.storageManager = new StorageManager();
        this.ui_state = (new HistoryItem()).history; // dictionary
        this.syncInterval = null;
        this.syncIntervalTime = 5000; // 5秒檢查一次
        this.setupMessageHandler();
        this.setupAutoCleanup();
        this.init();
    }

    sendHistoryResult(history) {
        try{
            chrome.runtime.sendMessage({type: 'HISTORY_RESULT', data: history});
        }catch(error){
            console.error('Failed to send history result:', error);
        }
    }

    sendPasswordResult(password, checksum, is_password_saved = false, parameters = null, mode = 0) {
        try{
            chrome.runtime.sendMessage({
                type: 'PASSWORD_GENERATED',
                data: {
                    password: password,
                    checksum: checksum,
                    need_copy: mode===2
                }
            });
        }catch(error){
            console.error('Failed to send password result:', error);
        }
        // save history
        if (parameters!=null && this.storageManager!=null && mode>=1){
            let is_parameter_saved = this.getSettings("remember_generated_parameter_into_history", true);
            let historyItem = new HistoryItem();
            historyItem.history.pw = (is_password_saved ? password : '');
            if (is_parameter_saved){
                historyItem.setFromMap(parameters);
            }
            if (is_parameter_saved || is_password_saved){
                historyItem.packHistory();
                this.storageManager.addHistoryItem(historyItem);
            }
        }
    }

    async getPopupContext() {
        try {
            const contexts = await chrome.runtime.getContexts({
                contextTypes: ['POPUP']
            });
            return contexts.length > 0 ? contexts[0] : null;
        } catch (error) {
            console.error('Failed to get popup context:', error);
            return null;
        }
    }

    async sendMessageToPopup(message) {
        const popupContext = await this.getPopupContext();
        if (popupContext) {
            try {
                const response = await chrome.runtime.sendMessage(message);
                return response;
            } catch (error) {
                console.log('Send message error:', error);
            }
        } else {
            console.log('Popup is not open');
        }
    }

    async init() {
        this.storageManager = new StorageManager();
        this.storageManager.loadStorage();
        this.syncUIState();
        this.isInitialized = true;
        this.startSyncInterval();
    }

    startSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            this.checkAndSync();
        }, this.syncIntervalTime);
        console.log(`Sync interval started: checking every ${this.syncIntervalTime/1000} seconds`);
    }

    stopSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Sync interval stopped');
        }
    }

    async checkAndSync(force_save=false) {
        if (this.storageManager!=null){
            if (this.getSettings("storge_cloud_sync", false)){
                await this.storageManager.checkAndSync(force_save);
                console.log('Synced storage to cloud');
            }
        }
    }

    async generatePassword(map, saved=false, mode=0) {
        let length = map.pwlength;
        let symbols_char = map.symbols;
        let numbers_checked = map.numbersChecked;
        let symbols_checked = map.symbolsChecked;
        let uppercase_checked = map.uppercaseChecked;
        let lowercase_checked = map.lowercaseChecked;
        if (!numbers_checked && !uppercase_checked && !lowercase_checked && !symbols_checked) {
            this.sendPasswordResult('至少勾選一種類別', 'ERROR');
            return;
        }
        let charset = '';
        let password = '';
        if (numbers_checked){ charset += '0123456789';}
        if (uppercase_checked){ charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';}
        if (lowercase_checked){ charset += 'abcdefghijklmnopqrstuvwxyz';}
        if (symbols_checked){ charset += symbols_char;}
        for (let i = 0; i < length; i++) {
            var byte = new Uint8Array(1);
            crypto.getRandomValues(byte);
            var randomIndex = byte[0] % charset.length;
            password += charset.charAt(randomIndex);
        }
        this.sendPasswordResult(password, 'RANDOM', saved, map, mode);
    }

    async generateSlavePassword(map, saved=false, mode=0){
        let uppercase_checked = map.uppercaseChecked;
        let lowercase_checked = map.lowercaseChecked;
        let numbers_checked = map.numbersChecked;
        let symbols_checked = map.symbolsChecked;
        let symbols_char = map.symbols;
        let version = map.version;
        let length = map.pwlength;
        let salt = map.salt;
        let master_password = map.pw;
        if (master_password.length == 0) {
            this.sendPasswordResult('主密碼不可為空！', 'ERROR');
            return '';
        }
        let charset = '';
        if (numbers_checked){ charset += '0123456789';}
        if (uppercase_checked){ charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';}
        if (lowercase_checked){ charset += 'abcdefghijklmnopqrstuvwxyz';}
        if (symbols_checked){ charset += symbols_char;}

        const result = await PWG.generateSlavePassword(master_password, `${version}:${salt}`, charset, length);

        this.sendPasswordResult(result[0], result[1], saved, map, mode);
    }

    setupMessageHandler() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                switch (message.type) {
                    case 'CHECK_INIT_STATUS':
                        sendResponse({ isInitialized: this.isInitialized });
                        break;
                    case 'HEARTBEAT':
                        sendResponse({ success: true });
                        break;
                    case 'GET_STATE':
                        sendResponse({ success: true, data: this.getUIState(message.key) });
                        break;
                    case 'SET_STATE':
                        this.setUIState(message.key, message.data, message.options);
                        sendResponse({ success: true });
                        break;
                    case 'CLEAR_ALL_STATES':
                        this.ui_state = (new HistoryItem()).history; // dictionary
                        if (this.storageManager!=null){
                            this.storageManager.clearUIState();
                        }
                        this.cleanupTimes.clear();
                        sendResponse({ success: true });
                        break;
                    case 'GET_SETTINGS':
                        sendResponse({ success: true, data: this.getSettings(message.key) });
                        break;
                    case 'SET_SETTINGS':
                        sendResponse({ success: this.setSettings(message.key, message.data) });
                        break;
                    case 'SAVE_SETTINGS':
                        if (this.storageManager!=null){
                            this.storageManager.saveSettingsToLocal();
                            sendResponse({ success: true });
                        }else{
                            console.error('StorageManager is not initialized.');
                            sendResponse({ success: false });
                        }
                        break;
                    case 'GET_HISTORYS':
                        if (this.storageManager!=null){
                            sendResponse({ success: true, data: this.storageManager.getHistory() });
                        }else{
                            console.error('StorageManager is not initialized.');
                            sendResponse({ success: false, data: [] });
                        }
                        break;
                    case 'DELETE_HISTORY':
                        if (this.storageManager!=null){
                            sendResponse({ success: this.storageManager.deleteHistoryItem(message.key, message.timestamp) });
                        }else{
                            console.error('StorageManager is not initialized.');
                            sendResponse({ success: false });
                        }
                        break;
                    case 'CLEAR_HISTORY':
                        if (this.storageManager!=null){
                            this.storageManager.clearHistory();
                            sendResponse({ success: true });
                        }else{
                            console.error('StorageManager is not initialized.');
                            sendResponse({ success: false });
                        }
                        break;
                    case 'SEARCH_HISTORY':
                        if (this.storageManager!=null){
                            sendResponse({ success: true, found: this.storageManager.searchAndApplyHistory(message.key) });
                        }else{
                            console.error('StorageManager is not initialized.');
                            sendResponse({ success: false, found: false });
                        }
                        break;
                    case 'GENERATE_PASSWORD':
                        let trigger = message.mode; // 0: event trigger = always don't save in history, 1: human trigger
                        if (this.ui_state.pw.length == 0) {
                            this.generatePassword( this.ui_state, this.getSettings("remember_generated_random_password_into_history", true), trigger);
                        } else {
                            this.generateSlavePassword(this.ui_state, this.getSettings("remember_generated_fixed_password_into_history", false), trigger);
                        }
                        sendResponse({ success: true, status: 'processing' });
                        break;
                    default:
                        sendResponse({ success: false, error: 'Invalid message type' });
                }
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
        });
    }

    getUIState(key, _default = null) {
        if (this.storageManager!=null){
            return this.storageManager.getUIState(key);
        }
        if (key in this.ui_state) {
            console.error('storage not ready, use memory value.');
            return this.ui_state[key];
        }
        return _default;
    }

    setUIState(key, value, options = {ttl:10}) {
        if (this.storageManager!=null){
            this.storageManager.setUIState(key, value);
            this.syncUIState();
        }else{
            console.error('StorageManager is not initialized. set value to memory.');
            this.ui_state[key] = value;
        }
        if (options.ttl>0) {
            if (this.cleanupTimes.has(key)) {
                clearTimeout(this.cleanupTimes.get(key));
            }
            const timeoutId = setTimeout(() => {
                let default_value = new HistoryItem().history[key];
                this.setUIState(key, default_value, {ttl:0});
                this.cleanupTimes.delete(key);
            }, options.ttl);
            this.cleanupTimes.set(key, timeoutId);
        }
    }

    setSettings(key, value) {
        if (this.storageManager!=null){
            this.storageManager.setSettings(key, value);
            return true;
        }
        return false;
    }

    getSettings(key, _default = null) {
        if (this.storageManager!=null){
            return this.storageManager.getSettings(key);
        }
        return _default
    }

    setupAutoCleanup() {
        chrome.runtime.onSuspend.addListener(() => {
            this.state.clear();
            this.cleanupTimes.forEach(timeoutId => clearTimeout(timeoutId));
            this.cleanupTimes.clear();
        });
    }

    syncUIState() {
        if (this.storageManager!=null){
            this.ui_state = this.storageManager.getUIState(); //return dictionary
        }
    }

}


if (stateManager === null) {
    console.log('init StateManager');
    stateManager = new StateManager();
}

chrome.runtime.onInstalled.addListener(async (details) => {
    switch (details.reason) {
        case 'install':
            console.log('plugin install first time');
            break;
        case 'update':
            console.log(`plugin update from version ${details.previousVersion}.`);
            break;
        case 'chrome_update':
            console.log('Chrome update');
            break;
        case 'shared_module_update':
            console.log('module update');
            break;
    }
    if (stateManager === null) {
        stateManager = new StateManager();
    }
});

chrome.runtime.onSuspend.addListener(async () => {
    console.log('Service Worker has been killing...');
    if (stateManager !== null) {
        await stateManager.checkAndSync();
        console.log('storage saved!');
    }
});