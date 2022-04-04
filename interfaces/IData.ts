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
