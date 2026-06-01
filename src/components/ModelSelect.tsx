import { useEffect, useMemo, useState } from "react";
import {
  modelPresets,
  providerDefaults,
  type ModelProvider,
} from "../providers/modelSettings";
import { Input, Select } from "./ui/Field";

interface ModelSelectProps {
  provider: ModelProvider;
  value: string;
  disabled?: boolean;
  allowDefault?: boolean;
  onChange: (value: string) => void;
}

const DEFAULT_VALUE = "__flowforge_default__";
const CUSTOM_VALUE = "__flowforge_custom__";

export function ModelSelect({
  provider,
  value,
  disabled,
  allowDefault = false,
  onChange,
}: ModelSelectProps) {
  const presets = useMemo(() => modelPresets[provider] ?? [], [provider]);
  const isPreset = presets.includes(value);
  const [customMode, setCustomMode] = useState(
    Boolean(value) && !isPreset,
  );
  const [customDraft, setCustomDraft] = useState(isPreset ? "" : value);

  useEffect(() => {
    const nextIsPreset = presets.includes(value);
    setCustomMode(Boolean(value) && !nextIsPreset);
    setCustomDraft(nextIsPreset ? "" : value);
  }, [presets, value]);

  const selectValue =
    customMode || (value && !isPreset)
      ? CUSTOM_VALUE
      : allowDefault && !value
        ? DEFAULT_VALUE
        : value || presets[0] || "";

  return (
    <div className="grid gap-2">
      <Select
        value={selectValue}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next === DEFAULT_VALUE) {
            setCustomMode(false);
            onChange("");
            return;
          }

          if (next === CUSTOM_VALUE) {
            setCustomMode(true);
            onChange(customDraft);
            return;
          }

          setCustomMode(false);
          onChange(next);
        }}
      >
        {allowDefault ? (
          <option value={DEFAULT_VALUE}>
            Use saved default ({providerDefaults[provider].defaultModel})
          </option>
        ) : null}
        {presets.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Custom model ID...</option>
      </Select>

      {customMode ? (
        <Input
          value={customDraft}
          disabled={disabled}
          placeholder={providerDefaults[provider].defaultModel}
          onChange={(event) => {
            setCustomDraft(event.target.value);
            onChange(event.target.value);
          }}
        />
      ) : null}
    </div>
  );
}
