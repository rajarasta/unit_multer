import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API endpoint za spremanje agbim.json
app.put('/api/save-agbim', async (req, res) => {
  try {
    const data = req.body;
    const filePath = path.join(__dirname, 'src', 'backend', 'agbim.json');
    
    // Backup postojećeg file-a
    const backupPath = path.join(__dirname, 'src', 'backend', `agbim-backup-${Date.now()}.json`);
    try {
      await fs.copyFile(filePath, backupPath);
      console.log(`📦 Backup created: ${backupPath}`);
    } catch (backupError) {
      console.warn('⚠️ Could not create backup:', backupError.message);
    }
    
    // Spremi novi sadržaj
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ agbim.json saved successfully');
    
    res.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    console.error('❌ Error saving agbim.json:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Zdravstvena provjera
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'File server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 File server running on http://localhost:${PORT}`);
  console.log(`📝 Ready to save agbim.json at PUT /api/save-agbim`);
});