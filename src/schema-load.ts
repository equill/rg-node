// Fetch the *current* version of the schema from the db
function GetSchemaFromDb(driver) {
  console.log('Fetching the current schema from the database.');
  const queryString = `MATCH (:RgSchema {name: "root"})-[:CURRENT_VERSION]->(v:RgSchemaVersion)`;
  console.log(`Using query string ${queryString}`);
  process.exit();
}

export {
  GetSchemaFromDb
};
