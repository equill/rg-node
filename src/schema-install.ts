import {
  IncomingSubSchemaVersion,
  IncomingResourceType,
  IncomingSchemaRelationship,
  IncomingSchemaRelationshipAttribute,
  SchemaResourceTypeAttribute,
} from './classes';

import {
  ErrorAndExit,
  Neo4jUnhandledError
} from './common';

import {
  GetSchemaFromDb
} from './schema-load';

import * as bunyan from 'bunyan';


// Functions and methods for interacting with the schema

function EnsureUniquenessIndex(driver,
                               coreSchema: IncomingSubSchemaVersion,
                               logger: bunyan.Logger) {
  logger.info(`Ensuring uniqueness constraint on attribute 'name' for label 'RgSchema'`);
  const queryString = `CREATE CONSTRAINT ON (s:RgSchema) ASSERT s.name IS UNIQUE`;
  logger.debug(`Using query string '${queryString}'`);

  var session = driver.session();
  session
  .run(queryString)
  .then(
    result => {
      logger.info(`Uniqueness constraint created on attribute 'name' for label 'RgSchema'`);
      CheckForSchemaRoot(driver, coreSchema, logger);
    },
    error => {
      // Handle Neo4j errors
      if (error.name === 'Neo4jError') {
        // Hopefully it told us that the constraint is already there
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          logger.info(`Uniqueness constraint already exists on attribute 'name' for label 'RgSchema'`);
          CheckForSchemaRoot(driver, coreSchema, logger);
        } else {
          session.close();
          Neo4jUnhandledError(logger, error)
        }
      }
      // Unhandled failure
      else {
        session.close();
        ErrorAndExit(logger, error);
      }
    });
}

function CheckForSchemaRoot(driver,
                            coreSchema: IncomingSubSchemaVersion,
                            logger: bunyan.Logger) {
  logger.info(`Checking for root node of schema`);
  const date = new Date;
  const timestamp = date.getTime();
  const qCreateSubschemaRoot = `MERGE (s:RgSchema {name: "root"})
  ON CREATE SET s.createddate = ${timestamp}
  RETURN s.name`;
  logger.info(`Ensuring presence of schema root, with query string '${qCreateSubschemaRoot}'`);

  const session = driver.session();
  session
  .run(qCreateSubschemaRoot)
  .then (
    namesArray => {
      session.close();
      logger.info(`Confirmed root is in place for subschema ${coreSchema.name}`);
      CheckForSchemaVersions(driver, coreSchema, logger);
    },
    error => {
      session.close();
      ErrorAndExit(logger, error)
    })
    .catch (error => {
      session.close();
      ErrorAndExit(logger, error, true)
    });
}

// Check whether there _are_ any versions.
function CheckForSchemaVersions(driver,
                                schema: IncomingSubSchemaVersion,
                                logger: bunyan.Logger) {
  logger.info(`Checking for schema versions`);
  const session = driver.session();
  session
    .run(`MATCH (:RgSchema {name: "root"})-[:VERSION]->(v:RgSchemaVersion) RETURN v.version;`)
    .then(
      result => {
        session.close();
        if (result.records.length > 0) {
          logger.info(`${result.records.length} schema versions found.`);
          logger.info('Now checking for a current schema.');
          CheckForCurrentSchema(driver, schema, logger);
        } else {
          logger.info('No versions found; installing one with the core schema.');
          InstallCurrentSchemaVersion(driver, schema, logger);
        }
      },
      error => {
        session.close();
        ErrorAndExit(logger, error)
      })
    .catch(error => {
        session.close();
        ErrorAndExit(logger, error, true)
    });
}

function CheckForCurrentSchema(driver,
                               schema: IncomingSubSchemaVersion,
                               logger: bunyan.Logger) {
  logger.info('Checking whether a current schema has been designated.')
  const session = driver.session();
  session
    .run('MATCH (:RgSchema {name: "root"})-[:CURRENT_VERSION]->(c:RgSchemaVersion) RETURN c.createddate AS version;')
    .then(
      result => {
        session.close();
        let version = result.records[0].get('version')
        if (version == undefined) {
          logger.info('Found no current schema. Installing one before proceeding further.');
          InstallCurrentSchemaVersion(driver, schema, logger);
        } else if (result.records.length == 1 && typeof(version)) {
          // We're good; load the schema
          logger.info(`Found current schema with version '${version}'`);
          GetSchemaFromDb(driver, logger);
        } else {
          logger.fatal(`Found ${result.records.length} current schemas. Something is *badly* wrong. Bailing out.`);
          process.exit();
        }
      },
      error => {
        session.close();
        ErrorAndExit(logger, error)
      })
}

