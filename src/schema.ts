// Incoming classes, for inserting new schemas

class IncomingSchemaVersion {
  readonly name: string;
  readonly version: number;
  readonly applyOrder: number;
  // resourceTypes is a map of string:object, where
  // string = name of a SchemaResourceType object, and
  // object = SchemaResourceType object.
  readonly resourceTypes: [IncomingResourceType];
  readonly relationships: [IncomingSchemaRelationship];

  constructor({name, version, applyOrder, resourceTypes, relationships}) {
    this.name = name;
    this.version = version;
    this.applyOrder = applyOrder;
    this.resourceTypes = resourceTypes;
    this.relationships = relationships;
  }
}


class IncomingResourceType {
  readonly name: string;
  readonly dependent: boolean;
  readonly notes: string;
  attributes: [SchemaResourceTypeAttribute];

  constructor({name, dependent, notes, attributes}) {
    this.name = name;
    this.dependent = dependent;
    this.notes = notes;
    this.attributes = attributes;
  }
}


class IncomingSchemaRelationship {
  readonly name: string;
  readonly sourceType: string;
  readonly targetType: string;
  readonly cardinality: SchemaCardinality;
  readonly dependent: boolean;
  readonly notes: string;
  attributes: [IncomingSchemaRelationshipAttribute];

  constructor({
    name,
    sourceType,
    targetType,
    cardinality,
    dependent,
    notes,
    attributes
  }) {
    this.name = name;
    this.sourceType = sourceType;
    this.targetType = targetType;
    this.cardinality = cardinality;
    this.dependent = dependent;
    this.notes = notes;
    this.attributes = attributes;
  }
}

class IncomingSchemaRelationshipAttribute {
  readonly name: string;
  readonly description: string;
  // "values" will need to be a union type at some point
  values: [string];

  constructor({name, description, values}) {
    this.name = name;
    this.description = description;
    this.values = values;
  }
}


// Classes for extracting the schema from the db and building the API

class SchemaSet {
  readonly name: string;
  // The `schemas` attribute is a map of number:object, where
  // number == applyOrder of the schema version
  // object == SchemaVersion object
  // This gathers them under a single, specified struture.
  schemas: object;

  constructor(name, schemas) {
    this.name = name;
    this.schemas = schemas;
  }
}

class SchemaVersion {
  readonly version: number;
  readonly applyOrder: number;
  readonly createdAt: number;
  // resourceTypes is a map of string:object, where
  // string = name of a SchemaResourceType object, and
  // object = SchemaResourceType object.
  resourceTypes: [object];

  constructor({version, applyOrder, resourceTypes}) {
    this.version = version;
    this.applyOrder = applyOrder;
    this.resourceTypes = resourceTypes;
  }
}

class SchemaResourceType {
  readonly name: string;
  readonly dependent: boolean;
  readonly notes: string;
  attributes: [SchemaResourceTypeAttribute];
  relationships: [string];

  constructor({name, dependent, notes, attributes, relationships}) {
    this.name = name;
    this.dependent = dependent;
    this.notes = notes;
    this.attributes = attributes;
    this.relationships = relationships;
  }
}

class SchemaResourceTypeAttribute {
  readonly name: string;
  readonly description: string;
  // "values" will need to be a union type at some point
  values: [string];

  constructor({name, description, values}) {
    this.name = name;
    this.description = description;
    this.values = values;
  }
}

enum SchemaCardinality {
  OneToOne = "1:1",
  OnetoMany = "1:Many",
  ManyToOne = "Many:1",
  ManyToMany = "Many:Many",
}

class SchemaRelationship {
  readonly name: string;
  readonly targetType: SchemaResourceType;
  readonly cardinality: SchemaCardinality;
  readonly dependent: boolean;
  readonly notes: string;
  attributes: [SchemaRelationshipAttribute];

  constructor({name, targetType, cardinality, dependent, notes, attributes}) {
    this.name = name;
    this.targetType = targetType;
    this.cardinality = cardinality;
    this.dependent = dependent;
    this.notes = notes;
    this.attributes = attributes;
  }
}

