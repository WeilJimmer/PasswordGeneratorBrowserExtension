// storage.js
// Author: Weil Jimmer
// Description: This file contains the StorageManager class which is responsible for managing the storage of the extension.
// The storage includes settings, history, and UI state.

import { BitPacker } from './bitpacker.js';
import { HistoryItem } from './history.js';
import { DEFAULT_CONST } from './constants.js';

export class StorageManager {
    constructor() {
        this.ui_state_history_obj = new HistoryItem().packHistory();
        this.settings_schema = [
            'bool', // remember_generated_random_password_into_history
            'bool', // remember_generated_fixed_password_into_history
            'bool', // remember_generated_parameter_into_history
            'bool', // remember_last_parameters
            'bool', // remember_master_password
            'bool', // auto_search_history
            'bool', // hide_generated_pw
            'bool', // storge_cloud_sync
            'int',  // forgot_password
            'int',  // max_history
        ];
        this.settings = {
            remember_generated_random_password_into_history: true, // if need to save password (random) to history
            remember_generated_fixed_password_into_history: false, // if need to save password (fixed) to history
            remember_generated_parameter_into_history: true,       // if need to save parameters to history
            remember_last_parameters: false,                       // if need to save it to storage and load it at startup
            remember_master_password: false,                       // if need to save it to storage and load it at startup
            auto_search_history: true,                             // if need to automatically search history (same salt) and fill the form
            hide_generated_pw: false,                              // if need to hide generated password in ui
            storge_cloud_sync: true,                               // if need to sync with cloud
            forgot_password: 20,                                   // forgot master password in memory (unit: seconds)
            max_history: 100,                                      // max number of saved history
        };
        this.history = []; // list of HistoryItem
        this.localStorageData = {s: '', u: '', h: '', t: ''};
        this.cloudStorageData = {s: '', u: '', h: '', t: ''};
    }

    packTimestamp() {
        const packer = new BitPacker();
        return packer.pack(['timestamp'], [Date.now()]); // base64 string
    }

    unpackTimestamp(base64String) {
        const packer = new BitPacker();
        const unpacked = packer.unpack(['timestamp'], base64String);
        return unpacked[0];
    }

    packSettings() {
        const packer = new BitPacker();
        // order is important
        return packer.pack(this.settings_schema, [
            this.settings.remember_generated_random_password_into_history,
            this.settings.remember_generated_fixed_password_into_history,
            this.settings.remember_generated_parameter_into_history,
            this.settings.remember_last_parameters,
            this.settings.remember_master_password,
            this.settings.auto_search_history,
            this.settings.hide_generated_pw,
            this.settings.storge_cloud_sync,
            this.settings.forgot_password,
            this.settings.max_history,
        ]); // base64 string
    }

    unpackSettings(base64String) {
        const packer = new BitPacker();
        const unpacked = packer.unpack(this.settings_schema, base64String);
        // order is important
        this.settings.remember_generated_random_password_into_history = unpacked[0];
        this.settings.remember_generated_fixed_password_into_history = unpacked[1];
        this.settings.remember_generated_parameter_into_history = unpacked[2];
        this.settings.remember_last_parameters = unpacked[3];
        this.settings.remember_master_password = unpacked[4];
        this.settings.auto_search_history = unpacked[5];
        this.settings.hide_generated_pw = unpacked[6];
        this.settings.storge_cloud_sync = unpacked[7];
        this.settings.forgot_password = unpacked[8];
        this.settings.max_history = unpacked[9];
    }

    packHistoryList() {
        let h = '';
        for (let i = 0; i < this.history.length; i++) {
            h += this.history[i].getPackedString() + ',';
        }
        if (h.length > 0) {
            h = h.slice(0, -1); // remove last comma
        }
        return h;
    }

