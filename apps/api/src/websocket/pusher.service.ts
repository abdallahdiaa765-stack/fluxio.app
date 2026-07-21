import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

/**
 * Replaces the old socket.io KitchenGateway so real-time updates work on
 * serverless (Vercel Functions), which can't hold a persistent WebSocket
 * connection open. Pusher (or Ably) owns the long-lived connection to each
 * client instead; this service only ever makes short-lived HTTP calls to
 * Pusher's API to publish an event, which is exactly what a serverless
 * function is good at.
 *
 * Method names/signatures intentionally mirror the old KitchenGateway
 * (broadcastOrderUpdate / broadcastNewOrder / broadcastLowStock) so any
 * service that starts calling these later doesn't need to know anything
 * changed under the hood.
 */
@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly pusher: Pusher;

  constructor(private configService: ConfigService) {
    this.pusher = new Pusher({
      appId: this.configService.get('PUSHER_APP_ID'),
      key: this.configService.get('PUSHER_KEY'),
      secret: this.configService.get('PUSHER_SECRET'),
      cluster: this.configService.get('PUSHER_CLUSTER'),
      useTLS: true,
    });
  }

  // Channel naming kept identical in spirit to the old socket.io "rooms":
  // tenant:{id}, kitchen:{id}, pos:{id}, inventory:{id} — just prefixed with
  // "private-" because Pusher requires that prefix for authenticated channels.
  private kitchenChannel(tenantId: string) {
    return `private-kitchen-${tenantId}`;
  }
  private posChannel(tenantId: string) {
    return `private-pos-${tenantId}`;
  }
  private inventoryChannel(tenantId: string) {
    return `private-inventory-${tenantId}`;
  }

  async broadcastOrderUpdate(tenantId: string, order: any) {
    try {
      await this.pusher.triggerBatch([
        { channel: this.kitchenChannel(tenantId), name: 'order-updated', data: order },
        { channel: this.posChannel(tenantId), name: 'order-updated', data: order },
      ]);
    } catch (error) {
      this.logger.error(`Failed to broadcast order update for tenant ${tenantId}: ${error.message}`);
    }
  }

  async broadcastNewOrder(tenantId: string, order: any) {
    try {
      await this.pusher.trigger(this.kitchenChannel(tenantId), 'new-order', {
        ...order,
        receivedAt: new Date().toISOString(),
      });
      this.logger.log(`New order broadcasted to tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast new order for tenant ${tenantId}: ${error.message}`);
    }
  }

  async broadcastLowStock(tenantId: string, item: any) {
    try {
      await this.pusher.trigger(this.inventoryChannel(tenantId), 'low-stock-alert', item);
    } catch (error) {
      this.logger.error(`Failed to broadcast low stock alert for tenant ${tenantId}: ${error.message}`);
    }
  }

  /**
   * Used by PusherAuthController to approve a client's subscription to a
   * private channel. Only grant a channel that matches the tenant encoded
   * in the caller's own JWT — never trust a channel name the client asks for
   * blindly.
   */
  authorizeChannel(socketId: string, channel: string) {
    return this.pusher.authorizeChannel(socketId, channel);
  }
}
