import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiGetResponse } from 'src/decorators/response/api.get.response.decorator';
import { HealthResponse } from 'src/responses/health.response';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiGetResponse(HealthResponse)
  check(): HealthResponse {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
