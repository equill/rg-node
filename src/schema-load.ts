import * as bunyan from 'bunyan';

// Fetch the *current* version of the schema from the db
function GetSchemaFromDb(driver, logger: bunyan.Logger) {
  logger.info('Fetching the current schema from the database.');
  const queryString = `MATCH (:RgSchema {name: "root"})-[:CURRENT_VERSION]->(v:RgSchemaVersion)`;
  logger.debug(`Using query string ${queryString}`);
  process.exit();
}

export {
  GetSchemaFromDb
};
