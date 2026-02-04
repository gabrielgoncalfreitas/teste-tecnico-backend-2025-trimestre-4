import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Pagô - Teste Técnico Backend 2025 Trimestre 4')
    .addTag('CEP Crawl')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/documentation', app, documentFactory, {
    jsonDocumentUrl: '/documentation/json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const args = process.argv.slice(2);
  const roleArg = args.find((arg) => arg.startsWith('--role='));
  const role = roleArg ? roleArg.split('=')[1] : null;

  // Default to running everything if no role specified (or local dev)
  const runApi = !role || role === 'api';

  if (runApi) {
    await app.listen(process.env.API_PORT ?? 3000);
    console.log(`Application is running on: ${await app.getUrl()} (Role: API)`);
  } else {
    await app.init();
    console.log('API listening disabled. (Role: Worker)');
  }
}
bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
