// Common functions

import * as bunyan from 'bunyan';


// General-purpose function for handling a fatal error.
function ErrorAndExit(logger: bunyan.Logger, error: Error, caught: Boolean = true) {
  if (caught) {
        logger.fatal('Caught fatal error.');
  } else {
        logger.fatal('Received fatal error.');
  }
  logger.error(`Error message: '${error}'`);
  logger.info('Bailing out.');
  process.exit();
}

// We didn't expect this error; log a detailed breakdown.
function Neo4jUnhandledError(logger: bunyan.Logger, error) {
  logger.fatal(`Unknown Neo4j error received: ${error}`);
  logger.error(`Error code: ${error.code}`);
  logger.error(`Error name: ${error.name}`);
  logger.error(`Error message: ${error.message}`);
  process.exit();
}

export {
  ErrorAndExit,
  Neo4jUnhandledError
};
