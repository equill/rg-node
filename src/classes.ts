// Incoming classes, for inserting new schemas

class IncomingSubSchemaVersion {
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

export {
  IncomingSubSchemaVersion,
  IncomingResourceType,
  IncomingSchemaRelationship,
  IncomingSchemaRelationshipAttribute,
  SchemaResourceTypeAttribute,
}
