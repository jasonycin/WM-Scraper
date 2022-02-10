import * as fs from "fs";
const fetch = require('node-fetch');
const ObjectsToCsv = require('objects-to-csv');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

export interface IRateLimit {
    _interval: number,
    _lastRequest: number
}

export interface IData {
    term?: number,
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

export class Scraper {
    private _userAgent: string;
    private _rateLimit: IRateLimit = {
        _interval: 1000,
        _lastRequest: 0 // Date.now() millisecond timestamp
    };
    public courselistData: IData = {
        term: null,
        subjects: null
    };
    public classData: Class[] = [];

    constructor(userAgent: string, rateLimit?: number) {
        this.userAgent = userAgent;

        if (rateLimit) {
            this.rateLimit = rateLimit;
        }
    }

    public set userAgent(userAgent: string) {
        // User agent must be @email.wm.edu or @wm.edu email address.
        if(!/^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?(wm|email.wm)\.edu$/g.test(userAgent)) {
            throw new Error('Invalid user agent. Must be a W&M email address.');
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
            console.log(`WARNING: Rate limit set to ${ms}ms. You are responsible for setting a reasonable rate limit.`);

        this._rateLimit._interval = ms;
    }

    /**
     * Get the current rate limit.
     */
    public get rateLimit(): number {
        return this._rateLimit._interval;
    }

    private async _logAndExecuteRateLimit() {
        // Calculate time since last request
        const now = Date.now();
        const diff = now - this.rateLimit;

        // If the rate limit has been exceeded, force thread execution to halt until the rate limit is met.
        if (diff < this.rateLimit) {
            const wait = this.rateLimit - diff;
            console.log(`INFO: Rate limit reached. Waiting ${wait}ms...`);
            await new Promise(r => setTimeout(r, wait));
        }

        this._rateLimit._lastRequest = Date.now();
    }

    public async retrieveTermAndSubjects() {
        // Enforce rate limit
        await this._logAndExecuteRateLimit();

        // Retrieve the entire HTML page from the Course List
        const url = 'https://courselist.wm.edu/courselist/courseinfo/';
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': this._userAgent
            }
        });

        // Extract the HTML from the response and parse it using JSDOM
        const dom = new JSDOM(await response.text());

        // Extract the latest term choice
        const termChildren = dom.window.document.getElementById('term_code').children
        const term = termChildren[termChildren.length - 2].value;

        // Extract the subject dropdown into an array.
        const subjectsChildren = dom.window.document.getElementById('term_subj').children
        const subjectsArray = [];
        for (let subject of subjectsChildren) {
            subjectsArray.push(subject.value)
        }
        subjectsArray.shift(); // Remove the first element, which is a 0.

        // Save courselistData to the scraper object.
        this.courselistData.term = term;
        this.courselistData.subjects = subjectsArray;
    }

    /**
     *
     * @param subjectCode - If not provided, will extract information for all course subjects.
     */
    public async retrieveSubjectData(subjectCode?: string) {
        // Guard clauses
        if (!this.courselistData.term) {
            throw new Error('Term not set. Call retrieveTermAndSubjects() first.');
        }

        // If a parameter was provided, retrieve information for that subject only.
        if (subjectCode) {
            // Retrieve the entire HTML page from the Course List for the given subject.
            const url = `https://courselist.wm.edu/courselist/courseinfo/searchresults?term_code=${this.courselistData.term}&term_subj=${subjectCode}&attr=0&attr2=0&levl=0&status=0&ptrm=0&search=Search`
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
                await this.retrieveSubjectData(subject);
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
            throw new Error('Invalid classInfo parameter. Must be an array.');

        if (classInfo.length !== 11)
            throw new Error('Invalid classInfo parameter. Must be an array of length 11.');

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

    public findClassesByStatus(status: boolean) {
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
    private _status: boolean;

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

    set projectedEnrollment(projectedEnrollment: number) {
        this._projectedEnrollment = parseInt(projectedEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    get projectedEnrollment(): number {
        return this._projectedEnrollment;
    }

    set currentEnrollment(currentEnrollment: number) {
        this._currentEnrollment = parseInt(currentEnrollment.toString().replace(/(\r\n|\n|\r)/gm, "").trim());
    }

    get currentEnrollment(): number {
        return this._currentEnrollment;
    }

    set seatsAvailable(seatsAvailable: number) {
        this._seatsAvailable = parseInt(seatsAvailable
            .toString()
            .replace(/(\r\n|\n|\r)/gm, "")
            .replace('*', '')
            .trim());
    }

    get seatsAvailable(): number {
        return this._seatsAvailable;
    }

    set status(status: string | boolean) {
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
    }

    get status(): boolean {
        return this._status;
    }

}
