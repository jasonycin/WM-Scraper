import * as fs from "fs";

const fetch = require('node-fetch');
const ObjectsToCsv = require('objects-to-csv');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const winston = require('winston');

/**
 * Logging configuration. Only logs to console and can be turned off via a scraper object.
 */
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

/**
 * Object to store rate-limit information including the interval.
 * Future plan is to implement a fully-fledged queue.
 */
export interface IRateLimit {
    _interval: number,
    _lastRequest: number
}

/**
 * Object used in the Scraper class to store all the term information and subjects that have been scraped from the Open Course List.
 */
export interface IData {
    terms?: {
        latest: number,
        all: number[]
    },
    subjects?: string[]
}

/**
 * Object used in the Class class object to store the information about the class.
 */
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

/**
 * Custom error class for the Error class.
 */
class ClassError extends Error {
    constructor(message: string) {
        super(`W&M Class Error: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor)
    }
}

/**
 * The main class of the library. This class is used to scrape the W&M Open Course List.
 * It is recommended to only create one instance of this class and use it throughout your application.
 */
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

    /**
     * Constructor for the Scraper class. The userAgent is required and must be in the form of a W&M email address.
     * @param userAgent
     * @param rateLimit
     */
    constructor(userAgent: string, rateLimit?: number) {
        this.userAgent = userAgent;

        if (rateLimit) this.rateLimit = rateLimit;
    }

    /**
     * The user agent for the scraper. This is required and must be in the form of a W&M email address.
     */
    public set userAgent(userAgent: string) {
        // User agent must be @email.wm.edu or @wm.edu email address.
        if(!/^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?(wm|email.wm)\.edu$/g.test(userAgent)) {
            throw new ScraperError('Invalid user agent. Must be a W&M email address.');
        }

        this._userAgent = userAgent;
    }

    /**
     * Get the user agent for the scraper.
     */
    public get userAgent(): string {
        return this._userAgent;
    }

    /**
     * Set a custom rate limit. Default is 500ms. A warning is given if the rate limit is set too low.
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

    /**
     * Set the logging to true or false to enable or disable the Winston logger.
     */
    public set logging(bool: boolean) {
        if (typeof bool !== 'boolean') throw new ScraperError(`Logging can be set to true or false (boolean). You passed a ${typeof bool} argument.`);
        bool ? logger.silent = false : logger.silent = true;
    }

    /**
     * Standardize node-fetch HTTP requests and error-handling.
     */
    private async httpRequest(url: string, options?: object): Promise<any> {
        if (options && typeof options != 'object') throw new ScraperError(`Wrong data type. You passed ${typeof options}.`)

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
    private async _logAndExecuteRateLimit(): Promise<void> {
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
     * Saves data to the courselistData property in the Scraper class.
     */
    public async getTermsAndSubjects(): Promise<void> {
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
     * Get the course list for a given term and subject. If no term or subject is passed, the latest term and all subjects are retrieved.
     * @param subjectCode - Defaults to using all. (Additional HTTP request if not saved in the Scraper class)
     * @param term - Defaults to using latest. (Additional HTTP request if not saved in the Scraper class)
     */
    public async getCourseData(subjectCode?: string, term?: number): Promise<void> {
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
    private createAndSaveClass(classInfo): void {
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
     * @example scraper.saveClassData('/path/to/file.csv')
     * @param saveLocation
     */
    public async saveToCsv(saveLocation: string) {
        if (saveLocation.endsWith('.csv') === false) saveLocation += '.csv'; // Add .csv extension if not already present.

        const csv = new ObjectsToCsv(this.classData);
        await csv.toDisk(saveLocation);
    }

    /**
     * Saves all data contained in the scraper objects classData key to a .json file.
     * @example scraper.saveClassData('/path/to/file.json')
     * @param saveLocation
     */
    public saveToJson(saveLocation: string) {
        if (saveLocation.endsWith('.json') === false) saveLocation += '.json'; // Add .json extension if not already there.
        fs.writeFileSync(saveLocation, JSON.stringify(this.classData, null, 4));
    }

    /**
     * Loads all classes contained in a .json file into the scraper object. Replaces any existing data.
     * Only use this method if you are sure that the file has been created via the saveToJson() method. Otherwise, it will likely fail.
     * @example scraper.loadClassData('/path/to/file.json')
     * @param filepath
     */
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

    /**
     * Loads all classes contained in a .csv file into the scraper object. Replaces any existing data.
     * Only use this method if you are sure that the file has been created via the saveToCsv() method. Otherwise, it will likely fail.
     * @example scraper.loadFromCsv('/path/to/file.csv')
     * @param filepath
     */
    public async loadFromCsv(filepath: string): Promise<void> {
        const lines = fs.readFileSync(filepath).toString().split('\n').splice(1);

        // Empty current data if present
        if (this.classData) this.classData = [];

        lines.forEach(line => {
           const seperated = line
               .replaceAll('"",""', '-')
               .replaceAll('"', '')
               .replaceAll(',  ', ' ')
               .replaceAll(', ', ' ')
               .replace('[','')
               .replace(']', '')
               .split(',')

            this.classData.push(new Class(
                seperated[0], // CRN
                seperated[1], // Course ID
                seperated[2] ? seperated[2].split('-') : [], // Attributes
                seperated[3], // Title
                seperated[4], // Instructor
                parseInt(seperated[5]), // Credits
                seperated[6], // Time
                parseInt(seperated[7]), // Projected enrollment
                parseInt(seperated[8]), // Current Enrollment
                parseInt(seperated[9]), // Seats Available
                seperated[10]
            ))
        })
    }

    /**
     * Returns an individual class object from the scraper object.
     * @example scraper.getClassData()
     */
    public findClassByCrn(crn: string): Class {
        for (const classEntry of this.classData) if (classEntry.crn === crn) return classEntry;
    }

    /**
     * Returns an individual class object from the scraper object.
     * @example scraper.getClassData()
     */
    public findClassByCourseID(courseID: string): Class {
        for (const classEntry of this.classData) if (classEntry.courseID === courseID) return classEntry;
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param attribute
     */
    public findClassesByAttribute(attribute: string): Class[] {
        let foundClasses: Class[] = [];
        for (const classEntry of this.classData) {
            if (classEntry.attributes.includes(attribute)) foundClasses.push(classEntry);
        }
        return foundClasses;
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param instructor
     */
    public findClassesByInstructor(instructor: string): Class[] {
        // Return an array of classes that match the instructor
        return this.classData.filter(classEntry => classEntry.instructor === instructor);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param credits
     */
    public findClassesByCredits(credits: number): Class[] {
        // Return an array of classes that match the credits
        return this.classData.filter(classEntry => classEntry.credits === credits);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param times
     */
    public findClassesByTimes(times: string): Class[] {
        // Return an array of classes that match the times
        return this.classData.filter(classEntry => classEntry.times === times);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param projectedEnrollment
     */
    public findClassesByProjectedEnrollment(projectedEnrollment: number): Class[] {
        // Return an array of classes that match the projected enrollment
        return this.classData.filter(classEntry => classEntry.projectedEnrollment === projectedEnrollment);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param currentEnrollment
     */
    public findClassesByCurrentEnrollment(currentEnrollment: number): Class[] {
        // Return an array of classes that match the current enrollment
        return this.classData.filter(classEntry => classEntry.currentEnrollment === currentEnrollment);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param seatsAvailable
     */
    public findClassesBySeatsAvailable(seatsAvailable: number): Class[] {
        // Return an array of classes that match the seats available
        return this.classData.filter(classEntry => classEntry.seatsAvailable === seatsAvailable);
    }

    /**
     * Returns an array of class objects from the scraper object.
     * @param status
     */
    public findClassesByStatus(status: 'OPEN' | 'CLOSED'): Class[] {
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
        this._courseID = id ? id.replace(/(\r\n|\n|\r)/gm, "").trim() : '';
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
        this._title = name ? name.replace(/(\r\n|\n|\r)/gm, "").trim() : '';
    }

    get title(): string {
        return this._title;
    }

    set instructor(instructor: string) {
        this._instructor = instructor ? instructor.replace(/(\r\n|\n|\r)/gm, "").trim() : '';
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
        this._times = times ? times.replace(/(\r\n|\n|\r)/gm, "").trim() : '';
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
        if (status == undefined) {
            this._status = 'CLOSED';
            return;
        }
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
