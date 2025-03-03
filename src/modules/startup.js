// startup.js
// Author: Weil Jimmer
// Description: This file contains the UIStartUp class that is used to initialize the UI of the popup window.
// The UIStartUp class is responsible for setting up the UI elements and checking the status of the background script.

console.log('===== startup.js loaded =====', new Date().toISOString());

export class UIStartUp {
    static _instance = null;
    static getInstance(manager) {
        if (!UIStartUp._instance) {
            UIStartUp._instance = new UIStartUp(manager);
        }
        return UIStartUp._instance;
    }
    constructor(manager) {
        if (UIStartUp._instance) {
            return UIStartUp._instance;
        }
        UIStartUp._instance = this;
        this._initialized = false;
        this.initUI();
        this.manager = manager;
        this.backgroundReady = false;
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

    async initUI(){
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        // translate all elements with lang attribute
        document.querySelectorAll('data-lang').forEach(elem => {
            const code = elem.innerText;
            elem.setAttribute('data-lang', code);
            elem.innerText = chrome.i18n.getMessage(code);
        });
        document.querySelectorAll('[local-placeholder]').forEach(elem => {
            elem.placeholder = chrome.i18n.getMessage(elem.getAttribute("local-placeholder"));
        });
        document.querySelectorAll('[local-title]').forEach(elem => {
            elem.title = chrome.i18n.getMessage(elem.getAttribute("local-title"));
        });
        document.querySelectorAll('[local-value]').forEach(elem => {
            elem.value = chrome.i18n.getMessage(elem.getAttribute("local-value"));
        });
        document.querySelectorAll('[data-lang]').forEach(elem => {
            elem.innerText = chrome.i18n.getMessage(elem.getAttribute("data-lang"))
        });
        await this.checkBackgroundStatus();
    }

    activateServiceWorker() {
        return new Promise((resolve) => {
            console.log('activating background service worker...');
            const port = chrome.runtime.connect({ name: 'popup-wake' });
            port.onDisconnect.addListener(() => {
                console.log('background service worker activated');
            });
            setTimeout(() => {
                port.disconnect();
                resolve();
            }, 50);
        });
    }

    async checkBackgroundStatus() {
        try {
            await this.activateServiceWorker();
            const status = await this.sendMessage('CHECK_INIT_STATUS');
            if (status && status.isInitialized) {
                this.onBackgroundReady();
            } else {
                this.waitForInitialization();
            }
        } catch (error) {
            console.error('Failed to check background status:', error);
            this.waitForInitialization();
        }
    }

    waitForInitialization(attempt = 1, maxAttempts = 10) {
        document.getElementById('loading').style.display = 'block';
        if (attempt > maxAttempts) {
            console.error('Failed to initialize after', maxAttempts, 'attempts');
            document.getElementById('block_message').textContent = 'Error: Failed to initialize background script!';
            return;
        }
        console.log(`Waiting for background initialization... Attempt ${attempt}/${maxAttempts}`);
        const delay_times = [30, 50, 100, 200, 200, 500, 500, 600, 600, 800, 1000, 1000];
        const delay = delay_times[delay_times.length%(attempt-1)];
        setTimeout(async () => {
            try {
                const status = await this.sendMessage('CHECK_INIT_STATUS');
                if (status && status.isInitialized) {
                    this.onBackgroundReady();
                } else {
                    this.waitForInitialization(attempt + 1, maxAttempts);
                }
            } catch (error) {
                console.error('Attempt', attempt, 'failed:', error);
                this.waitForInitialization(attempt + 1, maxAttempts);
            }
        }, delay);
    }

    async onBackgroundReady() {
        document.getElementById('loading').style.display = 'none';
        if (this.backgroundReady){
            console.log('Background is already ready');
            return;
        }
        this.backgroundReady = true;
        await this.manager.init();
    }
}