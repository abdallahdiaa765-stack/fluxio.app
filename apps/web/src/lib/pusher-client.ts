import Pusher from 'pusher-js';

/**
 * Frontend counterpart to apps/api/src/websocket/pusher.service.ts.
 * Replaces the socket.io-client connection that used to hit the API's
 * KitchenGateway directly - subscribing to a private channel here
 * automatically calls POST {NEXT_PUBLIC_API_URL}/api/v1/pusher/auth
 * behind the scenes (see authEndpoint below), which is guarded by the
 * logged-in user's JWT on the API side (PusherAuthController).
 *
 * Usage in a component:
 *   const pusher = getPusherClient(accessToken);
 *   const channel = pusher.subscribe(`private-kitchen-${tenantId}`);
 *   channel.bind('new-order', (order) => { ... });
 *   channel.bind('order-updated', (order) => { ... });
 */
let client: Pusher | null = null;

export function getPusherClient(accessToken: string): Pusher {
  if (client) return client;

  client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/pusher/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return client;
}
