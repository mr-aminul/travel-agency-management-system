/** Shared brand-field background for public auth shells (matches TrackClientPage). */
export const authPageBackgroundStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-theme) 55%, #040806)',
  backgroundImage: [
    'radial-gradient(48rem 34rem at 14% 10%, color-mix(in srgb, var(--color-theme) 88%, #06281c) 0%, transparent 58%)',
    'radial-gradient(40rem 30rem at 90% 90%, color-mix(in srgb, var(--color-theme) 70%, #041910) 0%, transparent 55%)',
    'linear-gradient(165deg, color-mix(in srgb, var(--color-theme) 65%, #03140e) 0%, color-mix(in srgb, var(--color-theme) 40%, #070b0f) 50%, #050807 100%)',
  ].join(', '),
} as const

export const authShellClass =
  'relative isolate flex h-full min-h-full items-center justify-center overflow-auto px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-[#0a0a0a] [color-scheme:light] max-md:items-start max-md:px-3.5 max-md:pt-[calc(1rem+env(safe-area-inset-top,0px))] max-md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'

export const authCornerLogoClass =
  'absolute left-5 top-5 z-[2] h-[1.625rem] w-auto object-contain opacity-[0.92] max-md:left-3.5 max-md:top-3.5'

export const authCardClass =
  'relative z-[1] my-auto flex w-full max-w-96 flex-col items-stretch gap-6 rounded-[1.25rem] border border-[#e5e7eb] bg-white px-6 pb-6 pt-7 text-center text-[#0a0a0a] shadow-[0_18px_48px_color-mix(in_srgb,black_28%,transparent),0_2px_8px_color-mix(in_srgb,black_12%,transparent)] max-md:gap-5 max-md:px-[1.1rem] max-md:pb-5 max-md:pt-[1.35rem]'

export const authBrandClass = 'flex flex-col items-center gap-[0.65rem]'

export const authBrandLogoClass =
  'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] bg-[color-mix(in_srgb,var(--color-theme)_6%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme)_16%,transparent)]'

export const authTitleClass =
  'm-0 text-balance font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.4vw,1.85rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]'

export const authActionsClass =
  'flex w-full flex-col items-stretch gap-[0.85rem]'

export const authFormClass =
  'flex w-full flex-col gap-[0.9rem] text-start'

export const authTextLinkClass =
  'm-[0.15rem_auto_0] inline-block cursor-pointer border-0 bg-transparent p-0 text-center font-inherit text-sm leading-snug text-[#64748b] no-underline transition-colors hover:text-[color-mix(in_srgb,#64748b_72%,#0a0a0a)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)]'

export const authSuccessClass =
  'flex flex-col items-center gap-[0.85rem] px-0 pb-[0.15rem] pt-[0.35rem]'

export const authSuccessIconClass =
  'grid size-[4.5rem] place-items-center rounded-full bg-[var(--color-status-completed,#2f7a5d)] text-white shadow-[0_10px_28px_color-mix(in_srgb,var(--color-status-completed,#2f7a5d)_35%,transparent)]'
