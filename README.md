# Crawler Assíncrono de CEPs

API REST para processamento assíncrono de ranges de CEPs utilizando filas e MongoDB.

## ✅ Status da Implementação

| Requisito                                               | Status |
| ------------------------------------------------------- | ------ |
| POST /cep/crawl (solicitar range)                       | ✅     |
| GET /cep/crawl/:crawl_id (status)                       | ✅     |
| GET /cep/crawl/:crawl_id/results (resultados paginados) | ✅     |
| Processamento assíncrono via fila                       | ✅     |
| Controle de taxa (rate limiting)                        | ✅     |
| Retry com backoff exponencial                           | ✅     |
| Circuit Breaker para API externa                        | ✅     |
| Cache de CEPs já consultados                            | ✅     |
| Swagger/OpenAPI                                         | ✅     |
| Testes unitários (122 testes)                           | ✅     |
| Docker Compose completo                                 | ✅     |

---

## 🚀 Como Rodar

### Com Docker (recomendado)

```bash
# 1. Clone e configure
cp .env.example .env

# 2. Suba tudo
docker-compose up --build
```

### Localmente (desenvolvimento)

```bash
# 1. Instale dependências
pnpm install

# 2. Suba apenas infra (MongoDB + ElasticMQ)
docker-compose up mongo elasticmq -d

# 3. Gere o Prisma Client
pnpm prisma generate && pnpm prisma db push

# 4. Rode API e Worker separadamente
pnpm start:api     # Terminal 1
pnpm start:worker  # Terminal 2
```

### URLs

| Serviço         | URL                                 |
| --------------- | ----------------------------------- |
| API             | http://localhost:3000               |
| Swagger         | http://localhost:3000/documentation |
| MongoDB Express | http://localhost:8081               |
| ElasticMQ UI    | http://localhost:9325               |

---

## 📡 Endpoints

### POST /cep/crawl

Solicita processamento de um range de CEPs.

```bash
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{"cep_start": "01001000", "cep_end": "01001010"}'
```

**Resposta (202 Accepted):**

```json
{
  "crawl_id": "019c2c2f-e62f-7503-9a1d-dc09da92220f",
  "status": "PENDING",
  "total_ceps": 11
}
```

### GET /cep/crawl/:crawl_id

Consulta status do processamento.

```bash
curl http://localhost:3000/cep/crawl/019c2c2f-e62f-7503-9a1d-dc09da92220f
```

**Resposta:**

```json
{
  "crawl_id": "019c2c2f-e62f-7503-9a1d-dc09da92220f",
  "status": "FINISHED",
  "total_ceps": 11,
  "processed_ceps": 11,
  "success_ceps": 8,
  "failed_ceps": 3
}
```

### GET /cep/crawl/:crawl_id/results

Consulta resultados com paginação e filtros.

```bash
# Paginação
curl "http://localhost:3000/cep/crawl/:id/results?page=1&limit=20"

# Filtros
curl "http://localhost:3000/cep/crawl/:id/results?status=SUCCESS&cep_start=01001000"

# Busca por texto (logradouro, bairro, cidade)
curl "http://localhost:3000/cep/crawl/:id/results?q=paulista"
```

---

## 🏗️ Arquitetura

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Cliente    │───▶│     API      │───▶│   MongoDB    │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  ElasticMQ   │  (SQS-compatible)
                    │    (Fila)    │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐    ┌──────────────┐
                    │   Worker     │───▶│   ViaCEP     │
                    │  (Crawler)   │    │    (API)     │
                    └──────────────┘    └──────────────┘
