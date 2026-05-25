"use client";

// DeGENERATE — shared inspector control primitives.
import { useId } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="dg-field">
      <div className="dg-field-head">
        <span className="dg-field-label">{label}</span>
        {hint && <span className="dg-field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  const display = format ? format(value) : Number.isInteger(step) ? String(Math.round(value)) : value.toFixed(2);
  return (
    <div className="dg-field">
      <div className="dg-field-head">
        <label className="dg-field-label" htmlFor={id}>
          {label}
        </label>
        <span className="dg-val">{display}</span>
      </div>
      <input
        id={id}
        className="dg-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="dg-field dg-color-field">
      <label className="dg-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="dg-color-wrap">
        <input
          id={id}
          className="dg-color"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="dg-hex"
          type="text"
          value={value.toUpperCase()}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
          }}
        />
      </div>
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="dg-seg" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "is-on" : ""}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`dg-toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="dg-toggle-track">
        <span className="dg-toggle-knob" />
      </span>
      <span className="dg-toggle-label">{label}</span>
    </button>
  );
}
