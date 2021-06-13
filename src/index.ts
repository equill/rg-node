// Top-level file that pulls the whole thing together.

// Imports
console.log('Importing third-party modules');
import neo4j from "neo4j-driver";

console.log('Importing local modules');
import { FetchSchemaFromDb, InjectSchemaIntoDb } from "./schema";

// Configs
console.log('Importing configs');
import { config } from './config';
import { coreSchema } from './core-schema';


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
