'use client';
import React from 'react';

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ');

const variants: Record<string, string> = {
  primary: 'bg-brand text-white hover:bg-navy-800',
  cta: 'border border-[#F15A24] bg-navy text-white hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-[#F15A24]',
  dark: 'bg-navy text-white hover:bg-slate-800',
  ghost: 'bg-white text-navy border border-slate-300 hover:bg-slate-50',
  gold: 'bg-gold text-white hover:brightness-95',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
export const btnClass = (variant = 'primary', extra?: string) =>
  cx('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand', variants[variant], extra);

export function Btn({ variant = 'primary', className, ...p }: any) {
  return <button {...p} className={btnClass(variant, className)} />;
}
export function LinkBtn({ variant = 'primary', className, ...p }: any) {
  return <a {...p} className={btnClass(variant, className)} />;
}
export function Card({ className, ...p }: any) {
  return <div {...p} className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)} />;
}
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
export function Field({ label, as: As = 'input', children, className, ...p }: any) {
  return (
    <label className={cx('block text-sm', className)}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <As {...p} className={inputCls}>{children}</As>
    </label>
  );
}
export function Badge({ tone = 'slate', children }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-800', green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-700', amber: 'bg-orange-100 text-orange-900', gold: 'bg-gold/10 text-gold',
  };
  return <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
}
export function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 p-4" role="dialog" aria-modal="true">
      <Card className="my-8 w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        {children}
      </Card>
    </div>
  );
}
