/**
 * Message Handler Service for CrewAI
 * 
 * This file defines the MessageHandlerService class, which acts as a central dispatcher
 * for various types of messages within the CrewAI agent framework. It delegates
 * message processing to specialized service classes. This service is a singleton.
 * 
 * Main Class:
 * - MessageHandlerService: Routes messages to appropriate handlers.
 * 
 * Key Dependencies:
 * - Specialized message services (Task, Result, Query, StateUpdate).
 * - Message payload types from '../types/messages'.
 * 
 * @author AI Dungeon Master Team
 */

// CrewAI Types
import { QueryMessagePayload, ResultMessagePayload, StateUpdateMessagePayload, TaskMessagePayload } from '../types/messages';

// CrewAI Services (assuming kebab-case filenames)
import { QueryMessageService } from './query-message-service';
import { ResultMessageService } from './result-message-service';
import { StateUpdateService } from './state-update-service';
import { TaskMessageService } from './task-message-service';


export class MessageHandlerService {
  private static instance: MessageHandlerService;
  private taskService: TaskMessageService;
  private resultService: ResultMessageService;
  private queryService: QueryMessageService;
  private stateService: StateUpdateService;

  private constructor() {
    this.taskService = new TaskMessageService();
    this.resultService = new ResultMessageService();
    this.queryService = new QueryMessageService();
    this.stateService = new StateUpdateService();
  }

  public static getInstance(): MessageHandlerService {
    if (!MessageHandlerService.instance) {
      MessageHandlerService.instance = new MessageHandlerService();
    }
    return MessageHandlerService.instance;
  }

  public async handleTaskMessage(payload: TaskMessagePayload): Promise<void> {
    await this.taskService.handleTaskMessage(payload);
  }

  public async handleResultMessage(payload: ResultMessagePayload): Promise<void> {
    await this.resultService.handleResultMessage(payload);
  }

  public async handleQueryMessage(payload: QueryMessagePayload): Promise<void> {
    await this.queryService.handleQueryMessage(payload);
  }

  public async handleStateUpdate(payload: StateUpdateMessagePayload): Promise<void> {
    await this.stateService.handleStateUpdate(payload);
  }
}