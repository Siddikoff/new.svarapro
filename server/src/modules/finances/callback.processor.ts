import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { FinancesService } from './finances.service';
import { Logger } from '@nestjs/common';
import { CallbackDto } from './dto/callback.dto';

@Processor('callback-queue')
export class CallbackProcessor {
  private readonly logger = new Logger(CallbackProcessor.name);

  constructor(private readonly financesService: FinancesService) {
    this.logger.log('CallbackProcessor initialized');
  }

  @Process('process-callback')
  async handleCallback(
    job: Job<{
      trackerId: string;
      clientTransactionId?: string;
      callbackData?: CallbackDto;
    }>,
  ) {
    // DEBUG log removed
    try {
      await this.financesService.processCallback(
        job.data.trackerId,
        job.data.clientTransactionId,
        job.data.callbackData,
      );
      this.logger.log(
        `Successfully processed callback for trackerId: ${job.data.trackerId}, jobId: ${job.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process callback for trackerId: ${job.data.trackerId}, jobId: ${job.id}`,
        error instanceof Error ? error.stack : undefined,
        { error: message, details: String(error) },
      );
      throw error; // Позволяем Bull повторить попытку
    }
  }
}