    packUIState() {
        let clone_ui_state = new HistoryItem(
            this.ui_state_history_obj.history.lowercaseChecked,
            this.ui_state_history_obj.history.uppercaseChecked,
            this.ui_state_history_obj.history.numbersChecked,
            this.ui_state_history_obj.history.symbolsChecked,
            this.ui_state_history_obj.history.autoFillOption,
            this.ui_state_history_obj.history.pwlength,
            this.ui_state_history_obj.history.version,
            this.ui_state_history_obj.history.symbols,
            this.ui_state_history_obj.history.salt,
            this.ui_state_history_obj.history.pw
        );
        if (!this.settings.remember_last_parameters){
            clone_ui_state.history.lowercaseChecked = DEFAULT_CONST.LOWERCASE_CHECKED;
            clone_ui_state.history.uppercaseChecked = DEFAULT_CONST.UPPERCASE_CHECKED;
            clone_ui_state.history.numbersChecked = DEFAULT_CONST.NUMBERS_CHECKED;
            clone_ui_state.history.symbolsChecked = DEFAULT_CONST.SYMBOLS_CHECKED;
            clone_ui_state.history.autoFillOption = DEFAULT_CONST.AUTOFILL_OPTION;
            clone_ui_state.history.pwlength = DEFAULT_CONST.LENGTH;
            clone_ui_state.history.symbols = DEFAULT_CONST.SYMBOLS_CHAR;
            clone_ui_state.history.version = DEFAULT_CONST.VERSION;
            clone_ui_state.history.salt = DEFAULT_CONST.SALT;
        }
        if (!this.settings.remember_master_password){
            clone_ui_state.history.pw = '';
        }
        return clone_ui_state.getPackedString(true);
    }

    async loadStorage() {
        const local_data = await chrome.storage.local.get(null); // get all local data
        const cloud_data = await chrome.storage.sync.get(null);  // get all cloud data
        let timestamp_local = 0;
        let timestamp_cloud = 0;
        if ('t' in local_data && local_data.t.length > 0) {
            timestamp_local = this.unpackTimestamp(local_data.t);
            this.localStorageData.t = local_data.t;
            this.localStorageData.s = local_data.s;
            this.localStorageData.u = local_data.u;
            this.localStorageData.h = local_data.h;
        }
        if ('t' in cloud_data && cloud_data.t.length > 0) {
            timestamp_cloud = this.unpackTimestamp(cloud_data.t);
            this.cloudStorageData.t = cloud_data.t;
            this.cloudStorageData.s = cloud_data.s;
            this.cloudStorageData.u = cloud_data.u;
            this.cloudStorageData.h = cloud_data.h;
        }
        if (timestamp_local > timestamp_cloud) { // load the latest data (local)
            // load local data
            await this.loadSettingsAndHistory(local_data);
        } else {
            // load cloud data
            await this.loadSettingsAndHistory(cloud_data);
            if (!this.settings.storge_cloud_sync) {
                // save cloud data to local
                await this.saveStorageToLocal();
                // clear cloud data
                await chrome.storage.sync.clear();
                this.cloudStorageData = {s: '', u: '', h: '', t: ''};
            }
        }
    }

    async loadSettingsAndHistory(data){
        if ('s' in data && data.s.length > 0) {
            this.unpackSettings(data.s);
        }
        if ('u' in data && data.u.length > 0) {
            this.ui_state_history_obj.unpackHistory(data.u);
        }
        if ('h' in data && data.h.length > 0) {
            this.loadHistoryList(data.h);
        }
    }

    async loadHistoryList(h) {
        let h_array = h.split(',');
        let h_count = 0;
        for (let i = 0; i < h_array.length; i++) {
            this.history.push(new HistoryItem().unpackHistory(h_array[i]));
            h_count++;
            if (h_count >= this.settings.max_history) {
                break;
            }
        }
    }

    async addHistoryItem(history_item) {
        this.history.unshift(history_item);
        while (this.history.length > this.settings.max_history) {
            this.history.pop();
        }
        await this.saveHistoryToLocal();
    }

    searchAndApplyHistory(_salt) {
        if (_salt.length === 0) return false;
        for (let i = 0; i < this.history.length; i++) {
            if (this.history[i].history.salt === _salt) {
                this.ui_state_history_obj.setFromMap(this.history[i].history).packHistory();
                return true;
            }
        }
        return false;
    }

