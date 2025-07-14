require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com banco PostgreSQL Neon
const sql = neon(process.env.DATABASE_URL);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Testar conexão com o banco
async function testConnection() {
  try {
    const result = await sql`SELECT version()`;
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    console.log('Versão do PostgreSQL:', result[0].version);
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

testConnection();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../frontend/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota para arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));
app.use('/icons', express.static(path.join(__dirname, '../frontend/icons')));
app.use('/favicon_io', express.static(path.join(__dirname, '../frontend/favicon_io')));

// GET: Listar todos os problemas
app.get('/problemas', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM problemas`;
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar problemas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar problemas',
      error: error.message 
    });
  }
});

// POST: Adicionar novo problema (com upload de imagem)
app.post('/problemas', upload.single('foto'), async (req, res) => {
  const { tipo, descricao, data, latitude, longitude, categoria } = req.body;
  const fotoPath = req.file ? `uploads/${req.file.filename}` : null;

  if (!tipo || !descricao || !data || latitude == null || longitude == null || !categoria) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      success: false,
      message: 'Todos os campos são obrigatórios' 
    });
  }

  try {
    const result = await sql`
      INSERT INTO problemas (tipo, descricao, data, latitude, longitude, categoria, foto)
      VALUES (${tipo}, ${descricao}, ${data}, ${latitude}, ${longitude}, ${categoria}, ${fotoPath})
      RETURNING id
    `;

    const insertId = result[0]?.id;

    res.status(201).json({ 
      success: true,
      message: 'Problema registrado com sucesso',
      id: insertId,
      fotoPath
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Erro ao salvar problema:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao salvar problema',
      error: error.message 
    });
  }
});

// Middleware para erros 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Rota não encontrada' 
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Erro interno no servidor',
    error: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
