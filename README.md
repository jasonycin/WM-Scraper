# Course Scrapper 🟢🟡

### Information
This is a high-level scrapper for the course list of the College of William and Mary. It can be used to quickly retrieve all courses
found [here](https://courselist.wm.edu/courselist/courseinfo/search?). This is not the most performant scrapper as it saves
each class as an object in memory. Feel free to send a pull request with enhancements!

In addition, this scrapper **requires setting a user agent with a W&M email address** and sets a **default rate limit of 500 milliseconds**.
This identifies your requests to the W&M servers and prevents mistakenly overloading the server with requests.

### Documentation
Documentation is generated using TypeDoc and hosted via GitHub pages.
[https://heaveria-ns.github.io/WM-Scraper/](https://heaveria-ns.github.io/WM-Scraper/)

### Table of Contents
1. 🧑‍🏫 [Usage](#usage)
   1. 👷‍♂️[Installation](#installation)
   2. 🏗️ [Instantiation](#instantiation)
   3. 🖥️ [Get Data from Open Course List](#get-data-from-open-course-list)
   4. 💾 [Save Data](#save-data)
   5. 🔎 [Find Data Easily](#find-data-easily)
2. 🔃 [Load `.json` Data](#load-json-course-data)
3. 🪵 [Logging](#logging)
4. 👏 [Author](#author)

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

#### Get Data from Open Course List
This library uses async/await and therefore you must wrap your code in an asynchronous function to *await* data.
```ts
import * as wm from 'wm-classes/scraper';
const scraper = new wm.Scraper('abcdef@wm.edu')

async function doStuff() {
   /**
    * 1. Get all terms and subjects
    * ✨ You can now skip this step with version 2!
    */
   await scraper.getTermsAndSubjects();
   console.log(scraper.courselistData) // Object with terms and subjects

   /**
     * 2. Chose to get a specific subject
     */
    await scraper.getCourseData('BIOL');
    /**
     * OR get all subjects (which we retrieved earlier)
     */
    await scraper.getCourseData();

    /**
     * 3. You can now view the results.
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

#### Find Data Easily
📖 [Documentation](https://heaveria-ns.github.io/WM-Scraper/)  
The following functions are provided to filter, map, and return (a) result(s).  
❗⚠️ If you already have `.json` file with course data from this library, please [load that data](#load-json-course-data) into the scraper instead of hitting W&M's servers repeatedly.

| Class   | Method                             | Purpose                                                                                                          | Returns  |
|---------|------------------------------------|------------------------------------------------------------------------------------------------------------------|----------|
| Scraper | findClassByCrn()                   | Find an individual class by CRN.                                                                                 | String   |
| Scraper | findClassByCourseID()              | Find an individual class by course ID.                                                                           | String   |
| Scraper | findClassesByAttribute()           | Find all classes with a specific attribute. Future support for passing in arrays of attributes.                  | String[] |
| Scraper | findClassesByInstructor()          | Find all classes with a specific instructor.                                                                     | String[] |
| Scraper | findClassesByCredits()             | Find all classes with a specific number of credits.                                                              | String[] |
| Scraper | findClassesByTimes()               | Find all classes at a specific time.                                                                             | String[] |
| Scraper | findClassesByProjectedEnrollment() | Find all classes with a specific projected enrollment. Future support for getting all classes which are >0.      | String[] |
| Scraper | findClassesByCurrentEnrollment()   | Find all classes by their current enrollment. Future support for getting all classes which are >0.               | String[] |
| Scraper | findClassesBySeatsAvailable()      | Find all classes by the specific number of seats available. Future support for getting all classes which are >0. | String[] |
| Scraper | findClassesByStatus()              | Find all classes by their status. Status must be `OPEN` or `CLOSED`. Future support for passing in booleans.     | String[] |

### Load `.json` Course Data
If you have saved course data previously to a `.json` file using `.saveToJson('')`, you can re-insert it into the Scraper
instead of hitting the W&M Open Course List repeatedly. Please use this as often as you can.
```TypeScript
// Use the filepath for the argument.
await scraper.loadFromJson('./courses.json');
```

### Logging
This library uses [Winston](https://www.npmjs.com/package/winston) for logging. It is on by default but can be turned off.
```TypeScript
scraper.logging = false; // Turn off logging
scraper.logging = true; // Turn on logging
```
### Author
Jason LaPierre ([jalapierre@wm.edu](mailto:jalapierre@wm.edu))  
Biology '25

Please feel free to reach out to me with any questions or suggestions! 👏👏
