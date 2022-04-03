import * as fs from "fs";

const fetch = require('node-fetch');
const ObjectsToCsv = require('objects-to-csv');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const winston = require('winston');

const logger = require('winston').createLogger({
    transports: [
        new(winston.transports.Console)({
            colorize: true,
            timestamp: true,
            prettyPrint: true
        })
    ],
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${new Date().toLocaleDateString()} ${new Date().toLocaleDateString()} ${info.level}: ${info.message}`)
    )
})

export interface IRateLimit {
    _interval: number,
    _lastRequest: number
}

export interface IData {
    terms?: {
        latest: number,
        all: number[]
    },
    subjects?: string[]
}

export interface IJsonClass {
    _crn: number,
    _courseID: string,
    _attributes: string[],
    _title: string,
    _instructor: string,
    _credits: number,
    _times: string,
    _projectedEnrollment: number,
    _currentEnrollment: number,
    _seatsAvailable: number,
    _status: boolean
}

/**
 * Custom Error Class for Scraper
 */
class ScraperError extends Error {
    constructor(message: string) {
        super(`W&M Scrapper Error: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ClassError extends Error {
    constructor(message: string) {
        super(`W&M Class Error: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor)
    }
}

export class Scraper {
    private _userAgent: string;
    private _rateLimit: IRateLimit = {
        _interval: 500,
        _lastRequest: 0 // Date.now() millisecond timestamp
    };
    public courselistData: IData = {
        terms: { latest: null, all: null },
        subjects: null
    };
    public classData: Class[] = [];

    constructor(userAgent: string, rateLimit?: number) {
        this.userAgent = userAgent;

        if (rateLimit) this.rateLimit = rateLimit;
    }

    public set userAgent(userAgent: string) {
        // User agent must be @email.wm.edu or @wm.edu email address.
        if(!/^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?(wm|email.wm)\.edu$/g.test(userAgent)) {
            throw new ScraperError('Invalid user agent. Must be a W&M email address.');
        }

        this._userAgent = userAgent;
    }

    public get userAgent(): string {
        return this._userAgent;
    }

    /**
     * Set a custom rate limit. Default is 500ms.
     * You are responsible for setting a reasonable rate limit!! Consider the universities' server impact.
     * @param ms
     */
    public set rateLimit(ms: number) {
        if (ms < 500)
            logger.warn(`Rate limit set to ${ms}ms. You are responsible for setting a reasonable rate limit! Default is 500ms.`);

        this._rateLimit._interval = ms;
    }

    /**
     * Get the current rate limit.
     */
    public get rateLimit(): number {
        return this._rateLimit._interval;
    }

    public set logging(bool: boolean) {
        if (typeof bool !== 'boolean') throw new ScraperError(`Logging can be set to true or false (boolean). You passed a ${typeof bool} argument.`);
        bool ? logger.silent = false : logger.silent = true;
    }

    private async httpRequest(url: string, options?: object) {
        if (typeof options != 'object') throw new ScraperError(`Wrong data type. You passed ${typeof options}.`)

        if (!options) {
            options = {
                method: 'GET',
                headers: { "User-Agent": this._userAgent }
            }
        }

        try {
            return await fetch(url, options)
        }
        catch (e) {
          throw new ScraperError(e);
        }
    }

    /**
     * Enforces the rate limit by seeing if it has exceeded the set interval.
     * If so, it halts thread execution for the remaining time.
     * @private
     */
    private async _logAndExecuteRateLimit() {
        // Calculate time since last request
        const diff = Date.now() - this.rateLimit;

        // If the rate limit has been exceeded, force thread execution to halt until the rate limit is met.
        if (diff < this.rateLimit) {
            const wait = this.rateLimit - diff;
            console.log(`INFO: Rate limit reached. Waiting ${wait}ms...`);
            await new Promise(r => setTimeout(r, wait));
        }

        this._rateLimit._lastRequest = Date.now();
    }


    /**
     * Retrieves the current term and subject list from the W&M website.
     */
    public async getTermsAndSubjects() {
        // Enforce rate limit
        await this._logAndExecuteRateLimit();

        // Retrieve the entire HTML page from the Course List
        const url = 'https://courselist.wm.edu/courselist/courseinfo/';
        const response = await this.httpRequest(url)

        /**
         * Extract the HTML from the response and parse it using JSDOM
         */
        const dom = new JSDOM(await response.text());

        /**
         * Extract the terms from the dropdown menu in the DOM.
         */
        const termChildren = dom.window.document.getElementById('term_code').children // HTMLCollection{}
        this.courselistData.terms.all = [...termChildren].map(term => term.value); // Convert HTMLCollection{} to array
        this.courselistData.terms.latest = termChildren[termChildren.length - 2].value; // The latest term in dropdown menu.

        /**
         * Extract the subjects from the dropdown menu in the DOM.
         */
        const subjectsChildren = dom.window.document.getElementById('term_subj').children // HTMLCollection{}
        this.courselistData.subjects = [...subjectsChildren].map(subject => subject.value).slice(1) // Convert HTMLCollection{} to array and remove first item.
    }

    /**
     *
     * @param subjectCode - If not provided, will extract information for all course subjects.
     * @param term -
     */
    public async getCourseData(subjectCode?: string, term?: number) {
        // If no custom term and subject has been defined or gotten via getTermAndSubjects(), attempt to retrieve it.
        if (!this.courselistData.terms.latest && !this.courselistData.subjects) {
            logger.warn('No term or subjects found. Attempting to get data from Open Course List...');
            await this.getTermsAndSubjects();

            // Check for successful retrieval.
            if (this.courselistData.terms.latest && this.courselistData.subjects) {
                logger.info(`Subjects found (${this.courselistData.subjects.at(1)}...${this.courselistData.subjects.at(-1)}). Term set to ${this.courselistData.terms.latest}.`);
            } else throw new ScraperError('Unable to get term from Open Course List.');
        }

        // If a parameter was provided, retrieve information for that subject only.
        if (subjectCode) {
            // See if subject code is in courselistData.
            if (!this.courselistData.subjects.includes(subjectCode)) throw new ScraperError(`Subject code ${subjectCode} is not found. Have you called getTermAndSubjects()?`);

            await this._logAndExecuteRateLimit();

            /**
             * Retrieve the entire HTML page from the Course List for the given subject.
             * Uses a custom term if one was provided.
             */
            const url = `https://courselist.wm.edu/courselist/courseinfo/searchresults?term_code=${term ? term : this.courselistData.terms.latest}&term_subj=${subjectCode}&attr=0&attr2=0&levl=0&status=0&ptrm=0&search=Search`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this._userAgent
                }
            });

            // Extract data and parse through it using JSDOM
            const dom = new JSDOM(await response.text());
            const table = dom.window.document.querySelector('tbody').children;

            // Continuing to extract data from the table to reach the desired information.
            for (const entry of table) {
                const classData = entry.getElementsByTagName('td');

                // Extract class courselistData into an array
                let classInfo = [];
                for (let i = 0; i < classData.length; i++) {
                    classInfo.push(classData[i].textContent)
                }

                // Save the found information
                this.createAndSaveClass(classInfo);
            }
        } else { // If no specific subject was given, get all.
            for (const subject of this.courselistData.subjects) {
                await this.getCourseData(subject, term ? term : this.courselistData.terms.latest);
            }
        }
    }

    /**
     * Takes care of creating a class object from the provided class data and saving it to the scraper object.
     * Used internally by the retrieveClassData() method.
     * @param classInfo
     * @private
     */
    private createAndSaveClass(classInfo) {
        // Guard clauses
        if (typeof classInfo !== 'object')
            throw new ScraperError('Invalid classInfo parameter. Must be an array.');

        if (classInfo.length !== 11)
            throw new ScraperError('Invalid classInfo parameter. Must be an array of length 11.');

        // Create a new class object and stores in the scraper object under the classData key.
        this.classData.push(new Class(
            classInfo[0],
            classInfo[1],
            classInfo[2].split(','),
            classInfo[3],
            classInfo[4],
            classInfo[5],
            classInfo[6],
            classInfo[7],
            classInfo[8],
            classInfo[9],
            classInfo[10]
        ));
    }


    /**
     * Saves all data contained in the scraper objects classData key to a .csv file.
     */
    public async saveToCsv(filename: string) {
        const csv = new ObjectsToCsv(this.classData);
        await csv.toDisk(`./${filename}.csv`);
    }

    public saveToJson(filename: string) {
        fs.writeFileSync(`./${filename}.json`, JSON.stringify(this.classData, null, 4));
    }

    public async loadFromJson(filepath: string) {
        let data: IJsonClass[];

        try {
            data =  JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
            throw new Error(`Error loading JSON file: ${e}`);
        }

        // Empty current data if present
        if (this.classData) this.classData = [];

        // Populate classData with the loaded data
        for (const entry of data) {
            this.classData.push(new Class(
                entry._crn.toString(),
                entry._courseID,
                entry._attributes,
                entry._title,
                entry._instructor,
                entry._credits,
                entry._times,
                entry._projectedEnrollment,
                entry._currentEnrollment,
                entry._seatsAvailable,
                entry._status ? 'OPEN' : 'CLOSED'
            ))
        }
    }

    public findClassByCrn(crn: string) {
        for (const classEntry of this.classData) {
            if (classEntry.crn === crn) {
                return classEntry;
            }
        }
    }

    public findClassByCourseID(courseID: string) {
        for (const classEntry of this.classData) {
            if (classEntry.courseID === courseID) {
                return classEntry;
            }
        }
    }

    public findClassesByAttribute(attribute: string) {
        let foundClasses: Class[] = [];
        for (const classEntry of this.classData) {
            if (classEntry.attributes.includes(attribute)) {
                foundClasses.push(classEntry);
            }
        }
        return foundClasses;
    }

    public findClassesByInstructor(instructor: string) {
        // Return an array of classes that match the instructor
        return this.classData.filter(classEntry => classEntry.instructor === instructor);
    }

    public findClassesByCredits(credits: number) {
        // Return an array of classes that match the credits
        return this.classData.filter(classEntry => classEntry.credits === credits);
    }

    public findClassesByTimes(times: string) {
        // Return an array of classes that match the times
        return this.classData.filter(classEntry => classEntry.times === times);
    }

    public findClassesByProjectedEnrollment(projectedEnrollment: number) {
        // Return an array of classes that match the projected enrollment
        return this.classData.filter(classEntry => classEntry.projectedEnrollment === projectedEnrollment);
    }

    public findClassesByCurrentEnrollment(currentEnrollment: number) {
        // Return an array of classes that match the current enrollment
        return this.classData.filter(classEntry => classEntry.currentEnrollment === currentEnrollment);
    }

    public findClassesBySeatsAvailable(seatsAvailable: number) {
        // Return an array of classes that match the seats available
        return this.classData.filter(classEntry => classEntry.seatsAvailable === seatsAvailable);
    }

    public findClassesByStatus(status: 'OPEN' | 'CLOSED') {
        // Return an array of classes that match the status
        return this.classData.filter(classEntry => classEntry.status === status);
    }
}

