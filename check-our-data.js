import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function checkOurData() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  
  try {
    console.log('🔍 Checking data created by our demo...\n');
    
    // Check movie demo data
    console.log('🎬 Movie Demo Data:');
    console.log('==================\n');
    
    // People in movie demo
    console.log('People:');
    const people = await session.run(`
      MATCH (p:Person)
      WHERE p.name IN ['Tom Hanks', 'Rita Wilson', 'Robert Zemeckis']
      RETURN p.name as name, p.born as born
      ORDER BY p.name
    `);
    
    people.records.forEach(record => {
      console.log(`  • ${record.get('name')} (born: ${record.get('born')})`);
    });
    
    // Movies
    console.log('\nMovies:');
    const movies = await session.run(`
      MATCH (m:Movie)
      WHERE m.title IN ['Forrest Gump', 'Cast Away']
      RETURN m.title as title, m.released as released, m.tagline as tagline
      ORDER BY m.released
    `);
    
    movies.records.forEach(record => {
      console.log(`  • ${record.get('title')} (${record.get('released')})`);
      console.log(`    "${record.get('tagline')}"`);
    });
    
    // Movie relationships
    console.log('\nMovie Relationships:');
    const movieRels = await session.run(`
      MATCH (p:Person)-[r]->(m:Movie)
      WHERE p.name IN ['Tom Hanks', 'Rita Wilson', 'Robert Zemeckis']
        AND m.title IN ['Forrest Gump', 'Cast Away']
      RETURN p.name as person, type(r) as relType, m.title as movie, r.roles as roles
      ORDER BY p.name, m.title
    `);
    
    movieRels.records.forEach(record => {
      const roles = record.get('roles');
      const roleInfo = roles ? ` as ${roles[0]}` : '';
      console.log(`  • ${record.get('person')} ${record.get('relType')} ${record.get('movie')}${roleInfo}`);
    });
    
    // Check user/product demo data
    console.log('\n\n💼 User/Product Demo Data:');
    console.log('=========================\n');
    
    // Users
    console.log('Users:');
    const users = await session.run(`
      MATCH (u:User)
      WHERE u.name IN ['Alice', 'Bob']
      RETURN DISTINCT u.name as name, u.age as age, u.email as email
      ORDER BY u.name
    `);
    
    users.records.forEach(record => {
      console.log(`  • ${record.get('name')} (age: ${record.get('age')}, email: ${record.get('email')})`);
    });
    
    // Products
    console.log('\nProducts:');
    const products = await session.run(`
      MATCH (p:Product)
      WHERE p.name = 'Laptop'
      RETURN DISTINCT p.name as name, p.price as price, p.category as category
    `);
    
    products.records.forEach(record => {
      console.log(`  • ${record.get('name')} - $${record.get('price')} (${record.get('category')})`);
    });
    
    // User relationships
    console.log('\nUser Relationships:');
    const userRels = await session.run(`
      MATCH (a)-[r]->(b)
      WHERE (a:User AND b:Product) OR (a:User AND b:User)
      RETURN DISTINCT a.name as from, type(r) as relType, b.name as to, 
             r.date as date, r.quantity as quantity, r.since as since
      ORDER BY type(r), a.name
    `);
    
    userRels.records.forEach(record => {
      let details = '';
      if (record.get('date')) {
        details = ` on ${record.get('date')} (qty: ${record.get('quantity')})`;
      } else if (record.get('since')) {
        details = ` since ${record.get('since')}`;
      }
      console.log(`  • ${record.get('from')} ${record.get('relType')} ${record.get('to')}${details}`);
    });
    
    // Provide connection info
    console.log('\n\n📡 Neo4j Connection Info:');
    console.log('========================');
    console.log(`URI: ${process.env.NEO4J_URI}`);
    console.log(`Database: ${process.env.NEO4J_DATABASE}`);
    console.log(`Username: ${process.env.NEO4J_USERNAME}`);
    
    console.log('\n💡 To access Neo4j Browser:');
    console.log('1. Since this is a remote database (54.175.140.147), ask your admin for the browser URL');
    console.log('2. It might be available at: http://54.175.140.147:7474 or https://54.175.140.147:7473');
    console.log('3. Use the credentials from the .env file to log in');
    
    console.log('\n📝 Useful Cypher queries to run in Neo4j Browser:');
    console.log('\n// Show our movie graph:');
    console.log(`MATCH (n) 
WHERE (n:Person AND n.name IN ['Tom Hanks', 'Rita Wilson', 'Robert Zemeckis'])
   OR (n:Movie AND n.title IN ['Forrest Gump', 'Cast Away'])
RETURN n`);
    
    console.log('\n// Show our user/product graph:');
    console.log(`MATCH (n) 
WHERE (n:User AND n.name IN ['Alice', 'Bob'])
   OR (n:Product AND n.name = 'Laptop')
RETURN n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

checkOurData();
