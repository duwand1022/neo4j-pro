import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// Example functions demonstrating various Neo4j operations

async function createNode(name, properties) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  try {
    const result = await session.run(
      `CREATE (n:${name} $props) RETURN n`,
      { props: properties }
    );
    return result.records[0].get('n');
  } finally {
    await session.close();
  }
}

async function findNodes(label, properties = {}) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  try {
    const whereClause = Object.keys(properties).length > 0
      ? `WHERE ${Object.keys(properties).map(key => `n.${key} = $${key}`).join(' AND ')}`
      : '';
    
    const result = await session.run(
      `MATCH (n:${label}) ${whereClause} RETURN n`,
      properties
    );
    return result.records.map(record => record.get('n'));
  } finally {
    await session.close();
  }
}

async function createRelationship(fromLabel, fromProps, toLabel, toProps, relType, relProps = {}) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  try {
    // Build WHERE clauses for matching nodes
    const fromWhere = Object.keys(fromProps).map((key, i) => `a.${key} = $fromProp${i}`).join(' AND ');
    const toWhere = Object.keys(toProps).map((key, i) => `b.${key} = $toProp${i}`).join(' AND ');
    
    // Build parameters for the query
    const params = { relProps };
    Object.keys(fromProps).forEach((key, i) => {
      params[`fromProp${i}`] = fromProps[key];
    });
    Object.keys(toProps).forEach((key, i) => {
      params[`toProp${i}`] = toProps[key];
    });
    
    const result = await session.run(
      `MATCH (a:${fromLabel}), (b:${toLabel})
       WHERE ${fromWhere} AND ${toWhere}
       CREATE (a)-[r:${relType} $relProps]->(b)
       RETURN a, r, b`,
      params
    );
    return result.records[0];
  } finally {
    await session.close();
  }
}

async function runCypherQuery(query, params = {}) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
  }
}

// Example usage
async function main() {
  try {
    console.log('🚀 Neo4j Test Application\n');
    
    // Create some example nodes
    console.log('📝 Creating example nodes...');
    const user1 = await createNode('User', { name: 'Alice', age: 30, email: 'alice@example.com' });
    console.log('✅ Created user:', user1.properties);
    
    const user2 = await createNode('User', { name: 'Bob', age: 25, email: 'bob@example.com' });
    console.log('✅ Created user:', user2.properties);
    
    const product = await createNode('Product', { name: 'Laptop', price: 999.99, category: 'Electronics' });
    console.log('✅ Created product:', product.properties);
    
    // Create relationships
    console.log('\n🔗 Creating relationships...');
    await createRelationship('User', { name: 'Alice' }, 'Product', { name: 'Laptop' }, 'PURCHASED', { date: '2024-01-15', quantity: 1 });
    console.log('✅ Alice purchased Laptop');
    
    await createRelationship('User', { name: 'Alice' }, 'User', { name: 'Bob' }, 'FOLLOWS', { since: '2023-12-01' });
    console.log('✅ Alice follows Bob');
    
    // Query data
    console.log('\n🔍 Querying data...');
    
    // Find all users
    const users = await findNodes('User');
    console.log(`\nFound ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.properties.name} (${user.properties.email})`);
    });
    
    // Custom query - Find who purchased what
    const purchases = await runCypherQuery(
      `MATCH (u:User)-[r:PURCHASED]->(p:Product)
       RETURN u.name AS buyer, p.name AS product, r.date AS date, r.quantity AS quantity`
    );
    
    console.log('\n🛒 Purchase history:');
    purchases.forEach(record => {
      console.log(`  - ${record.get('buyer')} bought ${record.get('quantity')} ${record.get('product')} on ${record.get('date')}`);
    });
    
    // Find social connections
    const connections = await runCypherQuery(
      `MATCH (a:User)-[r:FOLLOWS]->(b:User)
       RETURN a.name AS follower, b.name AS following, r.since AS since`
    );
    
    console.log('\n👥 Social connections:');
    connections.forEach(record => {
      console.log(`  - ${record.get('follower')} follows ${record.get('following')} since ${record.get('since')}`);
    });
    
    console.log('\n✨ Test completed successfully!');
    console.log('\n💡 Try running "npm run demo" for a more comprehensive example!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await driver.close();
  }
}

// Run the main function
main();
