require('dotenv').config();
const { exportAllCollections } = require('./config/db');

const backupData = async () => {
  try {
    console.log('Starting backup...');
    const backupPath = await exportAllCollections();
    console.log(`✅ Backup completed: ${backupPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
};

backupData();
