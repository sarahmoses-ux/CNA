import { MongoClient } from 'mongodb';
import { loadApiEnvironment } from '../server/environment.mjs';
loadApiEnvironment();
const uri = process.env.MONGODB_URI;
if (!uri || uri.includes('YOUR_') || uri.includes('<password>') || uri.includes('<db_password>')) {
  console.error('Add your complete Atlas connection string to MONGODB_URI in .env.');
  process.exitCode = 1;
} else {
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    await client.db(process.env.MONGODB_DB || 'cna_academy').command({ ping: 1 });
    console.log('MongoDB Atlas connection successful. No student records were created.');
  } catch (error) {
    console.error(`Atlas connection failed (${error.name}). Check the database credentials, connection string, and Atlas Network Access IP list.`);
    process.exitCode = 1;
  } finally { await client?.close(); }
}
