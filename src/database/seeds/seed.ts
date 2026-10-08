import dataSource from '../data-source';
import { runSeed } from './seed-runner';

/** CLI: npm run seed */
async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await runSeed(dataSource);
    console.log('Seed completado.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
