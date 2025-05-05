// constants.js
// Author: Weil Jimmer
// Description: This file contains the constants used in the extension.
// The constants include the default settings, autofill options, and the default password generation settings.

export const AUTOFILL_OPTIONS = {
    DO_NOTHING : 'do-nothing',
    AUTOFILL_DOMAIN : 'autofill-domain',
    AUTOFILL_URL : 'autofill-url',
    AUTOFILL_KEYWORD : 'autofill-keyword'
}

export const AUTOFILL_OPTIONS_INDEX = {
    '' : 0, // for possible empty string as exception
    'do-nothing' : 0,
    'autofill-domain' : 1,
    'autofill-url' : 2,
    'autofill-keyword' : 3
}

export const AUTOFILL_OPTIONS_INDEX_REVERSE = {
    0 : 'do-nothing',
    1 : 'autofill-domain',
    2 : 'autofill-url',
    3 : 'autofill-keyword'
}

export const DEFAULT_CONST = {
    UPPERCASE_CHECKED : true,
    LOWERCASE_CHECKED : true,
    NUMBERS_CHECKED : true,
    SYMBOLS_CHECKED : true,
    MASTER_PASSWORD : '',
    AUTOFILL_OPTION : AUTOFILL_OPTIONS.DO_NOTHING,
    SYMBOLS_CHAR : '!@#$%^&*(){}[]=,.',
    VERSION : 1,
    LENGTH : 40,
    SALT : ''
}