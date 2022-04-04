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
