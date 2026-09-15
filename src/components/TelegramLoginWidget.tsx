import { useEffect, useRef } from "react";

export interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botUsername: string;
  onAuth: (payload: TelegramAuthPayload) => void;
  disabled?: boolean;
}

// Telegram's widget calls a global callback by name — it can't invoke a React
// prop directly, so each mounted widget registers itself under a unique key
// and the global stub looks up the current handler at call time.
let widgetCounter = 0;

export function TelegramLoginWidget({ botUsername, onAuth, disabled }: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackName = useRef(`onTelegramAuth_${++widgetCounter}`);

  useEffect(() => {
    const container = containerRef.current;
    if (disabled || !botUsername || !container) return;

    const name = callbackName.current;
    (window as unknown as Record<string, unknown>)[name] = (payload: TelegramAuthPayload) => {
      onAuth(payload);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", `${name}(user)`);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[name];
      container.innerHTML = "";
    };
  }, [botUsername, disabled, onAuth]);

  return <div ref={containerRef} />;
}
