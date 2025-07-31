import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function clearDatabase(session) {
  console.log('🧹 Clearing existing demo data...');
  await session.run('MATCH (n:Person) DETACH DELETE n');
  await session.run('MATCH (n:Movie) DETACH DELETE n');
}

async function createNodes(session) {
  console.log('\n📝 Creating nodes...');
  
  // Create Person nodes
  const people = [
    { name: 'Tom Hanks', born: 1956 },
    { name: 'Rita Wilson', born: 1956 },
    { name: 'Robert Zemeckis', born: 1952 }
  ];
  
  for (const person of people) {
    await session.run(
      'CREATE (p:Person {name: $name, born: $born})',
      person
    );
    console.log(`   ✅ Created person: ${person.name}`);
  }
  
  // Create Movie nodes
  const movies = [
    { title: 'Forrest Gump', released: 1994, tagline: 'Life is like a box of chocolates' },
    { title: 'Cast Away', released: 2000, tagline: 'At the edge of the world, his journey begins' }
  ];
  
  for (const movie of movies) {
    await session.run(
      'CREATE (m:Movie {title: $title, released: $released, tagline: $tagline})',
      movie
    );
    console.log(`   ✅ Created movie: ${movie.title}`);
  }
}

async function createRelationships(session) {
  console.log('\n🔗 Creating relationships...');
  
  // Tom Hanks acted in both movies
  await session.run(
    `MATCH (p:Person {name: 'Tom Hanks'}), (m:Movie {title: 'Forrest Gump'})
     CREATE (p)-[:ACTED_IN {roles: ['Forrest Gump']}]->(m)`
  );
  console.log('   ✅ Tom Hanks ACTED_IN Forrest Gump');
  
  await session.run(
    `MATCH (p:Person {name: 'Tom Hanks'}), (m:Movie {title: 'Cast Away'})
     CREATE (p)-[:ACTED_IN {roles: ['Chuck Noland']}]->(m)`
  );
  console.log('   ✅ Tom Hanks ACTED_IN Cast Away');
  
  // Robert Zemeckis directed Forrest Gump and Cast Away
  await session.run(
    `MATCH (p:Person {name: 'Robert Zemeckis'}), (m:Movie {title: 'Forrest Gump'})
     CREATE (p)-[:DIRECTED]->(m)`
  );
  console.log('   ✅ Robert Zemeckis DIRECTED Forrest Gump');
  
  await session.run(
    `MATCH (p:Person {name: 'Robert Zemeckis'}), (m:Movie {title: 'Cast Away'})
     CREATE (p)-[:DIRECTED]->(m)`
  );
  console.log('   ✅ Robert Zemeckis DIRECTED Cast Away');
  
  // Rita Wilson produced Cast Away
  await session.run(
    `MATCH (p:Person {name: 'Rita Wilson'}), (m:Movie {title: 'Cast Away'})
     CREATE (p)-[:PRODUCED]->(m)`
  );
  console.log('   ✅ Rita Wilson PRODUCED Cast Away');
}

async function queryData(session) {
  console.log('\n🔍 Running queries...');
  
  // Query 1: Find all movies Tom Hanks acted in
  console.log('\n1️⃣  Movies starring Tom Hanks:');
  const tomHanksMovies = await session.run(
    `MATCH (p:Person {name: 'Tom Hanks'})-[r:ACTED_IN]->(m:Movie)
     RETURN m.title AS title, m.released AS year, r.roles AS roles`
  );
  
  tomHanksMovies.records.forEach(record => {
    console.log(`   🎬 ${record.get('title')} (${record.get('year')}) - Role: ${record.get('roles')[0]}`);
  });
  
  // Query 2: Find all people connected to Forrest Gump
  console.log('\n2️⃣  People connected to Forrest Gump:');
  const forrestGumpPeople = await session.run(
    `MATCH (p:Person)-[r]->(m:Movie {title: 'Forrest Gump'})
     RETURN p.name AS name, type(r) AS relationship`
  );
  
  forrestGumpPeople.records.forEach(record => {
    console.log(`   👤 ${record.get('name')} - ${record.get('relationship')}`);
  });
  
  // Query 3: Find movies directed by Robert Zemeckis
  console.log('\n3️⃣  Movies directed by Robert Zemeckis:');
  const zemeckisMovies = await session.run(
    `MATCH (p:Person {name: 'Robert Zemeckis'})-[:DIRECTED]->(m:Movie)
     RETURN m.title AS title, m.released AS year
     ORDER BY m.released`
  );
  
  zemeckisMovies.records.forEach(record => {
    console.log(`   🎥 ${record.get('title')} (${record.get('year')})`);
  });
  
  // Query 4: Complex query - Find co-actors
  console.log('\n4️⃣  People who worked with Tom Hanks:');
  const coWorkers = await session.run(
    `MATCH (tom:Person {name: 'Tom Hanks'})-[:ACTED_IN]->(m:Movie)<-[r]-(p:Person)
     WHERE p.name <> 'Tom Hanks'
     RETURN DISTINCT p.name AS name, collect(DISTINCT type(r)) AS relationships, collect(DISTINCT m.title) AS movies`
  );
  
  coWorkers.records.forEach(record => {
    console.log(`   👥 ${record.get('name')} - ${record.get('relationships').join(', ')} in ${record.get('movies').join(', ')}`);
  });
}

async function runDemo() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  
  try {
    console.log('🚀 Starting Neo4j Demo Application\n');
    
    await clearDatabase(session);
    await createNodes(session);
    await createRelationships(session);
    await queryData(session);
    
    console.log('\n✨ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

runDemo();
