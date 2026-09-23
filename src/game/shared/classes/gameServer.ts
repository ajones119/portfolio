const LOCAL_GAME_SERVER_URL = 'http://127.0.0.1:2567';

export function getGameServerEndpoint(): string {
  const configuredUrl = import.meta.env.PUBLIC_GAME_SERVER_URL?.trim();

  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (import.meta.env.DEV) return LOCAL_GAME_SERVER_URL;

  throw new Error('PUBLIC_GAME_SERVER_URL is required outside development.');
}