```

### Estrutura de Pastas

```
src/
├── controllers/     # Endpoints HTTP (thin layer)
├── handlers/        # Lógica de negócio dos endpoints
├── services/        # Serviços de domínio
├── providers/       # Integrações externas (ViaCEP)
├── repositories/    # Acesso a dados (Prisma)
├── workers/         # Consumidor da fila SQS
├── dtos/            # Validação de entrada
├── responses/       # Schemas de resposta
├── errors/          # Erros customizados
└── filters/         # Exception handlers
```

---

## 🎯 Decisões Técnicas

### 1. Controle de Taxa (Rate Limiting)

O sistema implementa múltiplas camadas de proteção contra sobrecarga da API externa:

| Mecanismo    | Configuração                | Descrição                               |
| ------------ | --------------------------- | --------------------------------------- |
| Rate Limit   | `WORKER_RATE_LIMIT_MS=2000` | Delay entre batches de processamento    |
| Concorrência | `WORKER_CONCURRENCY=1`      | CEPs processados em paralelo por worker |
| Timeout      | `VIACEP_TIMEOUT_MS=10000`   | Timeout por requisição                  |
| Retries      | 3 tentativas                | Backoff exponencial: 2s → 4s → 8s       |

### 2. Circuit Breaker

Quando a API externa retorna erros consecutivos, o worker pausa automaticamente:

```
Erro 1 → espera 10s
Erro 2 → espera 20s
Erro 3 → espera 40s
Erro 4+ → espera 60s (máximo)
```

Implementado em `CrawlWorker.startPolling()` com `ThrottlingError` para detectar 429.

### 3. Cache de CEPs

CEPs já consultados são armazenados na collection `ceps`, evitando requisições repetidas:

- Se o CEP existe no cache → usa direto, não chama ViaCEP
- Reduz drasticamente requisições para ranges sobrepostos

### 4. Recovery de Crawls Incompletos

Se o worker reiniciar, ele detecta crawls não finalizados e readiciona apenas os CEPs faltantes na fila:

- Campo `last_recovery_at` evita duplicação de recovery em 10 minutos
- Garante que nenhum CEP seja perdido mesmo com falhas

### 5. Separação API/Worker

O mesmo código pode rodar como API ou Worker via flag:

```bash
node dist/main --role=api     # Apenas HTTP
node dist/main --role=worker  # Apenas processamento de fila
```

Permite escalar API e Workers independentemente.

---

## ⚙️ Variáveis de Ambiente

| Variável               | Descrição               | Padrão                     |
| ---------------------- | ----------------------- | -------------------------- |
| `API_PORT`             | Porta da API            | `3000`                     |
| `WORKER_REPLICAS`      | Instâncias do worker    | `1`                        |
| `WORKER_CONCURRENCY`   | Parallelismo por worker | `1`                        |
| `WORKER_RATE_LIMIT_MS` | Delay entre batches     | `2000`                     |
| `VIACEP_TIMEOUT_MS`    | Timeout ViaCEP          | `10000`                    |
| `VIACEP_URL`           | URL base ViaCEP         | `https://viacep.com.br/ws` |

---

## 🧪 Testes

```bash
# Rodar todos os testes
pnpm test

# Com coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

**Resultado:** 122 testes passando, cobrindo:

- Controllers, Handlers, Services
- Repositories, Providers
- Workers, DTOs, Validators
- Error handling e edge cases

---

## 🔧 Stack Tecnológica

| Tecnologia     | Uso                     |
| -------------- | ----------------------- |
| **NestJS**     | Framework principal     |
| **Prisma**     | ORM para MongoDB        |
| **MongoDB**    | Banco de dados          |
| **ElasticMQ**  | Fila compatível com SQS |
| **AWS SDK v3** | Cliente SQS             |
| **Axios**      | HTTP client             |
| **Swagger**    | Documentação da API     |
| **Jest**       | Testes unitários        |
| **Docker**     | Containerização         |

---

## 📁 Modelo de Dados

### Collection: `crawls`

```typescript
{
  id: string,              // UUID v7
  cep_start: string,
  cep_end: string,
  status: "PENDING" | "RUNNING" | "FINISHED" | "FAILED",
  total_ceps: number,
  processed_ceps: number,
  success_ceps: number,
  failed_ceps: number,
  last_recovery_at: Date?, // Controle de recovery
  created_at: Date,
  updated_at: Date
}
```

### Collection: `crawl_results`

```typescript
{
  id: string,
  crawl_id: string,
  cep: string,
  status: "SUCCESS" | "ERROR",
  data: JSON?,           // Dados do endereço
  error_message: string?,
  created_at: Date
}
```

### Collection: `ceps` (cache)

```typescript
{
  cep: string,    // PK
  found: boolean,
  logradouro: string?,
  bairro: string?,
  localidade: string?,
  uf: string?,
  // ... demais campos
}
```

---

## 📋 Proposta Original

<details>
<summary>Clique para expandir os requisitos originais</summary>

### A proposta: Crawler assíncrono de CEPs + Fila + MongoDB

A ideia é bem simples:

- [x] uma API que permita solicitar o processamento de um **range de CEPs**
- [x] cada CEP do range deve ser processado de forma **assíncrona**
- [x] os dados devem ser obtidos a partir da API pública do **ViaCEP**
- [x] os resultados e o progresso devem ser persistidos em um banco **MongoDB**

### API

- [x] rota `POST /cep/crawl` que recebe um range de CEPs
- [x] validação de formato, ordem e tamanho máximo do range
- [x] criar identificador único (`crawl_id`)
- [x] inserir um item na fila para cada CEP
- [x] retornar `202 Accepted` com o `crawl_id`

- [x] rota `GET /cep/crawl/:crawl_id` com status do processamento
- [x] retornar `404` se não existir, `200` se existir

- [x] rota `GET /cep/crawl/:crawl_id/results` com paginação

### Processamento assíncrono

- [x] processamento fora do ciclo HTTP
- [x] consumo individual da fila
- [x] persistência no MongoDB
- [x] suporte a retry em falhas temporárias

### Fila assíncrona

- [x] uso do ElasticMQ (compatível com SQS)
- [x] controle de taxa para não exceder limites da API externa

### Persistência

- [x] MongoDB com dados associados ao `crawl_id`
- [x] modelo permite acompanhar progresso e identificar erros

### Infraestrutura

- [x] Dockerfile para a aplicação
- [x] docker-compose.yml com API, Worker, MongoDB e ElasticMQ

</details>

---

## 👨‍💻 Autor

Desenvolvido como teste técnico para posição de Backend Developer.
