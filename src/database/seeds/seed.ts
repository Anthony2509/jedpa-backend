import dataSource from '../data-source';
import { runSeed, validateSeedEnv } from './seed-runner';

/** CLI: npm run seed */
async function main(): Promise<void> {
  const env = validateSeedEnv(process.env);
  await dataSource.initialize();
  try {
    await runSeed(dataSource, env);
    console.log('Seed completado.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
