import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RetrievalService } from './retrieval.service.js';

@Controller('search')
export class RetrievalController {
  constructor(private readonly retrieval: RetrievalService) {}

  @Get()
  search(
    @Query('q') query: string | undefined,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    if (!query?.trim()) throw new BadRequestException('Query "q" is required');
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('"limit" must be between 1 and 50');
    }
    return this.retrieval.search(query, { limit });
  }
}
