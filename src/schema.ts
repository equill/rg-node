class ResourceType {
  name: string;
  dependent: boolean;
  notes: string;
  attributes: [ResourceTypeAttribute];
  relationships: [string];

  constructor(name, dependent, notes, attributes, relationships) {
    this.name = name;
    this.dependent = dependent;
    this.notes = notes;
    this.attributes = attributes;
    this.relationships = relationships
  }
}

class ResourceTypeAttribute {
  name: string;
  description: string;
  // "values" will need to be a union type at some point
  values: [string];

  constructor(name, description, values) {
    this.name = name;
    this.description = description;
    this.values = values;
  }
}

enum Cardinality {
  OneToOne = "1:1",
  OnetoMany = "1:Many",
  ManyToOne = "Many:1",
  ManyToMany = "Many:Many",
}

class Relationship {
  name: string;
  targetType: ResourceType;
  cardinality: Cardinality;
  dependent: boolean;
  notes: string;

  constructor(name, targetType, cardinality, dependent, notes) {
    this.name = name;
    this.targetType = targetType;
    this.cardinality = cardinality;
    this.dependent = dependent;
    this.notes = notes;
  }
}


function FetchSchemaFromDb(driver) {
  console.log('Attempting to fetch the schema.');
  var session = driver.session();
  session
    .run('MATCH (p:Category) RETURN p.name as name;')
    .subscribe({
      onKeys: keys => {console.log(`Fetched keys '${keys}'`)},
      onNext: record => {console.log(`Fetched record '${record.get('name')}'`)},
      onCompleted: () => {session.close()},
      onError: error => {console.log(error)}
    })
}


export {
  // Types
  Cardinality,
  // Classes
  ResourceType,
  ResourceTypeAttribute,
  Relationship,
  // Functions
  FetchSchemaFromDb
};
