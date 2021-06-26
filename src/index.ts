// Top-level file that pulls the whole thing together.

// Imports
import * as bunyan from 'bunyan';
const logger = bunyan.createLogger({name: "rg-node", level: "info"});

logger.info('Importing third-party modules');
import neo4j from "neo4j-driver";

logger.info('Importing local modules');
import { EnsureUniquenessIndex } from "./schema-install";

// Configs
logger.info('Importing configs');
import { config } from './config';
import { coreSchema } from './core-schema';


// Configuration

logger.info('Configuring the driver');
const driver = neo4j.driver(
  `bolt://${config.neo4j.hostname}:${config.neo4j.port}`,
  neo4j.auth.basic(config.neo4j.username,
  config.neo4j.password)
  );

logger.info(`Configured the driver to connect to ${config.neo4j.hostname}`);


// Startup

EnsureUniquenessIndex(driver, coreSchema, logger);