function InstallCurrentSchemaVersion(driver,
                                     schema: IncomingSubSchemaVersion,
                                     logger: bunyan.Logger) {
  const date = new Date;
  const timestamp = date.getTime();

  // Accumulate the query string
  var queryString = `MATCH (r:RgSchema {name: "root"})
CREATE (r)-[:VERSION]->(v:RgSchemaVersion {createddate: ${timestamp}}),
(r)-[:CURRENT_VERSION]->(v)`;
  logger.info(`Attempting to install new current schema version, with this query string:\n${queryString}`);
  const session = driver.session();
  session
    .run(queryString)
    .then(
      result => {
        logger.info('New current schema installed.');
        InstallSubschema(driver, schema, timestamp, logger);
      },
      error => {
        session.close();
        ErrorAndExit(logger, error);
      })
}

function InstallSubschema(driver,
                          schema: IncomingSubSchemaVersion,
                          version: Number,
                          logger: bunyan.Logger) {
  logger.info(`Attempting to inject version ${schema.version} of schema ${schema.name}`);

  var promises = schema.resourceTypes.map(rType => {
    // Install the resourcetype itself
    var queryString = `MATCH (r:RgSchema {name: "root"})-[:VERSION]->(v:RgSchemaVersion {createddate: ${version}})
CREATE (v)-[:HAS]->(t:RgResourceType {name: "${rType.name}", dependent: ${rType.dependent}})`;
    // Now add its attributes
    const attrlen = rType.attributes.length;
    for (let i = 0; i < attrlen; i++) {
      let values = null;
      let attr = rType.attributes[i];
      if (attr.values && attr.values != []) {
        values = attr.values.join(',');
      }
      queryString += `,\n(t)-[:HAS]->(:RgResourcetypeAttribute {name: "${attr.name}", description: "${attr.description}"})`
    }

    logger.info(`Attempting to install resourcetypes, with this query string:\n${queryString}`);
    return driver.session().run(queryString);
  });

  Promise.all(promises)
  .then(
    result => {
      logger.info(`Seems to have worked. Installing relationships`);
      InstallSchemaRelationships(driver, schema, version, logger);
    },
    error => {
      ErrorAndExit(logger, error);
    })
    .catch (error => {
      ErrorAndExit(logger, error, true);
    });
}

function InstallSchemaRelationships(driver,
                                    subSchema: IncomingSubSchemaVersion,
                                    schemaversion: Number,
                                    logger: bunyan.Logger) {
  logger.info(`Installing relationships for schema ${subSchema.name}`);

  var promises = subSchema.relationships.map(rel => {
    // Install the relationship itself
    var queryString = `MATCH (:RgSchema {name: "root"})-[:VERSION]->(v:RgSchemaVersion {createddate: ${schemaversion}})-[:HAS]->(s:RgResourceType {name: "${rel.sourceType}"}),
(v)-[:HAS]->(t:RgResourceType {name: "${rel.targetType}"})
CREATE (s)<-[:SOURCE]-(r:RgRelationship {name: "${rel.name}", cardinality: "${rel.cardinality}", dependent: ${rel.dependent}, notes: "${rel.notes}"})-[:TARGET]->(t)`;

    // Now add its attributes
    const attrlen = rel.attributes.length;
    for (let i = 0; i < attrlen; i++) {
      let values = null;
      if (rel.attributes[i].values && rel.attributes[i].values != []) {
        values = rel.attributes[i].values.join(',')
      }
      queryString += `,\n(r)-[:HAS]->(:RgRelationshipAttribute {name: "${rel.attributes[i].name}", description: "${rel.attributes[i].description}", values: "${values}"})`;
    }
    logger.debug(`Attempting to install relationship ${rel.name} with query string\n${queryString}`);

    return driver.session().run(queryString);
  });

  Promise.all(promises)
  .then(
    results => {
      results.forEach(result => {
        logger.debug(`Result received for relationship '${result.records}'`);
      });
      GetSchemaFromDb(driver, logger);
    },
    error => {
      Neo4jUnhandledError(logger, error);
    })
    .catch(error => {
      ErrorAndExit(logger, error);
    });
}


export {
  EnsureUniquenessIndex
};
