export class StateManagerClient {
    static async setState(key, value, options = {}) {
        return await chrome.runtime.sendMessage({
            type: 'SET_STATE',
            key: key,
            data: value,
            options: options
        });
    }
    static async getState(key) {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_STATE',
            key: key
        });
        return response.data;
    }
    static async clearAllStates() {
        return await chrome.runtime.sendMessage({
            type: 'CLEAR_ALL_STATES'
        });
    }
    static async setSettings(key, value) {
        return await chrome.runtime.sendMessage({
            type: 'SET_SETTINGS',
            key: key,
            data: value
        });
    }
    static async getSettings(key) {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_SETTINGS',
            key: key
        });
        return response.data;
    }
    static async saveSettings() {
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS'
        });
        return response.success;
    }
    static async getHistorys() {
        return await chrome.runtime.sendMessage({
            type: 'GET_HISTORYS'
        });
    }
    static async deleteHistory(_index, _timestamp) {
        return await chrome.runtime.sendMessage({
            type: 'DELETE_HISTORY',
            key: _index,
            timestamp: _timestamp
        });
    }
    static async clearHistory() {
        return await chrome.runtime.sendMessage({
            type: 'CLEAR_HISTORY'
        });
    }
    static async searchHistory(_salt) {
        return await chrome.runtime.sendMessage({
            type: 'SEARCH_HISTORY',
            key: _salt
        });
    }
}

export class SMW {
    static async set_state(_key,_value,_ttl=-1) {
        await StateManagerClient.setState(_key, _value, { ttl: _ttl * 1000 });
    }
    static async get_state(_key, _default=null) {
        const _value = await StateManagerClient.getState(_key);
        if (_value!=null && _value!=undefined) return _value;
        return _default;
    }
    static async clear_all_states() {
        await StateManagerClient.clearAllStates();
    }
    static async set_settings(_key,_value) {
        await StateManagerClient.setSettings(_key, _value);
    }
    static async get_settings(_key, _default=null) {
        const _value = await StateManagerClient.getSettings(_key);
        if (_value!=null && _value!=undefined) return _value;
        return _default;
    }
    static async save_all() {
        return await StateManagerClient.saveSettings();
    }
    static async get_historys() {
        return await StateManagerClient.getHistorys();
    }
    static async delete_history(_index, _timestamp) {
        return await StateManagerClient.deleteHistory(_index, _timestamp);
    }
    static async clear_history() {
        return await StateManagerClient.clearHistory();
    }
    static async search_history(_salt) {
        return await StateManagerClient.searchHistory(_salt);
    }
}