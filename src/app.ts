import express, { Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';

// Interface perpanjangan Request untuk menyertakan rawBody
export interface CustomRequest extends Request {
  rawBody?: Buffer;
}

const app = express();

// Global Middlewares
app.use(cors());

// Parsing body JSON sekaligus menyimpan rawBody Buffer untuk verifikasi HMAC signature Webhook Meta
app.use(
  express.json({
    verify: (req: CustomRequest, res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Mount Routing modular ke path '/api'
app.use('/api', routes);

// Penanganan Route 404 (Not Found) jika client mengakses endpoint yang tidak terdaftar
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Rute tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

export default app;
