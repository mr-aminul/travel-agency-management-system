-- Harden password resets: OTP challenge + burn any previously issued links.

alter table platform.password_resets
  add column if not exists otp_hash text;

alter table platform.password_resets
  add column if not exists attempts integer not null default 0;

-- Any reset token that was ever returned in an API/UI response is unsafe.
update platform.password_resets
set used_at = coalesce(used_at, now())
where used_at is null;

comment on column platform.password_resets.otp_hash is
  'SHA-256 hex of the 6-digit OTP emailed with the reset link.';
comment on column platform.password_resets.attempts is
  'Failed confirm attempts; lock after threshold.';