class SchemaRelationshipAttribute {
  readonly name: string;
  readonly description: string;
  // "values" will need to be a union type at some point
  values: [string];

  constructor({name, description, values}) {
    this.name = name;
    this.description = description;
    this.values = values;
  }
}



// Functions and methods for interacting with the schema

function EnsureUniquenessIndex(driver, subSchema) {
  console.log(`Ensuring uniqueness constraint on attribute 'name' for label 'RgSchema'`);
  const queryString = `CREATE CONSTRAINT ON (s:RgSchema) ASSERT s.name IS UNIQUE`;
  console.log(`Using query string '${queryString}'`);

  var session = driver.session();
  session
  .run(queryString)
  .then(
    result => {
      result = true;
      console.log(`Uniqueness constraint created on attribute 'name' for label 'RgSchema'`);
      InjectSchemaIntoDb(driver, subSchema);
    },
    error => {
      // Handle Neo4j errors
      if (error.name === 'Neo4jError') {
        // Hopefully it told us that the constraint is already there
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          console.log(`Uniqueness constraint already exists on attribute 'name' for label 'RgSchema'`);
          InjectSchemaIntoDb(driver, subSchema);
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

function InjectSchemaIntoDb(driver, schema: IncomingSchemaVersion) {
  console.log(`Attempting to inject version ${schema.version} of schema ${schema.name}`);
  const date = new Date;
  const timestamp = date.getTime();
  const queryCreateSubschema = `CREATE (s:RgSchema {name: "${schema.name}", createddate: ${timestamp}}) RETURN s.name as name;`;
  console.log(`Attempting to create subschema with query string '${queryCreateSubschema}'`);

  var session = driver.session();
  // Insert the parent schema object via an autocommit transaction,
  // and get a promise in return.
  var insertSchemaPromise = session.writeTransaction(async txc => {
    // More than one statement can be run here
    var result = await txc.run(queryCreateSubschema)
    // Here because it's mandatory to return _something_ from a writeTransaction block.
    //return result.records.map(record => record.get('name'))
    return result
  })
  //
  // Consuming the resulting promise, also left here as a HOWTO:
  insertSchemaPromise
  .then (
    namesArray => {
      console.log(namesArray)
    },
    error => {
      console.log(error);
      session.close();
    })
    .catch (error => {
      console.log(error);
      session.close()
    });
}

    /*
  var insertSchemaVersion = session.writeTransaction(async txc => {
    var svResult = await txc.run(`MATCH (s:RgSchema {name: "${schema.name}"}) CREATE (s)-[:VERSION]->(v:RgSchemaVersion);`)
    return svResult.records
  })
  */

function EnsureSchemaIsCurrent(driver, schema: IncomingSchemaVersion) {
  console.log(`Ensuring schema ${schema.name} is at version ${schema.version}`)
  // Something tells me this code should be expecting a promise, not a boolean.
  var result = EnsureUniquenessIndex(driver, schema);
  console.log(`Type of result: '${typeof result}'. Value of result: '${result}'.`);
  if (Boolean(result)) {
    console.log('Successfully ensured the presence of a uniqueness index on the "name" attribute of RgSchema objects.');
  } else {
    console.error('Failed to ensure a uniqueness constraint. This is *bad*.');
  }
}

function FetchSchemaFromDb(driver) {
  console.log('Attempting to fetch the schema.');
  var session = driver.session();
  session
    .run('MATCH (p:Category) RETURN p.name as name;')
    .then(result => {
      result.records.forEach(record => {
        console.log(`Fetched record '${record.get('name')}'`)
      })
    })
    .catch(error => {
      console.log(error);
    })
    .then(session.close());
}


export {
  // Types
  SchemaCardinality,
  // Classes
  IncomingSchemaVersion,
  IncomingResourceType,
  IncomingSchemaRelationship,
  IncomingSchemaRelationshipAttribute,
  SchemaVersion,
  SchemaResourceType,
  SchemaResourceTypeAttribute,
  SchemaRelationship,
  // Functions
  FetchSchemaFromDb,
  EnsureUniquenessIndex
};
