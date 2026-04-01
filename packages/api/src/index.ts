import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HelloMenuAR } from '@menuar/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  const response: HelloMenuAR = { message: 'Hello from MenuAR API' };
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});