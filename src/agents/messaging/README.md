# Agent Messaging Module

## Purpose

This directory is responsible for facilitating communication and data exchange between different AI agents and potentially other parts of the application. It defines how messages are structured, queued, sent, received, and processed.

## Structure and Important Files

- **`agent-messaging-service.ts`**: (Likely the central service) Provides high-level APIs for sending and receiving messages between agents. It may coordinate various sub-services.
- **`types.ts`** (and potentially `types/index.ts`): Defines the structure of messages, message envelopes, addressing, and other communication-related data types.
- **`services/`**: Contains specialized services that handle different aspects of the messaging pipeline:
    - **`MessageQueueService.ts`**: Manages message queues for buffering, ensuring reliable delivery, and potentially handling priorities.
    - **`MessageDeliveryService.ts`**: Responsible for the actual transmission of messages (e.g., direct function calls, event bus, or network calls if agents are distributed).
    - **`MessageProcessingService.ts`**: Handles the processing of incoming messages, possibly routing them to the correct agent or handler.
    - **`MessageAcknowledgmentService.ts`**: Manages acknowledgments to confirm message receipt and processing.
    - **Subfolders within `services/`** (e.g., `acknowledgment/`, `connection/`, `offline/`, `queue/`, `recovery/`, `storage/`, `sync/`): These indicate a sophisticated messaging system with features for:
        - Connection management.
        - Offline message handling.
        - Message recovery mechanisms.
        - Persistent message storage.
        - Synchronization of messages or state across different parts or instances.

## How Components Interact

- Agents (e.g., `DungeonMasterAgent`, `RulesInterpreterAgent`) use `agent-messaging-service.ts` to send messages to each other.
- `agent-messaging-service.ts` likely uses `MessageQueueService.ts` to enqueue outgoing messages.
- `MessageDeliveryService.ts` picks up messages from the queue and attempts to deliver them.
- Upon receipt, messages might be processed by `MessageProcessingService.ts` and then routed to the target agent's specific message handler.
- Acknowledgment services update the status of messages.
- Storage and recovery services ensure message durability and system resilience.

## Usage Example

```typescript
// Conceptual example:
import { AgentMessagingService } from './agent-messaging-service';
import { Message } from './types'; // Assuming Message type is defined

const messagingService = AgentMessagingService.getInstance(); // If singleton

// Agent A sends a message to Agent B
const messageToSend: Message = {
  senderId: 'AgentA_ID',
  receiverId: 'AgentB_ID',
  payload: { type: 'QUERY_RULE', data: 'What is the rule for stealth?' },
  timestamp: new Date().toISOString(),
};

await messagingService.sendMessage(messageToSend);

// Agent B would have a handler to receive and process this message
// messagingService.onMessage((message: Message) => {
//   if (message.receiverId === 'AgentB_ID') {
//     // process message
//   }
// });
```

## Notes

- This module is critical for decoupled agent interactions and can support both intra-process and inter-process communication if designed for it.
- The level of sophistication suggested by the subfolders (sync, storage, recovery) implies a robust messaging system.
- Refer to the main `/src/agents/README.md` for how this messaging system fits into the overall agent architecture.
