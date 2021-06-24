import {
  IncomingSubSchemaVersion,
  IncomingResourceType,
  SchemaResourceTypeAttribute,
  IncomingSchemaRelationship,
  IncomingSchemaRelationshipAttribute,
} from './schema-install';

const coreSchema = new IncomingSubSchemaVersion({
  name: "core",
  version: 1,
  applyOrder: 0,
  resourceTypes: [
    new IncomingResourceType({
      name: "tags",
      dependent: false,
      notes: "Special-case meta-resource, representing an instance of any type of resource.",
      attributes: [
        new SchemaResourceTypeAttribute({
          name: "description",
          description: "Clarification of what the tag means.",
          values: undefined
        })
      ]}),
    new IncomingResourceType({
      name: "any",
      dependent: false,
      notes: "Special-case meta-resource, representing an instance of any type of resource.",
      attributes: [],
    }),
    new IncomingResourceType({
      name: "pronouns",
      dependent: false,
      notes: "The pronouns by which a person prefers to be addressed",
      attributes: [],
    }),
    new IncomingResourceType({
      name: "people",
      dependent: false,
      notes: "Any kind of person, whether real, notional or purely speculative.",
      attributes: [
        new SchemaResourceTypeAttribute({
          name: "displayName",
          description: "The human-friendly version of their name, to be displayed in the UI.",
          values: undefined
        })
      ]
    }),
    new IncomingResourceType({
      name: "groups",
      dependent: false,
      notes: "A means of grouping things into sets.",
      attributes: [
        new SchemaResourceTypeAttribute({
          name: "description",
          description: "Clarifying notes about what this group is for.",
          values: undefined
        })
      ]
    }),
  ],
  relationships: [
    new IncomingSchemaRelationship({
      name: "Tags",
      sourceType: "any",
      targetType: "tags",
      cardinality: "many:many",
      dependent: false,
      notes: "Anything can be tagged with any tag.",
      attributes: []
    }),
    new IncomingSchemaRelationship({
      name: "Groups",
      sourceType: "any",
      targetType: "groups",
      cardinality: "many:many",
      dependent: false,
      notes: "Anything can be put into a group.",
      attributes: []
    }),
    new IncomingSchemaRelationship({
      name: "Pronouns",
      sourceType: "people",
      targetType: "pronouns",
      cardinality: "many:many",
      dependent: false,
      notes: "Sets of pronouns a person is _comfortable_ being addressed with; could be more than one.",
      attributes: []
    })
  ]
})

export { coreSchema };
