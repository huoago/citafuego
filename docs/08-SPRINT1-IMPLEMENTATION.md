# CitaFuego Sprint 1 — 实施说明

## 本次完成范围

Sprint 1 已从 Demo 前端推进为真实 Supabase 架构代码：

1. Supabase SSR Cookie Auth；
2. 邮箱 Magic Link 注册/登录；
3. 前端 + PostgreSQL Trigger 双层 18+ 闸门；
4. 版本化 Terms / Privacy / Sensitive Data Consent；
5. Onboarding：资料、关系意图、双向偏好、兴趣、年龄和距离；
6. 精确坐标仅保存在 `user_location_private`；
7. 两个私有 Storage Bucket；
8. Signed Upload URL；
9. Sharp 解码、方向纠正、像素限制、WebP 重编码，去除原始图片元数据；
10. Profile Photo 人工审核；
11. 随机动作 Selfie 真人验证；
12. Trust & Safety 后台并排比对资料照和验证自拍；
13. Profile 激活门槛；
14. 真实 PostgreSQL Discovery；
15. 双向性别、年龄、意图、验证状态与距离偏好；
16. Like/Pass 原子 RPC、每日免费额度和并发锁；
17. 双向 Like 自动创建 Match + Conversation；
18. 真实 Matches / Chats 页面；
19. 消息审核，`held` 消息不会下发给接收者；
20. Admin Audit Log。

## Profile 激活条件

V1.0 当前锁定为全部满足才可激活：

- 18+；
- Bio >= 20 字符；
- 至少一类目标性别；
- 至少 3 个兴趣；
- 至少 2 张 `approved` 照片；
- 真人验证 `verification_badge = true`；
- Terms / Privacy / Sensitive Data 同意版本均为当前版本；
- 没有 active suspension / ban / discover_hidden。

这意味着生产环境下未经过人工照片审核和真人验证的账户不会进入 Discover。

## 数据库迁移顺序

必须按顺序执行：

```text
001_core.sql
002_matching_chat.sql
003_safety_billing_admin.sql
004_trusted_rpcs.sql
005_discovery_rpc.sql
006_sprint1_auth_onboarding.sql
007_discovery_v2.sql
008_match_chat_read_models.sql
009_sprint1_media_finalize.sql
seed.sql
```

`007` 会替换 `005` 中早期的 Discovery 函数。

## Supabase 环境变量

```env
NEXT_PUBLIC_APP_URL=https://citafuego.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

MODERATION_PROVIDER=rules
VERIFICATION_PROVIDER=manual_selfie
PROFILE_PHOTO_REVIEW_MODE=manual
VERIFICATION_REVIEW_MODE=manual
```

代码保留 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 兼容回退，但新项目优先使用 Publishable / Secret Key。

## Auth 邮件模板

生产 Supabase 项目创建后，需要把 Confirm Signup 与 Magic Link 模板指向 SSR token hash 回调，例如：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Continuar en CitaFuego
</a>
```

对应 Route Handler：

```text
GET /auth/confirm
```

## 图片隐私

Bucket：

```text
profile-photos        private
verification-selfies private
```

浏览器拿到的不是长期公开 URL，而是短时签名 URL。

上传原图首先进入私有 `raw-*` 对象，然后服务端：

```text
下载 → 解码 → 限制像素 → 自动纠正方向 → 缩放 → WebP 重编码 → 保存净化版本 → 删除 raw
```

因此用户手机原图中的 EXIF/GPS 元数据不会直接成为最终 Profile Photo。

## 真人验证

本 Sprint 的真人验证是 **person/profile consistency verification**，不是身份证 KYC：

1. 服务器生成随机动作 challenge；
2. challenge 15 分钟有效；
3. 用户拍摄自拍；
4. 自拍上传意图绑定同一 verification session；
5. Trust & Safety 只能由 `super_admin` / `trust_safety` 角色访问；
6. 审核员看到已批准资料照 + 自拍并排对比；
7. verified/rejected 决策写入审计日志；
8. 审核完成后尝试删除原始验证自拍。

## Discovery

生产页面不再导入 `demoProfiles`。

`get_discover_candidates()` 仅对 active profile 工作，并执行：

- 同城/同国家；
- 双方性别偏好；
- 双方年龄偏好；
- 双方关系意图；
- 双方 verified-only 条件；
- 双方最大距离的较小值；
- Block 双向排除；
- 已经 Pass/Like 的用户排除；
- 至少一张 approved 照片。

返回给 UI 的距离只有：

```text
<1 km
1–3 km
3–10 km
10–30 km
30+ km
Zona aproximada
```

不返回候选人的经纬度或出生日期。

## Match / Chat

`perform_interaction()`：

- 来源用户必须 active；
- target 必须 active；
- Block 检查；
- 免费 Like 日限额；
- 用户级 advisory transaction lock，避免并发冲穿额度；
- Match user_a/user_b 固定排序；
- Conversation `ON CONFLICT(match_id)` 幂等创建。

消息发送前再次调用 `can_send_message()`，确认：

- conversation active；
- match active；
- sender profile active；
- 双方没有 Block。

`held` 消息只有发送者可见，接收方只能读 `sent` 消息。

## 测试结果

当前交付环境已经验证：

```text
Domain + Security Contract Tests: 15/15 PASS
TS/TSX syntax transpile scan: 65 files, 0 syntax errors
Local @/ import resolution: 0 missing
Production Discover mock imports: 0
Database migrations: 9
```

当前环境无法完成：

```text
npm install
npm run typecheck
npm run build
```

原因：外部 npm 下载在容器内持续 timeout，不是代码测试报错。因此完整 Next.js build 仍是部署前强制 gate。

## Supabase 实际项目状态

本次已读取当前连接的 Supabase 账户，只发现：

```text
wantyou-love
```

没有 CitaFuego 项目，因此本次没有执行 migration，且没有改动 wantyou-love。

创建新的 Supabase 项目涉及组织选择和费用确认，必须由账号持有人明确确认后才能创建。

## 新项目接入后的强制 E2E

1. 17 岁注册必须失败；
2. 正好 18 岁当天必须通过；
3. Magic Link 可以建立 SSR Cookie Session；
4. 未完成 Onboarding 不能访问 Discover；
5. 两张照片上传后默认 pending；
6. T&S 审核照片；
7. Selfie challenge 过期必须失败；
8. 自拍和 session 不匹配必须失败；
9. T&S 真人验证；
10. 全部条件完成后 profile 自动 active；
11. 双向偏好正确过滤；
12. Browser payload 不出现 DOB / exact coordinates；
13. 双向 Like 只创建一个 Match / Conversation；
14. held message 接收者看不到；
15. Block 后不能继续发消息；
16. Supabase Security/Performance Advisors 无高危未处理项。
