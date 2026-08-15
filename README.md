# CitaFuego V1.0 Release Candidate

CitaFuego 是面向西班牙语用户的 **18+ 真人约会平台**，首发市场为 Lima, Perú。

## 当前产品闭环

```text
18+ Registro
→ Magic Link Auth
→ Onboarding
→ Fotos privadas
→ Moderación de fotos
→ Verificación humana
→ Profile activo
→ Discover paginado
→ Like / Rewind / Who Likes You
→ Match
→ Chat moderado
→ Report / Block / Unblock
```

## 已完成

### Sprint 1

- Supabase SSR Auth / Magic Link
- 18+ 双层校验
- Onboarding
- 私有照片 Storage
- 服务端照片净化
- 真人验证与 Trust & Safety 审核
- Profile 激活
- 真实 Discovery
- Match / Chat

### Sprint 2

- 分页 Discovery
- Who Likes You
- Rewind
- Premium Filters
- 举报
- 拉黑 / 解封
- 安全读取模型
- SECURITY DEFINER 权限加固
- 性能索引与 Supabase Advisor 修复

## 技术栈

- Next.js 16 App Router / `proxy.ts`
- React 19 / TypeScript
- Supabase Auth + PostgreSQL + Storage
- PostgreSQL RLS / SECURITY DEFINER RPC
- Sharp server-side image sanitization
- Vercel production hosting target

## Supabase

Production project ref:

```text
stfbybkutnoqoxhqxyou
```

数据库迁移文件：

```text
db/migrations/001_core.sql
...
db/migrations/014_safety_read_models.sql
```

> 不要把 `.env.production`、service-role key、SMTP 密钥或第三方 API Secret 提交到 GitHub。

## 环境变量

复制 `.env.example` 为 `.env.local`，至少配置：

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

生产环境额外配置审核、邮件、支付供应商时，只通过部署平台 Secret/Environment Variables 管理。

## 本地验证

```bash
npm install
npm run typecheck
npm run domain:test
npm run build
```

当前 Release Candidate 的业务与安全契约测试：**17/17 PASS**。

## 生产域名

目标正式域名：

```text
https://citafuego.com
```

## 法律状态

`/terminos` 与 `/privacidad` 当前仍属于产品开发草案。正式对公众投放、广告投放或规模化获客之前，必须完成秘鲁当地法律审核，并接入生产 SMTP。
