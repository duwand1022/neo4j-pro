import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';


// Load environment variables
dotenv.config();


const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function testConnection() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  
  try {
    console.log('🔗 Testing connection to Neo4j...');
    
    // Test the connection by running a simple query
    const result = await session.run('RETURN 1 AS test');
    const singleRecord = result.records[0];
    const value = singleRecord.get('test');
    
    console.log('✅ Connection successful! Test query returned:', value);
    
    // Get database info
    const serverInfo = await session.run('CALL dbms.components() YIELD name, versions, edition');
    console.log('\n📊 Database Information:');
    serverInfo.records.forEach(record => {
      console.log(`   Name: ${record.get('name')}`);
      console.log(`   Version: ${record.get('versions')[0]}`);
      console.log(`   Edition: ${record.get('edition')}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();
