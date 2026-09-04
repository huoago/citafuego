const adminId='c08bbfbf-13fe-4078-9ed8-e634bc82ec9c';
const memberId='4b669173-3f16-4d39-92d7-d2ffd8b19d8c';
process.env.CF_QA_ADMIN_ID=adminId;
process.env.CF_QA_ADMIN_EMAIL='85fe2b04-98c2-49ca-b757-63d751fc9bcf@accounts.citafuego.invalid';
process.env.CF_QA_ADMIN_PASSWORD=['CFqa','admin',adminId.slice(0,8),'20260904!'].join('-');
process.env.CF_QA_MEMBER_ID=memberId;
process.env.CF_QA_MEMBER_EMAIL='85184212-b1be-4852-b431-c9b025e63e71@accounts.citafuego.invalid';
process.env.CF_QA_MEMBER_PASSWORD=['CFqa','member',memberId.slice(0,8),'20260904!'].join('-');
await import('./production-authenticated-qa.mjs');
