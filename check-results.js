import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function checkAllData() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  
  try {
    console.log('🔍 Checking all data in Neo4j database...\n');
    
    // Count all nodes by label
    console.log('📊 Node counts by label:');
    const labels = ['User', 'Product', 'Person', 'Movie'];
    
    for (const label of labels) {
      const result = await session.run(`MATCH (n:${label}) RETURN count(n) as count`);
      const count = result.records[0].get('count').toNumber();
      if (count > 0) {
        console.log(`   ${label}: ${count} nodes`);
      }
    }
    
    // Show all nodes with their properties
    console.log('\n📝 All nodes in the database:');
    const allNodes = await session.run(`
      MATCH (n)
      RETURN labels(n) as labels, properties(n) as props
      ORDER BY labels(n)[0]
    `);
    
    allNodes.records.forEach(record => {
      const labels = record.get('labels');
      const props = record.get('props');
      console.log(`\n   ${labels.join(':')}`);
      Object.entries(props).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    });
    
    // Show all relationships
    console.log('\n🔗 All relationships:');
    const allRels = await session.run(`
      MATCH (a)-[r]->(b)
      RETURN labels(a)[0] as fromLabel, properties(a).name as fromName,
             type(r) as relType, properties(r) as relProps,
             labels(b)[0] as toLabel, properties(b).name as toName
      ORDER BY type(r)
    `);
    
    allRels.records.forEach(record => {
      const fromName = record.get('fromName');
      const fromLabel = record.get('fromLabel');
      const relType = record.get('relType');
      const relProps = record.get('relProps');
      const toName = record.get('toName');
      const toLabel = record.get('toLabel');
      
      let relInfo = `   (${fromLabel}:${fromName}) -[${relType}`;
      if (Object.keys(relProps).length > 0) {
        relInfo += ` ${JSON.stringify(relProps)}`;
      }
      relInfo += `]-> (${toLabel}:${toName || record.get('toName')})`;
      console.log(relInfo);
    });
    
    // Show database visualization command
    console.log('\n💡 To visualize in Neo4j Browser:');
    console.log('   1. Open Neo4j Browser (usually at http://localhost:7474)');
    console.log('   2. Or for remote databases, ask your admin for the browser URL');
    console.log('   3. Use these Cypher queries to visualize:');
    console.log('\n   Show everything:');
    console.log('   MATCH (n) RETURN n LIMIT 100');
    console.log('\n   Show movie graph:');
    console.log('   MATCH (n) WHERE n:Person OR n:Movie RETURN n');
    console.log('\n   Show user/product graph:');
    console.log('   MATCH (n) WHERE n:User OR n:Product RETURN n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

checkAllData();
