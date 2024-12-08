"use strict";

const DATABASE_NAME = 'cmuDictionary';
const STORE_NAME = 'store';

const $ = function (el) {
    return document.querySelector(el);
}, $$ = function (el) {
    return document.querySelectorAll(el);
};

const FUNCTIONS = {
    addClickEvents: function() {
        $('.script-go-to-infobox').addEventListener('click', async () => {
            $('.content__main').classList.remove('content-active');
            $('.content__infobox').classList.add('content-active');
        });

        $('.script-go-to-main').addEventListener('click', async () => {
            $('.content__infobox').classList.remove('content-active');
            $('.content__main').classList.add('content-active');
        });
    },
    addKeyUpEvents: async function() {
        const text = $('.form__textarea').value;
        $('.form__output').innerHTML = await FUNCTIONS.getPronunciation(text);

        $('.form__textarea').addEventListener('keyup', async () => {
            const text = $('.form__textarea').value;
            $('.form__output').innerHTML = await FUNCTIONS.getPronunciation(text);
        });
    },
    checkIfDatabaseExist: async function (databaseName) {
        return !!(await window.indexedDB.databases()).map(db => db.name).includes(databaseName);
    },
    convertNumberToWords: function (number) {
        const hyphen = ' - ';
        const conjunction = ' and ';
        const separator = ' , ';
        const negative = 'negative ';
        const decimal = ' point ';
        const dictionary = {
            0: 'zero',
            1: 'one',
            2: 'two',
            3: 'three',
            4: 'four',
            5: 'five',
            6: 'six',
            7: 'seven',
            8: 'eight',
            9: 'nine',
            10: 'ten',
            11: 'eleven',
            12: 'twelve',
            13: 'thirteen',
            14: 'fourteen',
            15: 'fifteen',
            16: 'sixteen',
            17: 'seventeen',
            18: 'eighteen',
            19: 'nineteen',
            20: 'twenty',
            30: 'thirty',
            40: 'forty',
            50: 'fifty',
            60: 'sixty',
            70: 'seventy',
            80: 'eighty',
            90: 'ninety',
            100: 'hundred',
            1000: 'thousand',
            1000000: 'million',
            1000000000: 'billion',
            1000000000000: 'trillion',
            1000000000000000: 'quadrillion',
            1000000000000000000: 'quintillion'
        };

        if (number === "") {
            return number;
        }

        if (!Number.isFinite(Number(number))) {
            return number;
        }

        number = Number(number);

        if (number < 0) {
            return negative + FUNCTIONS.convertNumberToWords(Math.abs(number));
        }

        let string = '';
        let fraction = null;

        if (number.toString().includes('.')) {
            [number, fraction] = number.toString().split('.');
        }

        let remainder;

        switch (true) {
            case number < 21:
                string = dictionary[number];
                break;
            case number < 100:
                const tens = Math.floor(number / 10) * 10;
                const units = number % 10;
                string = dictionary[tens];
                if (units) {
                    string += hyphen + dictionary[units];
                }
                break;
            case number < 1000:
                const hundreds = Math.floor(number / 100);
                remainder = number % 100;
                string = dictionary[hundreds] + ' ' + dictionary[100];
                if (remainder) {
                    string += conjunction + FUNCTIONS.convertNumberToWords(remainder);
                }
                break;
            default:
                const baseUnit = Math.pow(1000, Math.floor(Math.log10(number) / 3));
                const numBaseUnits = Math.floor(number / baseUnit);
                remainder = number % baseUnit;
                string = FUNCTIONS.convertNumberToWords(numBaseUnits) + ' ' + dictionary[baseUnit];
                if (remainder) {
                    string += remainder < 100 ? conjunction : separator;
                    string += FUNCTIONS.convertNumberToWords(remainder);
                }
                break;
        }

        if (fraction && !isNaN(fraction)) {
            string += decimal;
            const words = [];
            for (const digit of fraction) {
                words.push(dictionary[digit]);
            }
            string += words.join(' ');
        }

        return string;
    },
    getPronunciation: async function (text) {
        // Add line breaks
        let words = text.replace(/\n/g, '<br/>');

        // Separate punctuation
        words = words.replace(/(\.|,|\?|!|-|\(|\)|`|'|<br\/>)/g, ' $1 ');

        // Convert numbers to words
        words = words.split(' ').map(word => FUNCTIONS.convertNumberToWords(word));

        // Split words created from numbers
        words = words.flatMap(sentence => {
            return sentence.split(/\s+|-/);
        });

        // Remove empty strings from array
        words = words.filter(function (word) {
            return word;
        });

        // Look up pronunciations and handle special cases
        let result = [];
        for (const word of words) {
            let upperCasedWord = word.toUpperCase();
            let isFirstLetterUpperCase = word[0] === word[0].toUpperCase();
            let isCurrentWordAsPunctuation = /(\.|,|\?|!|-|\(|\)|`|'|<br\/>)/.test(word);

            if (isCurrentWordAsPunctuation) {
                result.push(word);
            } else {
                const db = await idb.openDB(DATABASE_NAME, 1);
                const pronunciation = await db.get(STORE_NAME, upperCasedWord);
                if (pronunciation) {
                    result.push(isFirstLetterUpperCase ? pronunciation.value.charAt(0).toUpperCase() + pronunciation.value.slice(1) : pronunciation.value);
                } else {
                    result.push(`<span style="color:red">${word}</span>`);
                }
            }
        }

        result = result.join(' ');

        result = result.replace(/ (\.|,|\?|!|-|\(|\)|`|'|<br\/>)/g, '$1');

        result = result.replace(/(de|De) ([aeiou])/gi, (match, p1, p2) => {
            return p1 === 'de' ? 'di ' + p2 : 'Di ' + p2;
        });

        // Remove extra spaces and restore punctuation
        result = result.replace(/\s+/g, ' ').trim();

        return result;
    },
    loadDatabase: async function (databaseName) {
        await fetch('base.txt').then(data=>data.text()).then(function (response) {
            const parsedData = FUNCTIONS.parseCSV(response.split(/;;; END COMMENT\r\n/).pop());
            FUNCTIONS.storeDataToIndexedDB(parsedData);
            console.log(parsedData);
        })
    },
    loaderSVG: function () {
        if (navigator.userAgent.match(/BlackBerry|IEMobile|Opera Mini/)) {
            $(".loader").remove();
        }

        const animation = new LazyLinePainter($("#loader__svg"), {
            "strokeWidth": 1,
            "strokeColor": "#1f8dd6",
        });
        animation.paint();

        animation.on('complete', () => {
            $("#loader__svg").style.fill = "#1F8DD6";

            setTimeout(function () {
                $(".loader").style.opacity = 0;
                $(".loader").style.pointerEvents = 'none';
            }, 250)
        });
    },
    parseCSV(csvData) {
        const lines = csvData.split('\r\n');
        const data = [];
        lines.forEach(line => {
            const [key, value] = line.split('|');
            data.push({ key, value });
        });
        return data;
    },
    storeDataToIndexedDB: async function (data) {
        const db = await idb.openDB(DATABASE_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {keyPath: 'key'});
                }
            }
        });

        const tx = db.transaction(STORE_NAME, 'readwrite');
        for await (const item of data) {
            tx.store.add(item);
        }
        await tx.done;
    },
    init: function () {
        FUNCTIONS.checkIfDatabaseExist(DATABASE_NAME).then(isDatabaseExist => {
            if (!isDatabaseExist) {
                FUNCTIONS.loadDatabase(DATABASE_NAME).then(() => {
                    FUNCTIONS.addClickEvents();
                    FUNCTIONS.addKeyUpEvents();
                    FUNCTIONS.loaderSVG();
                })
            } else {
                FUNCTIONS.addClickEvents();
                FUNCTIONS.addKeyUpEvents();
                FUNCTIONS.loaderSVG();
            }
        });
    }
}

FUNCTIONS.init();