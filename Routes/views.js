import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// MongoDB connection
const mongoUrl = process.env.MONGO_URI;
const client = new MongoClient(mongoUrl);

let dbConnection = null;

// Function to get database connection
const getDb = async () => {
  if (!dbConnection) {
    await client.connect();
    dbConnection = client.db('NRIs_Data');
    console.log('✅ Connected to NRIs_Data database for views');
    
    // Debug: List all collections
    try {
      const collections = await dbConnection.listCollections().toArray();
      console.log('📋 Available collections:', collections.map(c => c.name));
    } catch (err) {
      console.log('Error listing collections:', err);
    }
  }
  return dbConnection;
};

// Get current view count
router.get('/view', async (req, res) => {
  try {
    const db = await getDb();
    const collection = db.collection('Page_Views');
    const doc = await collection.findOne({});
    
    console.log('📊 Document found:', doc);
    
    if (!doc || !doc.pageviews) {
      return res.json({ visits: 0 });
    }
    
    const viewCount = parseInt(doc.pageviews);
    console.log('✅ Sending visits:', viewCount);
    
    res.json({ visits: viewCount });
  } catch (error) {
    console.error('❌ Error fetching views:', error);
    res.status(500).json({ error: 'Failed to fetch views', message: error.message });
  }
});

// Increment view count
router.get('/increment-view', async (req, res) => {
  try {
    const db = await getDb();
    const collection = db.collection('Page_Views');
    
    // Check if document exists first
    const existing = await collection.findOne({});
    console.log('📄 Existing document:', existing);
    
    if (!existing) {
      // Create new document
      await collection.insertOne({ pageviews: "1" });
      return res.json({ visits: 1 });
    }
    
    // Increment existing document
    const currentCount = parseInt(existing.pageviews) || 0;
    const newCount = currentCount + 1;
    
    await collection.updateOne(
      { _id: existing._id },
      { $set: { pageviews: newCount.toString() } }
    );
    
    console.log('📈 Updated count:', newCount);
    res.json({ visits: newCount });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    res.status(500).json({ error: 'Failed to increment views', message: error.message });
  }
});

export default router;