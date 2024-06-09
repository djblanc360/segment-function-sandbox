# Segment Function Tester

Testing environment for Segment.io source and destination functions. Enables rapid integration of Exponea events through Segment.io for all brands and all stores.

NOTE:
The use of files were originally to be used for standalone Segment files but have be reconfigured for security measures on this public repository.

## Description

This app runs significantly faster than Segment’s testing environment and has more in-depth testing logs. Successfully completed tests reflect real API calls. For example, a successful Exponea purchase event in the app will result in that event showing in a customer’s profile in Bloomreach. Allows a developer to save multiple versons of a function for to be quickly retrieved and run as necessary. Also saves multiple payloads for simulating different scenarios.

## Getting Started

### Dependencies

* node-fetch: to use the Fetch API in Node.js

### Installing

1. Install dependencies on local environment
```
npm install
```

### Executing program

1. using terminal navigate to the directoy of the event type
Example:
To test purchase events, navigate to /purchase folder from root
```
cd purchase
```
2. populate index.js with either a source or destination function
* can use one of the functions saved in their respective folders
* files match the function name in Segment, prefaced with 'index-'
EXAMPLE:
can test the existing destination function for purchase item by navigating to
/purchase/destination_functions/index-purchase_item.js
3. read the related payload for the function at top of index.js
```
fs.readFile('./json-sources/{resource_name}.json', 'utf8', (err, data) => 
```
4. run the following code in terminal
```
node index.js
```

### Executing program (New File Structure)

1. using terminal navigate to the directoy of the event type
Example:
To test purchase events, navigate to /customer_update folder from root
```
cd purchase
```
2. populate index.js with either a source or destination function
* can use one of the functions saved in their respective folders
* files match the function name in Segment, prefaced with 'index-'
EXAMPLE:
can test the existing destination function for purchase item by navigating to
/purchase/destination_functions/index-purchase_item.js and then copying the file over to the root index.js
3. read the related payload for the function at top of index.js
EXAMPLE:
can test a destination function by reading a payload from destination-payloads folder
```
fs.readFile('./destination-payloads/{resource_name}.json', 'utf8', (err, data) => 
```
4. run the following code in terminal
```
node index.js
```


## Help

* Each event directory has a /delivery-logs subdirectory to save and reference output from Segment.io's compiler and debugger
* Each event directory has a /terminal-output subdirectory save and reference functions ran in index.js


## Potential Future Updates
* handle all Bloomreach events
* handle all brands: missing Roark, Kaenon and Melin

## Authors

* [@Daryl Blancaflor](dblancaflor@arch-cos.com), formally dblancaflor@olukai.com

## Version History

* 0.3
    * exchange and refund events
* 0.2
    * modify file structure
* 0.1
    * purchase events

## License


## Acknowledgments
