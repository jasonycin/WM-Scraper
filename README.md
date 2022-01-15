# Course Scrapper 🟢🟡

### Information
This is a low-level scrapper for the course list of the College of William and Mary. It can be used to quickly retrieve all courses
found [here](https://courselist.wm.edu/courselist/courseinfo/search?). This is not the most performant scrapper as it saves
each class as an object in memory. Feel free to send a pull request with enhancements!

 In addition, this scrapper **requires setting a user agent with a W&M email address** and sets a **default rate limit of 500 milliseconds**.
This identifies your requests to the W&M servers and prevents mistakenly overloading the server with requests.

### Usage
#### Installation
In the terminal, run the following command:
```bash
npm install wm-classes
```
After installation of the NPM module, you can import the library:
```ts
// For TypeScript use the import syntax (reccomended):
import * as wm from 'wm-classes/scraper';

// For JavaScript use the require syntax:
const wm = require('wm-classes');
```

#### Instantiation
Instantiate the scrapper object to access all properties and methods.  
⚠️ **You must set a user-agent.** It must be a valid W&M email address (email.wm.edu or wm.edu). Please be honest. This identifies you to W&M servers.
```ts
// TODO: Replace user agent string
const scraper = new wm.Scraper('abcdef@wm.edu')
```

#### Collect information
This library uses async/await and therefore you must wrap your code in an asynchronous function to *await* data.
```ts
import * as wm from 'wm-classes/scraper';
const scraper = new wm.Scraper('abcdef@wm.edu')

async function doStuff() {
    /**
     * Retrieves the term and subjects from the courselist.
     * Verify result with: console.log(scraper.courselistData)
     * 
     * ⛔️ YOU MUST DO THIS FIRST!
     */
    await scraper.retrieveTermAndSubjects();

    /**
     * Chose to get a specific subject
     */
    await scraper.retrieveSubjectData('BIOL');
    /**
     * OR get all subjects (which we retrieved earlier)
     */
    await scraper.retrieveSubjectData();

    /**
     * You can now view the results.
     * Each class is saved as an object.
     */
    console.log(scraper.classData);
}

// Remember to call your function!
doStuff();
```

#### Save data
There are two built-in methods for easily saving collected data to a **CSV or JSON file**.
Here's how to do both:
```ts
// Save to CSV file
await scraper.saveToCsv('courses'); // Saves courses.csv to current working directory.
    
// Save to JSON file
await scraper.saveToJson('courses'); // Saves courses.json to current working directory.
```



