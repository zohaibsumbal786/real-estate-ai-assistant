"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { cn } from "../../../../lib/utils";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type ConversationListItem = {
  id: string;
  needsHuman: boolean;
  aiLastIntent?: string;
  customer: { name?: string; phone: string };
  messages: Array<{ body?: string; direction: string }>;
};

type Conversation = Omit<ConversationListItem, "messages"> & {
  messages: Array<{
    id: string;
    direction: "INBOUND" | "OUTBOUND";
    body?: string;
    createdAt: string;
  }>;
};

export default function ConversationsPage() {
  const t = useTranslations("conversations");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");

  const selectedListItem = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId),
    [conversations, selectedId]
  );

  async function loadList() {
    const response = await apiFetch<{ data: ConversationListItem[] }>("/api/conversations");
    setConversations(response.data);
    if (!selectedId && response.data[0]) {
      setSelectedId(response.data[0].id);
    }
  }

  useEffect(() => {
    loadList().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    apiFetch<Conversation>(`/api/conversations/${selectedId}`).then(setSelected).catch(console.error);
  }, [selectedId]);

  async function toggleAi(enabled: boolean) {
    if (!selectedId) return;
    await apiFetch(`/api/conversations/${selectedId}/ai`, {
      method: "PATCH",
      body: JSON.stringify({ aiEnabled: enabled })
    });
    await loadList();
    const updated = await apiFetch<Conversation>(`/api/conversations/${selectedId}`);
    setSelected(updated);
  }

  async function sendManualReply() {
    if (!selectedId || !reply.trim()) return;
    await apiFetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: reply })
    });
    setReply("");
    const updated = await apiFetch<Conversation>(`/api/conversations/${selectedId}`);
    setSelected(updated);
    await loadList();
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[380px_1fr]">
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 p-4 text-sm font-semibold text-white">
            {conversations.length} conversations
          </div>
          <div className="max-h-[670px] overflow-y-auto">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "block w-full border-b border-white/10 p-4 text-start transition hover:bg-white/[0.04]",
                  selectedId === conversation.id && "bg-blue-500/10"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">
                    {conversation.customer.name ?? conversation.customer.phone}
                  </p>
                  {conversation.needsHuman ? (
                    <span className="rounded-md bg-purple-500/15 px-2 py-1 text-xs text-purple-200">
                      human
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-1 text-sm text-slate-400">
                  {conversation.messages[0]?.body ?? "No messages"}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="grid grid-rows-[auto_1fr_auto] overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div>
                  <p className="font-semibold text-white">
                    {selected.customer.name ?? selected.customer.phone}
                  </p>
                  <p className="text-sm text-slate-400">{selected.aiLastIntent ?? "conversation"}</p>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  {t("aiTakeover")}
                  <Switch.Root
                    checked={!selectedListItem?.needsHuman}
                    onCheckedChange={toggleAi}
                    className="relative h-6 w-11 rounded-full bg-slate-700 data-[state=checked]:bg-blue-500"
                  >
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5" />
                  </Switch.Root>
                </label>
              </div>

              <div className="space-y-4 overflow-y-auto p-5">
                {selected.messages.map((message) => {
                  const inbound = message.direction === "INBOUND";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", inbound ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[72%] rounded-md border px-4 py-3 text-sm leading-6",
                          inbound
                            ? "border-white/10 bg-white/[0.06] text-slate-100"
                            : "border-blue-400/30 bg-blue-500/15 text-blue-50"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                          {inbound ? <UserRound className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          {inbound ? "Customer" : "Agent / AI"}
                        </div>
                        {message.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={t("manualReply")}
                    className="h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={sendManualReply}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white shadow-glow"
                  >
                    <Send className="h-4 w-4 rtl-flip" />
                    {t("send")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid place-items-center text-slate-400">{t("select")}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
