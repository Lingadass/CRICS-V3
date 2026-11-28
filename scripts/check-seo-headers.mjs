import process from 'node:process';

const url = process.argv[2] || 'https://crics.lingadass.dev/';

const required = [
  'strict-transport-security',
  'content-security-policy-report-only',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

try {
  const response = await globalThis.fetch(url, { redirect: 'follow' });
  const failures = [];
  for (const name of required) {
    const value = response.headers.get(name);
    if (!value) failures.push(`${name}: missing`);
  }
  if (failures.length) {
    globalThis.console.error(`Header check failed for ${url}`);
    for (const failure of failures) globalThis.console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    globalThis.console.log(`Required headers present on ${url}`);
  }
} catch (error) {
  globalThis.console.error(`Could not inspect ${url}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
