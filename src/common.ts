// Common functions


// General-purpose function for handling a fatal error.
function ErrorAndExit(error: Error, caught: Boolean = true) {
  if (caught) {
        console.log('Caught fatal error.');
  } else {
        console.log('Received fatal error.');
  }
  console.log(`Error message: '${error}'`);
  console.log('Bailing out.');
  process.exit();
}

// We didn't expect this error; log a detailed breakdown.
function Neo4jUnhandledError(error) {
  console.error(`Unknown Neo4j error received: ${error}`);
  console.error(`Error code: ${error.code}`);
  console.error(`Error name: ${error.name}`);
  console.error(`Error message: ${error.message}`);
  process.exit();
}

export {
  ErrorAndExit,
  Neo4jUnhandledError
};
