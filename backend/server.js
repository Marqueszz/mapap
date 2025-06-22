require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Conexão com banco de dados
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// GET: Lista os problemas
app.get('/problemas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM problemas');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar problemas:', error);
    res.status(500).json({ erro: 'Erro ao buscar problemas' });
  }
});

// POST: Insere novo problema
app.post('/problemas', async (req, res) => {
  const { tipo, descricao, data, latitude, longitude, categoria } = req.body;

  if (!tipo || !descricao || !data || latitude == null || longitude == null || !categoria) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
  }

  try {
    await pool.query(
      'INSERT INTO problemas (tipo, descricao, data, latitude, longitude, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [tipo, descricao, data, latitude, longitude, categoria]
    );
    res.status(201).json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao salvar problema:', error);
    res.status(500).json({ erro: 'Erro ao salvar problema' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
