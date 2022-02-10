export interface IRateLimit {
    _interval: number;
    _lastRequest: number;
}
export interface IData {
    term?: number;
    subjects?: string[];
}
export interface IJsonClass {
    _crn: number;
    _courseID: string;
    _attributes: string[];
    _title: string;
    _instructor: string;
    _credits: number;
    _times: string;
    _projectedEnrollment: number;
    _currentEnrollment: number;
    _seatsAvailable: number;
    _status: boolean;
}
export declare class Scraper {
    private _userAgent;
    private _rateLimit;
    courselistData: IData;
    classData: Class[];
    constructor(userAgent: string, rateLimit?: number);
    set userAgent(userAgent: string);
    get userAgent(): string;
    /**
     * Set a custom rate limit. Default is 500ms.
     * You are responsible for setting a reasonable rate limit!! Consider the universities' server impact.
     * @param ms
     */
    set rateLimit(ms: number);
    /**
     * Get the current rate limit.
     */
    get rateLimit(): number;
    private _logAndExecuteRateLimit;
    retrieveTermAndSubjects(): Promise<void>;
    /**
     *
     * @param subjectCode - If not provided, will extract information for all course subjects.
     */
    retrieveSubjectData(subjectCode?: string): Promise<void>;
    /**
     * Takes care of creating a class object from the provided class data and saving it to the scraper object.
     * Used internally by the retrieveClassData() method.
     * @param classInfo
     * @private
     */
    private createAndSaveClass;
    /**
     * Saves all data contained in the scraper objects classData key to a .csv file.
     */
    saveToCsv(filename: string): Promise<void>;
    saveToJson(filename: string): void;
    loadFromJson(filepath: string): Promise<void>;
    findClassByCrn(crn: string): Class;
    findClassByCourseID(courseID: string): Class;
    findClassesByAttribute(attribute: string): Class[];
    findClassesByInstructor(instructor: string): Class[];
    findClassesByCredits(credits: number): Class[];
    findClassesByTimes(times: string): Class[];
    findClassesByProjectedEnrollment(projectedEnrollment: number): Class[];
    findClassesByCurrentEnrollment(currentEnrollment: number): Class[];
    findClassesBySeatsAvailable(seatsAvailable: number): Class[];
    findClassesByStatus(status: boolean): Class[];
}
export declare class Class {
    private _crn;
    private _courseID;
    private _attributes;
    private _title;
    private _instructor;
    private _credits;
    private _times;
    private _projectedEnrollment;
    private _currentEnrollment;
    private _seatsAvailable;
    private _status;
    constructor(crn?: string, courseID?: string, attributes?: string[], title?: string, instructor?: string, credits?: number, times?: string, projectedEnrollment?: number, currentEnrollment?: number, seatsAvailable?: number, status?: string);
    set crn(id: string);
    get crn(): string;
    set courseID(id: string);
    get courseID(): string;
    set attributes(attributes: string[]);
    get attributes(): string[];
    set title(name: string);
    get title(): string;
    set instructor(instructor: string);
    get instructor(): string;
    set credits(credits: number);
    get credits(): number;
    set times(times: string);
    get times(): string;
    set projectedEnrollment(projectedEnrollment: number);
    get projectedEnrollment(): number;
    set currentEnrollment(currentEnrollment: number);
    get currentEnrollment(): number;
    set seatsAvailable(seatsAvailable: number);
    get seatsAvailable(): number;
    set status(status: string | boolean);
    get status(): boolean;
}
