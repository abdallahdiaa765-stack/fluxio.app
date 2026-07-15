import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'kitchen',
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KitchenGateway.name);
  private readonly tenantRooms = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const tenantId = payload.tenantId;
      client.data.tenantId = tenantId;
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Join tenant-specific room
      const roomName = `tenant:${tenantId}`;
      await client.join(roomName);

      if (!this.tenantRooms.has(tenantId)) {
        this.tenantRooms.set(tenantId, new Set());
      }
      this.tenantRooms.get(tenantId).add(client.id);

      this.logger.log(`Client ${client.id} connected to room ${roomName}`);

      // Send initial connection confirmation
      client.emit('connected', {
        room: roomName,
        tenantId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const tenantId = client.data.tenantId;
    if (tenantId) {
      const room = this.tenantRooms.get(tenantId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.tenantRooms.delete(tenantId);
        }
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join-kitchen')
  async handleJoinKitchen(client: Socket) {
    const tenantId = client.data.tenantId;
    const kitchenRoom = `kitchen:${tenantId}`;
    await client.join(kitchenRoom);
    client.emit('joined-kitchen', { room: kitchenRoom });
  }

  @SubscribeMessage('order-status-update')
  async handleOrderStatusUpdate(
    client: Socket,
    payload: { orderId: string; status: string; timestamp: string },
  ) {
    const tenantId = client.data.tenantId;
    const kitchenRoom = `kitchen:${tenantId}`;

    // Broadcast to all kitchen clients in this tenant
    this.server.to(kitchenRoom).emit('order-updated', {
      ...payload,
      updatedBy: client.data.userId,
    });

    // Also broadcast to POS clients
    const posRoom = `pos:${tenantId}`;
    this.server.to(posRoom).emit('order-updated', payload);
  }

  @SubscribeMessage('new-order')
  async handleNewOrder(
    client: Socket,
    payload: { orderId: string; orderNumber: string; items: any[]; tableNumber?: string },
  ) {
    const tenantId = client.data.tenantId;
    const kitchenRoom = `kitchen:${tenantId}`;

    this.server.to(kitchenRoom).emit('new-order', {
      ...payload,
      receivedAt: new Date().toISOString(),
    });

    this.logger.log(`New order ${payload.orderNumber} broadcasted to ${kitchenRoom}`);
  }

  @SubscribeMessage('join-pos')
  async handleJoinPos(client: Socket) {
    const tenantId = client.data.tenantId;
    const posRoom = `pos:${tenantId}`;
    await client.join(posRoom);
    client.emit('joined-pos', { room: posRoom });
  }

  // Server-side method to broadcast order updates
  broadcastOrderUpdate(tenantId: string, order: any) {
    const kitchenRoom = `kitchen:${tenantId}`;
    const posRoom = `pos:${tenantId}`;

    this.server.to(kitchenRoom).emit('order-updated', order);
    this.server.to(posRoom).emit('order-updated', order);
  }

  // Server-side method to broadcast new orders
  broadcastNewOrder(tenantId: string, order: any) {
    const kitchenRoom = `kitchen:${tenantId}`;
    this.server.to(kitchenRoom).emit('new-order', order);
  }

  // Server-side method to broadcast low stock alerts
  broadcastLowStock(tenantId: string, item: any) {
    const inventoryRoom = `inventory:${tenantId}`;
    this.server.to(inventoryRoom).emit('low-stock-alert', item);
  }
}
