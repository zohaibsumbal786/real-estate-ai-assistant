import { config } from "../config.js";

const redisUrl = new URL(config.REDIS_URL);

export const redisConnectionOptions = {
  host: redisUrl.hostname,
  port: redisUrl.port ? Number(redisUrl.port) : 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
  maxRetriesPerRequest: null
};
