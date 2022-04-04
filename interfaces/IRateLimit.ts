/**
 * Object to store rate-limit information including the interval.
 * Future plan is to implement a fully-fledged queue.
 */
export interface IRateLimit {
    _interval: number,
    _lastRequest: number
}
