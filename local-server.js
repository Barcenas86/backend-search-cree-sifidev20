import express from 'express';
import cors from 'cors';
import verifyHandler from './api/verify.js';
import verifyBulkHandler from './api/verify-bulk.js';
import verifyMassiveHandler from './api/verify-massive.js';

const app = express();
const PORT = process.env.PORT || 3001; // Cambiado a 3001 para evitar conflictos

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Proxy para las funciones API de Vercel
app.post('/api/verify', verifyHandler);
app.post('/api/verify-bulk', verifyBulkHandler);
app.post('/api/verify-massive', verifyMassiveHandler);

app.listen(PORT, () => {
  console.log(`Local backend server running on http://localhost:${PORT}`);
});