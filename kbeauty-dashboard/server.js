require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const OpenAI  = require('openai');
const fs      = require('fs');

const app = express();
app.use(cors()); app.use(express.json()); app.use(express.static(__dirname));

const cfg = {
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||3306,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, waitForConnections:true, connectionLimit:5,
};
if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA))
  cfg.ssl = { ca: fs.readFileSync(process.env.DB_SSL_CA) };
else cfg.ssl = { rejectUnauthorized: false };
const pool = mysql.createPool(cfg);

function cw(country, alias) {
  const col = alias ? `${alias}.country` : 'country';
  if (country === 'USA') return `(${col} = 'USA' OR ${col} = 'US')`;
  return `${col} = '${country}'`;
}

app.get('/api/debug-countries', async (req, res) => {
  try {
    const [r] = await pool.execute("SELECT country, COUNT(*) AS cnt FROM products_main GROUP BY country");
    res.json(r);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/product-types', async (req, res) => {
  try {
    const [r] = await pool.execute("SELECT DISTINCT category FROM products_main WHERE country='KR' AND category IS NOT NULL ORDER BY category");
    res.json(r.map(x => x.category));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', async (req, res) => {
  const { type } = req.query;
  try {
    const w = (type && type !== 'all') ? "AND category = ?" : "";
    const p = (type && type !== 'all') ? [type] : [];
    const [r] = await pool.execute(
      `SELECT DISTINCT product_id, product_name FROM products_main WHERE country='KR' ${w} ORDER BY product_name LIMIT 300`, p
    );
    res.json(r);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard', async (req, res) => {
  const country    = req.query.country    || 'USA';
  const product_id = req.query.product_id || '';
  const cwPm       = cw(country, 'pm');
  const cwPlain    = cw(country, '');

  try {
    // KPI
    const [stats] = await pool.execute(
      `SELECT COUNT(DISTINCT product_id) AS total_products,
              ROUND(AVG(rating),2)        AS avg_rating,
              ROUND(AVG(review_count),0)  AS avg_reviews
       FROM products_main WHERE ${cwPlain}`
    );

    // 시장 진입 점수
    let entryScores = [];
    if (product_id) {
      const [r] = await pool.execute(
        `SELECT target_country, market_entry_score, market_entry_label,
                ROUND(top100_proba * 100, 1) AS top100_proba
         FROM product_predictions WHERE product_id = ?
         ORDER BY FIELD(target_country,'USA','PL','VN')`, [product_id]
      );
      entryScores = r;
    }

    // 전체 평균 점수
    const [countryAvg] = await pool.execute(
      `SELECT target_country,
              ROUND(AVG(market_entry_score),1) AS avg_score,
              SUM(CASE WHEN market_entry_label='Very Likely' THEN 1 ELSE 0 END) AS very_likely_cnt
       FROM product_predictions
       GROUP BY target_country
       ORDER BY FIELD(target_country,'USA','PL','VN')`
    );

    // 감성 분석 — 나라 기준만
    const [sentiment] = await pool.execute(
      `SELECT sr.review_label AS label, COUNT(*) AS cnt
       FROM sentiment_reviews sr
       JOIN products_main pm ON sr.product_id = pm.product_id
       WHERE ${cwPm}
       GROUP BY sr.review_label`
    );

    // 카테고리별 제품 수
    const [categoryStats] = await pool.execute(
      `SELECT category, COUNT(DISTINCT product_id) AS cnt
       FROM products_main WHERE ${cwPlain}
       GROUP BY category ORDER BY cnt DESC`
    );

    res.json({ stats: stats[0], entryScores, countryAvg, sentiment, categoryStats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages 필요' });
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 1024,
      messages: [
        { role:'system', content:'K-뷰티 수출 전략 AI입니다. 한국 화장품의 미국(USA), 폴란드(PL), 베트남(VN) 수출 가능성을 시장 진입 점수(0~100) 기반으로 전문적으로 한국어 답변하세요.' },
        ...messages
      ],
    });
    res.json({ content: r.choices[0].message.content });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Server running → http://localhost:${PORT}`));
