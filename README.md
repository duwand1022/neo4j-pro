# Neo4j Test Application

A simple JavaScript application to test and demonstrate Neo4j database features.

## Features

- **Connection Testing**: Verify your Neo4j database connection
- **CRUD Operations**: Create nodes, relationships, and run queries
- **Demo Application**: Movie database example with actors, directors, and relationships
- **Utility Functions**: Reusable functions for common Neo4j operations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env` file with your Neo4j credentials.

## Usage

### Test Connection
```bash
npm run test-connection
```
This will verify that your Neo4j database is accessible and show database information.

### Run Basic Example
```bash
npm start
```
This demonstrates:
- Creating nodes (Users and Products)
- Creating relationships (PURCHASED, FOLLOWS)
- Querying data with Cypher

### Run Movie Demo
```bash
npm run demo
```
This creates a small movie database with:
- Person nodes (actors, directors, producers)
- Movie nodes
- Relationships (ACTED_IN, DIRECTED, PRODUCED)
- Complex queries to explore the graph

## Project Structure

- `test-connection.js` - Tests database connectivity
- `index.js` - Basic example with utility functions
- `demo.js` - Movie database demonstration
- `.env` - Database credentials (keep secure!)

## Neo4j Utility Functions

The `index.js` file includes reusable functions:

- `createNode(label, properties)` - Create a new node
- `findNodes(label, properties)` - Find nodes by label and properties
- `createRelationship(...)` - Create relationships between nodes
- `runCypherQuery(query, params)` - Execute custom Cypher queries

## Security Note

The `.env` file contains sensitive database credentials. Never commit this file to version control in a real project. Add it to `.gitignore`.

## Next Steps

- Explore more complex graph patterns
- Add data validation and error handling
- Implement transactions for data consistency
- Create indexes for better query performance
- Build a REST API on top of these functions
