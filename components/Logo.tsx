export function Logo({ size = 40, text = true }: { size?: number; text?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="LearnWithSulav logo" style={{ height: size, width: 'auto' }} />
      {text && <span className="text-lg font-extrabold tracking-tight text-navy">Learn With Sulav</span>}
    </span>
  );
}