    async saveSettingsToLocal() {
        this.localStorageData.s = this.packSettings();
        this.localStorageData.u = this.packUIState();
        this.localStorageData.t = this.packTimestamp();
        chrome.storage.local.set({ s: this.localStorageData.s, u: this.localStorageData.u, t: this.localStorageData.t });
    }

    async saveHistoryToLocal() {
        this.localStorageData.h = this.packHistoryList();
        this.localStorageData.t = this.packTimestamp();
        chrome.storage.local.set({ h: this.localStorageData.h, t: this.localStorageData.t });
    }

    async saveStorageToLocal() {
        await this.saveSettingsToLocal();
        await this.saveHistoryToLocal();
    }

    async clearAllStorage() {
        this.localStorageData = {s: '', u: '', h: '', t: ''};
        this.cloudStorageData = {s: '', u: '', h: '', t: ''};
        chrome.storage.local.clear();
        chrome.storage.sync.clear();
    }

    async checkAndSync(pack_again=false) {
        let state_code = 0; // 0: no sync, 1: sync to cloud, 2: cloud is latest
        if (pack_again){
            this.localStorageData.t = this.packTimestamp();
            this.localStorageData.s = this.packSettings();
            this.localStorageData.h = this.packHistoryList();
            this.localStorageData.u = this.packUIState();
        }else{
            // check if the data is changed
            let sync_data = {};
            if (this.localStorageData.s !== this.cloudStorageData.s) {
                sync_data.s = this.localStorageData.s;
            }
            if (this.localStorageData.u !== this.cloudStorageData.u) {
                sync_data.u = this.localStorageData.u;
            }
            if (this.localStorageData.h !== this.cloudStorageData.h) {
                sync_data.h = this.localStorageData.h;
            }
            if (this.localStorageData.t !== this.cloudStorageData.t) {
                sync_data.t = this.localStorageData.t;
            }
            if (Object.keys(sync_data).length > 0) {
                chrome.storage.sync.set(sync_data);
                state_code = 1;
            }else{
                state_code = 2;
            }
            this.cloudStorageData = {s: this.localStorageData.s, u: this.localStorageData.u, h: this.localStorageData.h, t: this.localStorageData.t};
        }
        console.log('Sync state: ' + state_code);
        return state_code;
    }

    getSettings(_key=null) {
        if (_key!==null) {
            if (_key in this.settings) {
                return this.settings[_key];
            } else {
                return null;
            }
        } else {
            // return dictionary
            return this.settings;
        }
    }

    async setSettings(_key, _value) {
        if (_key in this.settings) {
            if (typeof _value !== typeof this.settings[_key]) {
                console.error('Type mismatch: ' + _key + ' is of type ' + typeof this.settings[_key]);
                return;
            }
            this.settings[_key] = _value;
            await this.saveSettingsToLocal();
        }
    }

    getUIState(_key=null) {
        if (_key!==null) {
            if (_key in this.ui_state_history_obj.history) {
                return this.ui_state_history_obj.history[_key];
            } else {
                return null;
            }
        } else {
            // return dictionary
            return this.ui_state_history_obj.history;
        }
    }

    async setUIState(_key, _value) {
        this.ui_state_history_obj.setState(_key, _value);
        await this.saveSettingsToLocal();
    }

    clearUIState() {
        this.ui_state_history_obj = new HistoryItem().packHistory();
    }

    getHistory() {
        let history_dict = [];
        for (let i = 0; i < this.history.length; i++) {
            history_dict.push(this.history[i].history);
        }
        return history_dict;
    }

    deleteHistoryItem(_index, timstamp=0) {
        if (_index >= 0 && _index < this.history.length) {
            let target = this.history[_index];
            if (timstamp > 0 && target.timestamp !== timstamp) {
                // find the index of the target by timestamp
                _index = -1;
                for (let i = 0; i < this.history.length; i++) {
                    if (this.history[i].timestamp === timstamp) {
                        _index = i;
                        break;
                    }
                }
            }
            if (_index >= 0) {
                this.history.splice(_index, 1);
                this.saveHistoryToLocal();
            }
        }
        return true;
    }

    clearHistory() {
        this.history = [];
        this.saveHistoryToLocal();
        return true;
    }
}