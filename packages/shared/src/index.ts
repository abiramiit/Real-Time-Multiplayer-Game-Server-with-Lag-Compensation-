export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerInput {
  sequenceNumber: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dt: number;
}

export interface PlayerState {
  id: string;
  position: Vector2;
  lastProcessedInputNumber: number;
}

export interface GameStateSnapshot {
  timestamp: number;
  players: PlayerState[];
}

// ---------------------------------------------------------
// Typed Network Messages
// ---------------------------------------------------------

export enum ClientMessageType {
  JOIN = 'JOIN',
  INPUT = 'INPUT',
  PING = 'PING',
  ATTACK = 'ATTACK',
  PONG = 'PONG'
}

export interface ClientMessageJoin {
  type: ClientMessageType.JOIN;
  roomId?: string;
  token?: string;
}

export interface ClientMessageInput {
  type: ClientMessageType.INPUT;
  input: PlayerInput;
}

export interface ClientMessagePing {
  type: ClientMessageType.PING;
  clientTime: number;
}

export interface ClientMessageAttack {
  type: ClientMessageType.ATTACK;
}

export interface ClientMessagePong {
  type: ClientMessageType.PONG;
  serverTime: number;
}

import { z } from 'zod';

export const PlayerInputSchema = z.object({
  sequenceNumber: z.number().int().nonnegative(),
  up: z.boolean(),
  down: z.boolean(),
  left: z.boolean(),
  right: z.boolean(),
  dt: z.number().nonnegative().max(0.1) // 100ms structural dt clip protecting against malicious speed hacks
});

export const ClientMessageJoinSchema = z.object({
  type: z.literal(ClientMessageType.JOIN),
  roomId: z.string().max(25).optional(),
  token: z.string().max(100).optional()
});

export const ClientMessageInputSchema = z.object({
  type: z.literal(ClientMessageType.INPUT),
  input: PlayerInputSchema
});

export const ClientMessagePingSchema = z.object({
  type: z.literal(ClientMessageType.PING),
  clientTime: z.number()
});

export const ClientMessageAttackSchema = z.object({
  type: z.literal(ClientMessageType.ATTACK)
});

export const ClientMessagePongSchema = z.object({
  type: z.literal(ClientMessageType.PONG),
  serverTime: z.number()
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ClientMessageJoinSchema,
  ClientMessageInputSchema,
  ClientMessagePingSchema,
  ClientMessageAttackSchema,
  ClientMessagePongSchema
]);

export type ClientMessage = ClientMessageJoin | ClientMessageInput | ClientMessagePing | ClientMessageAttack | ClientMessagePong;

export enum ServerMessageType {
  WELCOME = 'WELCOME',
  STATE = 'STATE',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PONG = 'PONG',
  HIT = 'HIT',
  PING = 'PING'
}

export interface ServerMessageWelcome {
  type: ServerMessageType.WELCOME;
  id: string;
  token: string;
}

export interface ServerMessageState {
  type: ServerMessageType.STATE;
  tick: number;
  players: PlayerState[];
}

export interface ServerMessagePlayerJoined {
  type: ServerMessageType.PLAYER_JOINED;
  id: string;
}

export interface ServerMessagePlayerLeft {
  type: ServerMessageType.PLAYER_LEFT;
  id: string;
}

export interface ServerMessagePong {
  type: ServerMessageType.PONG;
  clientTime: number;
}

export interface ServerMessageHit {
  type: ServerMessageType.HIT;
  targetId: string;
  attackerId: string;
}

export interface ServerMessagePing {
  type: ServerMessageType.PING;
  serverTime: number;
}

export type ServerMessage = ServerMessageWelcome | ServerMessageState | ServerMessagePlayerJoined | ServerMessagePlayerLeft | ServerMessagePong | ServerMessageHit | ServerMessagePing;

// ---------------------------------------------------------
// Physics & Game Constants
// ---------------------------------------------------------

export const PLAYER_SPEED = 200; // units per second
export const WORLD_BOUNDS = { width: 800, height: 600 };
export const PLAYER_RADIUS = 15;
export const ATTACK_RADIUS = 50;

export function applyInput(position: Vector2, input: PlayerInput, dtSeconds: number): Vector2 {
  let dx = 0;
  let dy = 0;

  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  // Normalize vector to avoid faster diagonal movement
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx = dx / (mag || 1);
    dy = dy / (mag || 1);
  }

  let newX = position.x + (dx * PLAYER_SPEED * dtSeconds);
  let newY = position.y + (dy * PLAYER_SPEED * dtSeconds);

  // Apply world boundaries
  if (newX < PLAYER_RADIUS) newX = PLAYER_RADIUS;
  if (newX > WORLD_BOUNDS.width - PLAYER_RADIUS) newX = WORLD_BOUNDS.width - PLAYER_RADIUS;

  if (newY < PLAYER_RADIUS) newY = PLAYER_RADIUS;
  if (newY > WORLD_BOUNDS.height - PLAYER_RADIUS) newY = WORLD_BOUNDS.height - PLAYER_RADIUS;

  return { x: newX, y: newY };
}
