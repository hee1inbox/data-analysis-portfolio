# K-Beauty Market Intelligence Dashboard

## 📦 기술 스택
- **Frontend**: HTML5 · CSS3 · Chart.js · Vanilla JS
- **Backend**: Node.js · Express
- **Database**: MySQL (AIVEN Cloud)
- **AI**: Anthropic Claude API (챗봇)

---

## ⚡ 로컬 실행 (5분)

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 열고 실제 값으로 수정
```

### 3. AIVEN CA 인증서 저장
- AIVEN 대시보드 → 해당 서비스 → **Download CA certificate**
- 다운로드한 `ca.pem`을 프로젝트 루트에 저장

### 4. 서버 실행
```bash
npm start
# 개발 시: npm run dev (nodemon 자동 재시작)
```

### 5. 브라우저 접속
```
http://localhost:3001
```

---

## 🚀 Vercel / Railway 배포

### 프론트엔드 (Vercel)
```bash
# vercel.com에서 GitHub 연결 후 자동 배포
# 환경변수는 Vercel 대시보드 > Settings > Environment Variables에 추가
```

### 백엔드 + DB (Railway)
```bash
# railway.app에서 GitHub 연결
# 환경변수 설정 후 자동 배포
# AIVEN MySQL은 외부 접속 허용 상태로 유지
```

### API_BASE URL 변경
`public/index.html` 상단의 API 변수를 배포된 백엔드 URL로 변경:
```javascript
const API = 'https://your-backend.railway.app'; // 배포 URL
```

---

## 📊 데이터 구조

| 테이블 | 설명 |
|--------|------|
| `products_main` | 제품 기본 정보 (국가, 플랫폼, 카테고리, 평점) |
| `product_predictions` | ML 시장 진입 점수 예측 |
| `sentiment_reviews` | 리뷰 감성 분석 결과 |
| `product_features_log` | 가격대 피처 |
| `product_attributes_onehot` | 성분·효능 원핫 인코딩 |

---

## 🔒 보안 주의사항
- `.env` 파일은 절대 GitHub에 올리지 마세요 (`.gitignore` 필수)
- Claude API Key는 반드시 백엔드에서만 사용 (프론트 노출 금지)
- AIVEN: IP 화이트리스트 또는 내부 네트워크 사용 권장
