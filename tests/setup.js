import { chrome } from 'jest-chrome';

global.chrome = chrome;

chrome.runtime.getURL.mockImplementation(path => `chrome-extension://passwordgeneratorbrowserextension/${path}`);

const mockStorage = {};
chrome.storage.local.get.mockImplementation((keys, callback) => {
  let result = {};
  if (typeof keys === 'string') {
    result[keys] = mockStorage[keys];
  } else if (Array.isArray(keys)) {
    keys.forEach(key => {
      result[key] = mockStorage[key];
    });
  } else if (typeof keys === 'object') {
    Object.keys(keys).forEach(key => {
      result[key] = mockStorage[key] || keys[key];
    });
  } else {
    result = { ...mockStorage };
  }
  callback(result);
});

chrome.storage.local.set.mockImplementation((items, callback) => {
  Object.assign(mockStorage, items);
  if (callback) callback();
});

global.clearChromeStorageMock = () => {
  Object.keys(mockStorage).forEach(key => {
    delete mockStorage[key];
  });
};