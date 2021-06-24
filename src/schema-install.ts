import {
  IncomingSubSchemaVersion,
  IncomingResourceType,
  IncomingSchemaRelationship,
  IncomingSchemaRelationshipAttribute,
  SchemaResourceTypeAttribute,
} from './classes';


// Functions and methods for interacting with the schema

function EnsureUniquenessIndex(driver, coreSchema) {
  console.log(`Ensuring uniqueness constraint on attribute 'name' for label 'RgSchema'`);
  const queryString = `CREATE CONSTRAINT ON (s:RgSchema) ASSERT s.name IS UNIQUE`;
  console.log(`Using query string '${queryString}'`);

  var session = driver.session();
  session
  .run(queryString)
  .then(
    result => {
      console.log(`Uniqueness constraint created on attribute 'name' for label 'RgSchema'`);
      CheckForSchemaRoot(driver, coreSchema);
    },
    error => {
      // Handle Neo4j errors
      if (error.name === 'Neo4jError') {
        // Hopefully it told us that the constraint is already there
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          console.log(`Uniqueness constraint already exists on attribute 'name' for label 'RgSchema'`);
          CheckForSchemaRoot(driver, coreSchema);
        } else {
          session.close();
          // We didn't expect this error; log a detailed breakdown.
          console.error(`Unknown Neo4j error received: ${error}`);
          console.error(`Error code: ${error.code}`)
          console.error(`Error name: ${error.name}`)
          console.error(`Error message: ${error.message}`);
          process.exit();
        }
      }
      // Unhandled failure
      else {
        session.close();
        // Fall back to generic error reporting
        console.error(`Constraint enforcement produced an error of type ${typeof error}: ${error}`);
        process.exit();
      }
    });
}

function CheckForSchemaRoot(driver, coreSchema: IncomingSubSchemaVersion) {
  console.log(`Checking for root node of schema`);
  const date = new Date;
  const timestamp = date.getTime();
  const qCreateSubschemaRoot = `MERGE (s:RgSchema {name: "root"})
  ON CREATE SET s.createddate = ${timestamp}
  RETURN s.name`;
  console.log(`Ensuring presence of schema root, with query string '${qCreateSubschemaRoot}'`);

  var session = driver.session();
  // Insert the parent schema object via an autocommit transaction,
  // and get a promise in return.
  var insertSchemaPromise = session.writeTransaction(async txc => {
    // More than one statement can be run here
    var result = await txc.run(qCreateSubschemaRoot)
    // Here because it's mandatory to return _something_ from a writeTransaction block.
    return result
  })
  //
  // Consuming the resulting promise
  insertSchemaPromise
  .then (
    namesArray => {
      session.close();
      console.log(`Confirmed root is in place for subschema ${coreSchema.name}`);
      CheckForSchemaVersions(driver, coreSchema);
    },
    error => {
      session.close();
      console.log(`Received error: '${error}'`);
      console.log('Bailing out.');
      process.exit();
    })
    .catch (error => {
      session.close();
      console.log(`Caught error: '${error}'`);
      console.log('Bailing out.');
      process.exit();
    });
}

// Check whether there _are_ any versions.
function CheckForSchemaVersions(driver, schema: IncomingSubSchemaVersion) {
  console.log(`Checking for schema versions`);
  const session = driver.session();
  session
    .run(`MATCH (:RgSchema {name: "root"})-[:VERSION]->(v:RgSchemaVersion) RETURN v.version;`)
    .then(
      result => {
        session.close();
        if (result.records.length > 0) {
          console.log(`${result.records.length} schema versions found.`);
          console.log('Now checking for a current schema.');
          CheckForCurrentSchema(driver, schema);
        } else {
          console.log('No versions found; installing one with the core schema.');
          InstallCurrentSchemaVersion(driver, schema);
        }
      },
      error => {
        session.close();
        console.error(`Neo4j returned error '${error}'`);
        console.error('Bailing out.');
        process.exit();
      })
    .catch(error => {
        session.close();
        console.error(`Caught unhandled error '${error}'`);
        console.error('Bailing out.');
        process.exit();
    });
}

function CheckForCurrentSchema(driver, schema: IncomingSubSchemaVersion) {
  console.log('Checking whether a current schema has been designated.')
  const session = driver.session();
  session
    .run('MATCH (:RgSchema {name: "root"})-[:VERSION]->(c:RgSchemaVersion) RETURN c.createddate AS version;')
    .then(
      result => {
        session.close();
        if (result.records[0]['version'] == undefined) {
          console.log('Found no current schema. Installing one before proceeding further.');
          InstallCurrentSchemaVersion(driver, schema);
        } else if (result.records.length == 1) {
          const version = result.records[0]['version'];
          console.log(`Found current schema with version '${version}'`);
          InstallSubschema(driver, schema, version);
        } else {
          console.log(`Found ${result.records.length} current schemas. Something is *badly* wrong. Bailing out.`);
          process.exit();
        }
      },
      error => {
        session.close();
        console.error(`Neo4j returned error '${error}'`);
        console.error('Bailing out.');
        process.exit();
      })
}

function InstallCurrentSchemaVersion(driver, schema: IncomingSubSchemaVersion) {
  const date = new Date;
  const timestamp = date.getTime();

  // Accumulate the query string
  var queryString = `MATCH (r:RgSchema {name: "root"})
CREATE (r)-[:VERSION]->(v:RgSchemaVersion {createddate: ${timestamp}}),
(r)-[:CURRENT_VERSION]->(v)`;
  console.log(`Attempting to install new current schema version, with this query string:\n${queryString}`);
  const session = driver.session();
  session
    .run(queryString)
    .then(
      result => {
        console.log('New current schema installed.');
        InstallSubschema(driver, schema, timestamp);
      },
      error => {
        session.close();
        console.error(`Neo4j returned error '${error}'. Bailing out.`);
        process.exit();
      })
}

function InstallSubschema(driver, schema: IncomingSubSchemaVersion, version: Number) {
  console.log(`Attempting to inject version ${schema.version} of schema ${schema.name}`);

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

    console.log(`Attempting to install resourcetypes, with this query string:\n${queryString}`);
    return driver.session().run(queryString);
  });

  Promise.all(promises)
  .then(
    result => {
      console.log(`Seems to have worked. Installing relationships`);
      InstallSchemaRelationships(driver, schema, version);
    },
    error => {
      console.log(`Received error: '${error}'`);
      console.log('Bailing out.');
      process.exit();
    })
    .catch (error => {
      console.log(`Caught error: '${error}'`);
      console.log('Bailing out.');
      process.exit();
    });
}

function InstallSchemaRelationships(driver, subSchema: IncomingSubSchemaVersion, schemaversion: Number) {
  console.log(`Installing relationships for schema ${subSchema.name}`);

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
    console.log(`Attempting to install relationship ${rel.name} with query string\n${queryString}`);

    return driver.session().run(queryString);
  });

  Promise.all(promises)
  .then(
    results => {
      results.forEach(result => {
        console.log(`Result received for relationship '${result.records}'`);
      });
      console.log('All done; exiting.');
      process.exit();
    },
    error => {
      console.log(`Received error ${error}`);
      console.error(`Error code: ${error.code}`)
      console.error(`Error name: ${error.name}`)
      console.log(`Received error ${error.message}`);
    })
    .catch(error => {
      console.log(`Caught error ${error}`)
    });
}


export {
  EnsureUniquenessIndex
};
