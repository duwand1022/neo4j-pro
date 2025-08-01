import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// GROBID service configuration
const GROBID_URL = process.env.GROBID_URL || 'http://localhost:8070';

class ResearchGraphBuilder {
  constructor() {
    this.session = driver.session({ database: process.env.NEO4J_DATABASE });
  }

  async close() {
    await this.session.close();
    await driver.close();
  }

  // Check if GROBID service is available
  async checkGrobidService() {
    try {
      const response = await fetch(`${GROBID_URL}/api/version`);
      if (response.ok) {
        const data = await response.text();
        console.log('✅ GROBID service is running:', data);
        return true;
      }
    } catch (error) {
      console.log('❌ GROBID service not available:', error.message);
      console.log('💡 To start GROBID service, run:');
      console.log('   docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0');
      return false;
    }
  }

  // Process PDF with GROBID to extract metadata
  async processPdfWithGrobid(pdfPath) {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    const form = new FormData();
    form.append('input', fs.createReadStream(pdfPath));

    try {
      const response = await fetch(`${GROBID_URL}/api/processHeaderDocument`, {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        throw new Error(`GROBID API error: ${response.status}`);
      }

      const xmlData = await response.text();
      return this.parseGrobidXml(xmlData);
    } catch (error) {
      console.error('Error processing PDF with GROBID:', error.message);
      return null;
    }
  }

  // Simple XML parsing to extract key information
  parseGrobidXml(xmlData) {
    const paper = {
      title: this.extractXmlValue(xmlData, '<title[^>]*>([^<]+)</title>'),
      abstract: this.extractXmlValue(xmlData, '<abstract[^>]*>([^<]+)</abstract>'),
      authors: this.extractAuthors(xmlData),
      year: this.extractYear(xmlData),
      doi: this.extractXmlValue(xmlData, '<idno type="DOI">([^<]+)</idno>'),
      references: this.extractReferences(xmlData)
    };

    return paper;
  }

  extractXmlValue(xml, pattern) {
    const match = xml.match(new RegExp(pattern, 'i'));
    return match ? match[1].trim() : null;
  }

  extractAuthors(xml) {
    const authors = [];
    const authorPattern = /<author[^>]*>.*?<persName[^>]*>.*?<forename[^>]*>([^<]*)<\/forename>.*?<surname[^>]*>([^<]*)<\/surname>.*?<\/persName>.*?<\/author>/g;
    let match;
    
    while ((match = authorPattern.exec(xml)) !== null) {
      const firstName = match[1].trim();
      const lastName = match[2].trim();
      if (firstName && lastName) {
        authors.push(`${firstName} ${lastName}`);
      }
    }
    
    return authors;
  }

  extractYear(xml) {
    const yearMatch = xml.match(/<date[^>]*when="(\d{4})[^"]*"/i);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  extractReferences(xml) {
    // Simplified reference extraction - in real scenario, this would be more complex
    const references = [];
    const refPattern = /<biblStruct[^>]*>.*?<title[^>]*>([^<]+)<\/title>.*?<\/biblStruct>/g;
    let match;
    
    while ((match = refPattern.exec(xml)) !== null) {
      references.push(match[1].trim());
    }
    
    return references.slice(0, 5); // Limit to first 5 references for demo
  }

  // Clear research data from Neo4j
  async clearResearchData() {
    console.log('🧹 Clearing existing research data...');
    await this.session.run('MATCH (n:Paper) DETACH DELETE n');
    await this.session.run('MATCH (n:Author) DETACH DELETE n');
    await this.session.run('MATCH (n:Reference) DETACH DELETE n');
  }

  // Store paper in Neo4j
  async storePaper(paperData, filename) {
    if (!paperData.title) {
      console.log(`⚠️  Skipping paper without title: ${filename}`);
      return;
    }

    // Create paper node
    const paperResult = await this.session.run(`
      CREATE (p:Paper {
        title: $title,
        abstract: $abstract,
        year: $year,
        doi: $doi,
        filename: $filename
      })
      RETURN p
    `, {
      title: paperData.title,
      abstract: paperData.abstract,
      year: paperData.year,
      doi: paperData.doi,
      filename: filename
    });

    const paperId = paperResult.records[0].get('p').identity;
    console.log(`✅ Created paper: "${paperData.title}"`);

    // Create author nodes and relationships
    for (const authorName of paperData.authors) {
      // Create or match author
      await this.session.run(`
        MERGE (a:Author {name: $name})
        WITH a
        MATCH (p:Paper) WHERE id(p) = $paperId
        MERGE (a)-[:AUTHORED]->(p)
      `, { name: authorName, paperId });
      
      console.log(`  👤 Added author: ${authorName}`);
    }

    // Create reference nodes and relationships
    for (const refTitle of paperData.references) {
      await this.session.run(`
        MERGE (r:Reference {title: $title})
        WITH r
        MATCH (p:Paper) WHERE id(p) = $paperId
        MERGE (p)-[:CITES]->(r)
      `, { title: refTitle, paperId });
      
      console.log(`  📚 Added reference: ${refTitle.substring(0, 50)}...`);
    }
  }

  // Create sample research data (when GROBID is not available)
  async createSampleData() {
    console.log('📚 Creating sample research data...');
    
    const samplePapers = [
      {
        title: "Deep Learning Approaches for Natural Language Processing",
        abstract: "This paper presents a comprehensive survey of deep learning methods applied to natural language processing tasks.",
        authors: ["Sarah Johnson", "Michael Chen", "David Rodriguez"],
        year: 2023,
        doi: "10.1000/sample.2023.001",
        filename: "deep_learning_nlp.pdf",
        references: [
          "Attention Is All You Need",
          "BERT: Pre-training of Deep Bidirectional Transformers",
          "GPT-3: Language Models are Few-Shot Learners"
        ]
      },
      {
        title: "Graph Neural Networks for Knowledge Representation",
        abstract: "We explore the application of graph neural networks to represent and reason over structured knowledge.",
        authors: ["Michael Chen", "Alice Wang", "Robert Kim"],
        year: 2023,
        doi: "10.1000/sample.2023.002",
        filename: "gnn_knowledge.pdf",
        references: [
          "Graph Convolutional Networks",
          "GraphSAGE: Inductive Representation Learning",
          "Deep Learning Approaches for Natural Language Processing"
        ]
      },
      {
        title: "Neo4j for Scientific Literature Analysis",
        abstract: "This study demonstrates how graph databases can be used to analyze citation networks and research trends.",
        authors: ["Alice Wang", "Sarah Johnson"],
        year: 2024,
        doi: "10.1000/sample.2024.001",
        filename: "neo4j_analysis.pdf",
        references: [
          "Graph Neural Networks for Knowledge Representation",
          "Network Analysis of Scientific Collaborations",
          "Citation Networks and Academic Impact"
        ]
      }
    ];

    for (const paper of samplePapers) {
      await this.storePaper(paper, paper.filename);
    }
  }

  // Query research graph
  async queryResearchGraph() {
    console.log('\n🔍 Querying Research Graph...\n');

    // 1. Most prolific authors
    console.log('1️⃣  Most Prolific Authors:');
    const prolificAuthors = await this.session.run(`
      MATCH (a:Author)-[:AUTHORED]->(p:Paper)
      RETURN a.name as author, count(p) as papers
      ORDER BY papers DESC
      LIMIT 5
    `);
    
    prolificAuthors.records.forEach(record => {
      console.log(`   📝 ${record.get('author')}: ${record.get('papers')} papers`);
    });

    // 2. Papers by year
    console.log('\n2️⃣  Papers by Year:');
    const papersByYear = await this.session.run(`
      MATCH (p:Paper)
      WHERE p.year IS NOT NULL
      RETURN p.year as year, count(p) as papers
      ORDER BY year DESC
    `);
    
    papersByYear.records.forEach(record => {
      console.log(`   📅 ${record.get('year')}: ${record.get('papers')} papers`);
    });

    // 3. Author collaborations
    console.log('\n3️⃣  Author Collaborations:');
    const collaborations = await this.session.run(`
      MATCH (a1:Author)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(a2:Author)
      WHERE a1.name < a2.name
      RETURN a1.name as author1, a2.name as author2, count(p) as collaborations
      ORDER BY collaborations DESC
      LIMIT 5
    `);
    
    collaborations.records.forEach(record => {
      console.log(`   🤝 ${record.get('author1')} & ${record.get('author2')}: ${record.get('collaborations')} papers`);
    });

    // 4. Most cited references
    console.log('\n4️⃣  Most Cited References:');
    const citedRefs = await this.session.run(`
      MATCH (p:Paper)-[:CITES]->(r:Reference)
      RETURN r.title as reference, count(p) as citations
      ORDER BY citations DESC
      LIMIT 5
    `);
    
    citedRefs.records.forEach(record => {
      const title = record.get('reference');
      const shortTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
      console.log(`   📖 ${shortTitle}: ${record.get('citations')} citations`);
    });

    // 5. Research network visualization query
    console.log('\n5️⃣  Research Network (for visualization):');
    console.log('   Run this query in Neo4j Browser to see the research graph:');
    console.log('   MATCH (n) WHERE n:Paper OR n:Author OR n:Reference RETURN n LIMIT 100');
  }
}

// Main demo function
async function runGrobidDemo() {
  const builder = new ResearchGraphBuilder();
  
  try {
    console.log('🔬 GROBID + Neo4j Research Graph Demo\n');
    
    // Check if GROBID service is available
    const grobidAvailable = await builder.checkGrobidService();
    
    // Clear existing data
    await builder.clearResearchData();
    
    if (grobidAvailable) {
      console.log('\n📄 Processing PDFs with GROBID...');
      
      // Look for PDF files in a sample directory
      const sampleDir = './sample-papers';
      if (fs.existsSync(sampleDir)) {
        const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.pdf'));
        
        for (const file of files) {
          const pdfPath = path.join(sampleDir, file);
          console.log(`\nProcessing: ${file}`);
          
          const paperData = await builder.processPdfWithGrobid(pdfPath);
          if (paperData) {
            await builder.storePaper(paperData, file);
          }
        }
      } else {
        console.log('📁 No sample-papers directory found, creating sample data instead...');
        await builder.createSampleData();
      }
    } else {
      console.log('\n📊 Creating sample research data...');
      await builder.createSampleData();
    }

    // Query the research graph
    await builder.queryResearchGraph();
    
    console.log('\n✨ Research graph demo completed!');
    
    if (!grobidAvailable) {
      console.log('\n💡 To use real PDF processing:');
      console.log('1. Start GROBID service: docker run -t --rm -p 8070:8070 lfoppiano/grobid:0.8.0');
      console.log('2. Create a "sample-papers" directory and add PDF files');
      console.log('3. Run this demo again');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await builder.close();
  }
}

// Export for use in other files
export { ResearchGraphBuilder };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGrobidDemo();
}