export class Class {
    private _crn: number;
    private _courseID: string;
    private _attributes: string[];
    private _title: string;
    private _instructor: string;
    private _credits: number;
    private _times: string;
    private _projectedEnrollment: number;
    private _currentEnrollment: number;
    private _seatsAvailable: number;
    private _status: string;

    constructor(crn?: string, courseID?: string, attributes?: string[], title?: string, instructor?: string, credits?: number, times?: string, projectedEnrollment?: number, currentEnrollment?: number, seatsAvailable?: number, status?: string) {
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

    set crn(id: string) {
        this._crn = parseInt(id.replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    get crn(): string {
        return this._crn.toString();
    }

    set courseID(id: string) {
        this._courseID = id.replace(/(\r\n|\n|\r)/gm, "").trim();
    }

    get courseID(): string {
        return this._courseID;
    }

    set attributes(attributes: string[]) {
        this._attributes = attributes.map(attribute => attribute.replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    get attributes(): string[] {
        return this._attributes;
    }

    set title(name: string) {
        this._title = name.replace(/(\r\n|\n|\r)/gm, "").trim();
    }

    get title(): string {
        return this._title;
    }

    set instructor(instructor: string) {
        this._instructor = instructor.replace(/(\r\n|\n|\r)/gm, "").trim();
    }

    get instructor(): string {
        return this._instructor;
    }

    set credits(credits: number) {
        if (credits === null) {
            this._credits = null;
        } else {
            this._credits = parseInt(credits.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
        }
    }

    get credits(): number {
        return this._credits;
    }

    set times(times: string) {
        this._times = times.replace(/(\r\n|\n|\r)/gm, "").trim();
    }

    get times(): string {
        return this._times;
    }

    /**
     * Sets the projected number of available spots in an individual class as a number.
     * Removes special characters such as newlines, return carriages, asterisks, etc.
     * @param projectedEnrollment
     */
    set projectedEnrollment(projectedEnrollment: number) {
        this._projectedEnrollment = parseInt(projectedEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    /**
     * Returns the projected number of available spots in an individual class as a number.
     */
    get projectedEnrollment(): number {
        return this._projectedEnrollment;
    }

    /**
     * Sets the current number of enrolled students in an individual class as a number.
     * Removes special characters such as newlines, return carriages, asterisks, etc.
     * @param currentEnrollment
     */
    set currentEnrollment(currentEnrollment: number) {
        this._currentEnrollment = parseInt(currentEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    /**
     * Returns the number of current enrollment in an individual class as a number.
     */
    get currentEnrollment(): number {
        return this._currentEnrollment;
    }

    /**
     * Sets the current number of available seats in an individual class.
     * Removes special characters such as newlines, return carriages, asterisks, etc.
     * @param seatsAvailable
     */
    set seatsAvailable(seatsAvailable: number) {
        this._seatsAvailable = parseInt(seatsAvailable
            .toString()
            .replace(/(\r\n|\n|\r)/gm, "")
            .replace('*', '')
            .trim());
    }

    /**
     * Returns the number of seats available in an individual class as a number.
     */
    get seatsAvailable(): number {
        return this._seatsAvailable;
    }

    /**
     * Set the status of a class. Must be 'OPEN' or 'CLOSED'.
     * @param status
     */
    set status(status: string) {
        // Guard clause
        if (status != 'OPEN' && status != 'CLOSED') throw new Error('Incorrect status type. Must be OPEN or CLOSED.')
        this._status = status;
    }

    /**
     * Get the status of an individual class as the string defined by Open Course List (OPEN or CLOSED.)
     */
    get status(): string {
        return this._status;
    }

    /**
     * Get the status of an individual class as boolean. OPEN returns true whereas CLOSED returns false.
     */
    get statusAsBool(): boolean {
        return this._status == 'OPEN';
    }

}