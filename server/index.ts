import app from './app.js';
import { initDb } from './db.js';

const PORT = 3001;

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Quak server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
