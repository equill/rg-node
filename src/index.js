// Top-level file that pulls the whole thing together.
// Written directly in Javascript because Typescript spontaneously explodes
// on contact with `import neo4j from 'neo4j-driver'`.

// Imports
console.log('Importing third-party modules');
const neo4j = require("neo4j-driver");

console.log('Importing local modules');
const { FetchSchemaFromDb, InjectSchemaIntoDb } = require("./schema");

// Configs
console.log('Importing configs');
const config = require('./config').config;
const { coreSchema } = require('./core-schema');


// Configuration

console.log('Configuring the driver');
const driver = neo4j.driver(
  `bolt://${config.neo4j.hostname}:${config.neo4j.port}`,
  neo4j.auth.basic(config.neo4j.username,
  config.neo4j.password)
  );

console.log(`Configured the driver to connect to ${config.neo4j.hostname}`);


// Startup

//FetchSchemaFromDb(driver);
InjectSchemaIntoDb(driver, coreSchema);

/*
 * Eventually a server will go in here.
 */


// Shutdown

console.log('Closing the driver.');
driver.close();
