import { TaskMessageService } from './TaskMessageService';
import { ResultMessageService } from './ResultMessageService';
import { QueryMessageService } from './QueryMessageService';
import { StateUpdateService } from './StateUpdateService';
import { TaskMessagePayload, ResultMessagePayload, QueryMessagePayload, StateUpdateMessagePayload } from '../types/messages';

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