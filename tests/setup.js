import { chrome } from 'jest-chrome';

global.chrome = chrome;

chrome.runtime.getURL.mockImplementation(path => `chrome-extension://passwordgeneratorbrowserextension/${path}`);

const mockStorage = {};
const resolveGet = (keys) => {
  let result = {};
  if (keys === undefined || keys === null) {
    result = { ...mockStorage };
  } else if (typeof keys === 'string') {
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
  return result;
};
// Support both callback and Promise (MV3) forms of chrome.storage.*.get
chrome.storage.local.get.mockImplementation((keys, callback) => {
  const result = resolveGet(keys);
  if (typeof callback === 'function') { callback(result); return; }
  return Promise.resolve(result);
});
chrome.storage.local.set.mockImplementation((items, callback) => {
  Object.assign(mockStorage, items);
  if (typeof callback === 'function') callback();
  else return Promise.resolve();
});
if (chrome.storage.sync && chrome.storage.sync.get) {
  chrome.storage.sync.get.mockImplementation((keys, callback) => {
    const result = resolveGet(keys);
    if (typeof callback === 'function') { callback(result); return; }
    return Promise.resolve(result);
  });
}
if (chrome.storage.sync && chrome.storage.sync.set) {
  chrome.storage.sync.set.mockImplementation((items, callback) => {
    if (typeof callback === 'function') callback();
    else return Promise.resolve();
  });
}

global.clearChromeStorageMock = () => {
  Object.keys(mockStorage).forEach(key => {
    delete mockStorage[key];
  });
};