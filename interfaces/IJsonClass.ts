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
