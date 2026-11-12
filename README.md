# lc-checker

신용장 서류 대조 서비스입니다.

## 시작하기

### 1. 데이터베이스 실행

```bash
docker compose up -d
```

PostgreSQL 16 컨테이너 `lc-postgres`가 실행됩니다.

### 2. API 실행

```bash
cd apps/api
npm install
npm run start:dev
```

### 3. 웹 앱 실행

```bash
cd apps/web
npm install
npm run dev
```

## 접속 URL

| 대상 | URL |
| --- | --- |
| 데이터베이스 | localhost:5432 |
| API 헬스 체크 | http://localhost:3000/health |
| 웹 앱 | http://localhost:5173 |
