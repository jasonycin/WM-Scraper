"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Class = exports.Scraper = void 0;
var fs = require("fs");
var fetch = require('node-fetch');
var ObjectsToCsv = require('objects-to-csv');
var jsdom = require("jsdom");
var JSDOM = jsdom.JSDOM;
var Scraper = /** @class */ (function () {
    function Scraper(userAgent, rateLimit) {
        this._rateLimit = {
            _interval: 1000,
            _lastRequest: 0 // Date.now() millisecond timestamp
        };
        this.courselistData = {
            term: null,
            subjects: null
        };
        this.classData = [];
        this.userAgent = userAgent;
        if (rateLimit) {
            this.rateLimit = rateLimit;
        }
    }
    Object.defineProperty(Scraper.prototype, "userAgent", {
        get: function () {
            return this._userAgent;
        },
        set: function (userAgent) {
            // User agent must be @email.wm.edu or @wm.edu email address.
            if (!/^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?(wm|email.wm)\.edu$/g.test(userAgent)) {
                throw new Error('Invalid user agent. Must be a W&M email address.');
            }
            this._userAgent = userAgent;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Scraper.prototype, "rateLimit", {
        /**
         * Get the current rate limit.
         */
        get: function () {
            return this._rateLimit._interval;
        },
        /**
         * Set a custom rate limit. Default is 500ms.
         * You are responsible for setting a reasonable rate limit!! Consider the universities' server impact.
         * @param ms
         */
        set: function (ms) {
            if (ms < 500)
                console.log("WARNING: Rate limit set to " + ms + "ms. You are responsible for setting a reasonable rate limit.");
            this._rateLimit._interval = ms;
        },
        enumerable: false,
        configurable: true
    });
    Scraper.prototype._logAndExecuteRateLimit = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, diff, wait_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = Date.now();
                        diff = now - this.rateLimit;
                        if (!(diff < this.rateLimit)) return [3 /*break*/, 2];
                        wait_1 = this.rateLimit - diff;
                        console.log("INFO: Rate limit reached. Waiting " + wait_1 + "ms...");
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, wait_1); })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this._rateLimit._lastRequest = Date.now();
                        return [2 /*return*/];
                }
            });
        });
    };
    Scraper.prototype.retrieveTermAndSubjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, dom, _a, termChildren, term, subjectsChildren, subjectsArray, _i, subjectsChildren_1, subject;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // Enforce rate limit
                    return [4 /*yield*/, this._logAndExecuteRateLimit()];
                    case 1:
                        // Enforce rate limit
                        _b.sent();
                        url = 'https://courselist.wm.edu/courselist/courseinfo/';
                        return [4 /*yield*/, fetch(url, {
                                method: 'GET',
                                headers: {
                                    'User-Agent': this._userAgent
                                }
                            })];
                    case 2:
                        response = _b.sent();
                        _a = JSDOM.bind;
                        return [4 /*yield*/, response.text()];
                    case 3:
                        dom = new (_a.apply(JSDOM, [void 0, _b.sent()]))();
                        termChildren = dom.window.document.getElementById('term_code').children;
                        term = termChildren[termChildren.length - 2].value;
                        subjectsChildren = dom.window.document.getElementById('term_subj').children;
                        subjectsArray = [];
                        for (_i = 0, subjectsChildren_1 = subjectsChildren; _i < subjectsChildren_1.length; _i++) {
                            subject = subjectsChildren_1[_i];
                            subjectsArray.push(subject.value);
                        }
                        subjectsArray.shift(); // Remove the first element, which is a 0.
                        // Save courselistData to the scraper object.
                        this.courselistData.term = term;
                        this.courselistData.subjects = subjectsArray;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     *
     * @param subjectCode - If not provided, will extract information for all course subjects.
     */
    Scraper.prototype.retrieveSubjectData = function (subjectCode) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, dom, _a, table, _i, table_1, entry, classData, classInfo, i, _b, _c, subject;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        // Guard clauses
                        if (!this.courselistData.term) {
                            throw new Error('Term not set. Call retrieveTermAndSubjects() first.');
                        }
                        if (!subjectCode) return [3 /*break*/, 3];
                        url = "https://courselist.wm.edu/courselist/courseinfo/searchresults?term_code=" + this.courselistData.term + "&term_subj=" + subjectCode + "&attr=0&attr2=0&levl=0&status=0&ptrm=0&search=Search";
                        return [4 /*yield*/, fetch(url, {
                                method: 'GET',
                                headers: {
                                    'User-Agent': this._userAgent
                                }
                            })];
                    case 1:
                        response = _d.sent();
                        _a = JSDOM.bind;
                        return [4 /*yield*/, response.text()];
                    case 2:
                        dom = new (_a.apply(JSDOM, [void 0, _d.sent()]))();
                        table = dom.window.document.querySelector('tbody').children;
                        // Continuing to extract data from the table to reach the desired information.
                        for (_i = 0, table_1 = table; _i < table_1.length; _i++) {
                            entry = table_1[_i];
                            classData = entry.getElementsByTagName('td');
                            classInfo = [];
                            for (i = 0; i < classData.length; i++) {
                                classInfo.push(classData[i].textContent);
                            }
                            // Save the found information
                            this.createAndSaveClass(classInfo);
                        }
                        return [3 /*break*/, 7];
                    case 3:
                        _b = 0, _c = this.courselistData.subjects;
                        _d.label = 4;
                    case 4:
                        if (!(_b < _c.length)) return [3 /*break*/, 7];
                        subject = _c[_b];
                        return [4 /*yield*/, this.retrieveSubjectData(subject)];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _b++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Takes care of creating a class object from the provided class data and saving it to the scraper object.
     * Used internally by the retrieveClassData() method.
     * @param classInfo
     * @private
     */
    Scraper.prototype.createAndSaveClass = function (classInfo) {
        // Guard clauses
        if (typeof classInfo !== 'object')
            throw new Error('Invalid classInfo parameter. Must be an array.');
        if (classInfo.length !== 11)
            throw new Error('Invalid classInfo parameter. Must be an array of length 11.');
        // Create a new class object and stores in the scraper object under the classData key.
        this.classData.push(new Class(classInfo[0], classInfo[1], classInfo[2].split(','), classInfo[3], classInfo[4], classInfo[5], classInfo[6], classInfo[7], classInfo[8], classInfo[9], classInfo[10]));
    };
    /**
     * Saves all data contained in the scraper objects classData key to a .csv file.
     */
    Scraper.prototype.saveToCsv = function (filename) {
        return __awaiter(this, void 0, void 0, function () {
            var csv;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        csv = new ObjectsToCsv(this.classData);
                        return [4 /*yield*/, csv.toDisk("./" + filename + ".csv")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Scraper.prototype.saveToJson = function (filename) {
        fs.writeFileSync("./" + filename + ".json", JSON.stringify(this.classData, null, 4));
    };
    Scraper.prototype.loadFromJson = function (filepath) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _i, data_1, entry;
            return __generator(this, function (_a) {
                try {
                    data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                }
                catch (e) {
                    throw new Error("Error loading JSON file: " + e);
                }
                // Empty current data if present
                if (this.classData)
                    this.classData = [];
                // Populate classData with the loaded data
                for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                    entry = data_1[_i];
                    this.classData.push(new Class(entry._crn.toString(), entry._courseID, entry._attributes, entry._title, entry._instructor, entry._credits, entry._times, entry._projectedEnrollment, entry._currentEnrollment, entry._seatsAvailable, entry._status ? 'OPEN' : 'CLOSED'));
                }
                return [2 /*return*/];
            });
        });
    };
    Scraper.prototype.findClassByCrn = function (crn) {
        for (var _i = 0, _a = this.classData; _i < _a.length; _i++) {
            var classEntry = _a[_i];
            if (classEntry.crn === crn) {
                return classEntry;
            }
        }
    };
    Scraper.prototype.findClassByCourseID = function (courseID) {
        for (var _i = 0, _a = this.classData; _i < _a.length; _i++) {
            var classEntry = _a[_i];
            if (classEntry.courseID === courseID) {
                return classEntry;
            }
        }
    };
    Scraper.prototype.findClassesByAttribute = function (attribute) {
        var foundClasses = [];
        for (var _i = 0, _a = this.classData; _i < _a.length; _i++) {
            var classEntry = _a[_i];
            if (classEntry.attributes.includes(attribute)) {
                foundClasses.push(classEntry);
            }
        }
        return foundClasses;
    };
    Scraper.prototype.findClassesByInstructor = function (instructor) {
        // Return an array of classes that match the instructor
        return this.classData.filter(function (classEntry) { return classEntry.instructor === instructor; });
    };
    Scraper.prototype.findClassesByCredits = function (credits) {
        // Return an array of classes that match the credits
        return this.classData.filter(function (classEntry) { return classEntry.credits === credits; });
    };
    Scraper.prototype.findClassesByTimes = function (times) {
        // Return an array of classes that match the times
        return this.classData.filter(function (classEntry) { return classEntry.times === times; });
    };
    Scraper.prototype.findClassesByProjectedEnrollment = function (projectedEnrollment) {
        // Return an array of classes that match the projected enrollment
        return this.classData.filter(function (classEntry) { return classEntry.projectedEnrollment === projectedEnrollment; });
    };
    Scraper.prototype.findClassesByCurrentEnrollment = function (currentEnrollment) {
        // Return an array of classes that match the current enrollment
        return this.classData.filter(function (classEntry) { return classEntry.currentEnrollment === currentEnrollment; });
    };
    Scraper.prototype.findClassesBySeatsAvailable = function (seatsAvailable) {
        // Return an array of classes that match the seats available
        return this.classData.filter(function (classEntry) { return classEntry.seatsAvailable === seatsAvailable; });
    };
    Scraper.prototype.findClassesByStatus = function (status) {
        // Return an array of classes that match the status
        return this.classData.filter(function (classEntry) { return classEntry.status === status; });
    };
    return Scraper;
}());
exports.Scraper = Scraper;
var Class = /** @class */ (function () {
    function Class(crn, courseID, attributes, title, instructor, credits, times, projectedEnrollment, currentEnrollment, seatsAvailable, status) {
        this.crn = crn;
        this.courseID = courseID;
        this.attributes = attributes;
        this.title = title;
        this.instructor = instructor;
        this.credits = credits;
        this.times = times;
        this.projectedEnrollment = projectedEnrollment;
        this.currentEnrollment = currentEnrollment;
        this.seatsAvailable = seatsAvailable;
        this.status = status;
    }
    Object.defineProperty(Class.prototype, "crn", {
        get: function () {
            return this._crn.toString();
        },
        set: function (id) {
            this._crn = parseInt(id.replace(/(\r\n|\n|\r)/gm, "").trim());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "courseID", {
        get: function () {
            return this._courseID;
        },
        set: function (id) {
            this._courseID = id.replace(/(\r\n|\n|\r)/gm, "").trim();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "attributes", {
        get: function () {
            return this._attributes;
        },
        set: function (attributes) {
            this._attributes = attributes.map(function (attribute) { return attribute.replace(/(\r\n|\n|\r)/gm, "").trim(); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "title", {
        get: function () {
            return this._title;
        },
        set: function (name) {
            this._title = name.replace(/(\r\n|\n|\r)/gm, "").trim();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "instructor", {
        get: function () {
            return this._instructor;
        },
        set: function (instructor) {
            this._instructor = instructor.replace(/(\r\n|\n|\r)/gm, "").trim();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "credits", {
        get: function () {
            return this._credits;
        },
        set: function (credits) {
            if (credits === null) {
                this._credits = null;
            }
            else {
                this._credits = parseInt(credits.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "times", {
        get: function () {
            return this._times;
        },
        set: function (times) {
            this._times = times.replace(/(\r\n|\n|\r)/gm, "").trim();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "projectedEnrollment", {
        get: function () {
            return this._projectedEnrollment;
        },
        set: function (projectedEnrollment) {
            this._projectedEnrollment = parseInt(projectedEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "currentEnrollment", {
        get: function () {
            return this._currentEnrollment;
        },
        set: function (currentEnrollment) {
            this._currentEnrollment = parseInt(currentEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "seatsAvailable", {
        get: function () {
            return this._seatsAvailable;
        },
        set: function (seatsAvailable) {
            this._seatsAvailable = parseInt(seatsAvailable
                .toString()
                .replace(/(\r\n|\n|\r)/gm, "")
                .replace('*', '')
                .trim());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Class.prototype, "status", {
        get: function () {
            return this._status;
        },
        set: function (status) {
            switch (status) {
                case 'OPEN':
                    this._status = true;
                    break;
                case 'CLOSED':
                    this._status = false;
                    break;
                default:
                    throw new Error('Invalid status');
            }
        },
        enumerable: false,
        configurable: true
    });
    return Class;
}());
exports.Class = Class;
//# sourceMappingURL=scraper.js.map