import { useCallback, useState } from "react";

export function useSwitcher(defaultValue = false) {
  const [flag, setFlag] = useState(defaultValue);

  const turnOn = useCallback(() => setFlag(true), []);
  const turnOff = useCallback(() => setFlag(false), []);

  return [flag, turnOn, turnOff] as const;
}
