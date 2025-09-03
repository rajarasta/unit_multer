const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API endpoint za spremanje agbim.json
app.put('/api/save-agbim', async (req, res) => {
  try {
    const data = req.body;
    const filePath = path.join(__dirname, 'src', 'backend', 'agbim.json');
    
    // Spremi novi sadržaj s proper formatting
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ agbim.json updated successfully');
    console.log(`📊 Projects: ${data.projects?.length || 0}, Tasks: ${data.tasks?.length || 0}`);
    
    res.json({ success: true, message: 'agbim.json saved successfully' });
  } catch (error) {
    console.error('❌ Error saving agbim.json:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 File writer running on http://localhost:${PORT}`);
  console.log(`📝 Ready to write agbim.json at PUT /api/save-agbim`);
});