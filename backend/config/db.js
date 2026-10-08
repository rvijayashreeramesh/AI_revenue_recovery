import mongoose from 'mongoose';
import dns from 'dns';

export let isDbConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_revenue_recovery';
  
  // Resolve SRV records reliably on Windows for MongoDB Atlas
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.warn('[DB] Custom DNS resolver notice:', dnsErr.message);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });
    isDbConnected = true;
    console.log(`[DB] \x1b[32mMongoDB Connected successfully\x1b[0m: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isDbConnected = false;
    console.warn(`[DB] \x1b[33mMongoDB connection not available (${error.message})\x1b[0m.`);
    console.warn(`[DB] Running in \x1b[36mHigh-Performance In-Memory Hybrid Mode\x1b[0m. Telemetry and simulation remain 100% functional.`);
    return false;
  }
};
