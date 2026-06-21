"use client";

import { useEffect, useState } from "react";
import { FileUp, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { API_BASE_URL, apiFetch, getStoredSession } from "../../../../lib/api";
import { PageHeader } from "../../../../components/page-header";
import { Panel } from "../../../../components/panel";

type Document = {
  id: string;
  title: string;
  sourceType: string;
  status: string;
  createdAt: string;
};

type SearchResult = {
  content: string;
  title: string;
  distance: number;
};

export default function KnowledgePage() {
  const t = useTranslations("knowledge");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  function loadDocuments() {
    apiFetch<{ data: Document[] }>("/api/knowledge/documents")
      .then((response) => setDocuments(response.data))
      .catch(console.error);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadFile(file: File) {
    const session = getStoredSession();
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/documents`, {
        method: "POST",
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: formData
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      setMessage(t("uploadQueued"));
      loadDocuments();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function search() {
    if (query.length < 2) return;
    const response = await apiFetch<{ data: SearchResult[] }>(
      `/api/knowledge/search?q=${encodeURIComponent(query)}`
    );
    setResults(response.data);
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("upload")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("uploadHint")}</p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/20 bg-black/20 px-4 py-10 text-center">
            <FileUp className="h-8 w-8 text-blue-300" />
            <span className="mt-3 text-sm text-slate-300">{uploading ? "..." : t("chooseFile")}</span>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </label>
          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-white">{t("search")}</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 flex-1 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
            />
            <button
              type="button"
              onClick={search}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-semibold text-white"
            >
              <Search className="h-4 w-4" />
              {t("searchButton")}
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {results.map((result, index) => (
              <div key={`${result.title}-${index}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-blue-300">{result.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-slate-300">{result.content}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">{t("document")}</th>
                <th className="px-4 py-3 text-start">{t("type")}</th>
                <th className="px-4 py-3 text-start">{t("status")}</th>
                <th className="px-4 py-3 text-start">{t("uploaded")}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white">{document.title}</td>
                  <td className="px-4 py-3 text-slate-300">{document.sourceType}</td>
                  <td className="px-4 py-3 text-slate-300">{document.status}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(document.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
