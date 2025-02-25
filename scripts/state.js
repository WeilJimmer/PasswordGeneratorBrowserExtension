class StateManagerClient {
    static async setState(key, value, options = {}) {
        return chrome.runtime.sendMessage({
            type: 'SET_STATE',
            key,
            data: value,
            options
        });
    }
    static async getState(key) {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_STATE',
            key
        });
        return response.data;
    }
    static async deleteState(key) {
        return chrome.runtime.sendMessage({
            type: 'DELETE_STATE',
            key
        });
    }
    static async clearAll() {
        return chrome.runtime.sendMessage({
            type: 'CLEAR_ALL'
        });
    }
}