const { promisePool } = require('../config/database');

beforeAll(async () => {
  await promisePool.execute('CREATE DATABASE IF NOT EXISTS roommates_platform_test');
  await promisePool.execute('USE roommates_platform_test');
});

afterAll(async () => {
  await promisePool.end();
});