-- Temporarily close all user-initiated Creator monetization mutations.
-- Existing creator data, ledgers and admin/commercial backoffice remain intact.
-- Re-opening requires a deliberate follow-up migration plus CREATOR_PROGRAM_ENABLED=true.

revoke execute on function public.apply_creator_program(text,text[]) from authenticated;
revoke execute on function public.request_creator_payout(bigint,text) from authenticated;
revoke execute on function public.request_commercial_creator_payout(bigint) from authenticated;
revoke execute on function public.submit_creator_compliance(text,text,jsonb) from authenticated;
revoke execute on function public.apply_brand_opportunity(bigint,text,bigint) from authenticated;

comment on function public.apply_creator_program(text,text[]) is 'Creator program temporarily closed to authenticated users. Re-enable only after launch approval.';
comment on function public.request_commercial_creator_payout(bigint) is 'Creator commercial payouts temporarily closed to authenticated users.';
comment on function public.submit_creator_compliance(text,text,jsonb) is 'Creator KYC/tax/payout submissions temporarily closed to authenticated users.';
comment on function public.apply_brand_opportunity(bigint,text,bigint) is 'Creator Brand Marketplace applications temporarily closed to authenticated users.';
