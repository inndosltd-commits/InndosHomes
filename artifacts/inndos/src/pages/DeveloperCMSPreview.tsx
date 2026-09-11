import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  useCreateCmsPreview,
  getGetCmsPreviewQueryKey,
  useGetCmsPreview,
} from "@workspace/api-client-react";
import type { CmsDocument, CmsPreviewPage } from "@workspace/api-client-react";
import { CmsPreviewRenderer } from "@/components/cms/CmsRenderer";
import { useAuth } from "@/lib/auth";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "error" in error) return String(error.error);
  return "This preview could not be loaded.";
}

function isUnsavedPreviewRoute() {
  const hashQuery = window.location.hash.split("?")[1];
  const params = new URLSearchParams(hashQuery ?? window.location.search);
  return params.get("mode") === "unsaved";
}

export default function DeveloperCMSPreview() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/developer/cms/preview/:slug");
  const slug = params?.slug ?? "";
  const isUnsavedPreview = isUnsavedPreviewRoute();
  const [unsavedPage, setUnsavedPage] = useState<CmsPreviewPage | null>(null);
  const [unsavedError, setUnsavedError] = useState<unknown>(null);
  const createPreviewMutation = useCreateCmsPreview();
  const previewQuery = useGetCmsPreview(slug, {
    query: {
      queryKey: getGetCmsPreviewQueryKey(slug),
      enabled: !isUnsavedPreview && !!slug && !!user && user.role === "developer",
      retry: false,
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/login");
    } else if (user.role !== "developer") {
      setLocation("/dashboard");
    }
  }, [authLoading, setLocation, user]);

  useEffect(() => {
    if (!isUnsavedPreview || authLoading || !user || user.role !== "developer") return;
    const opener = window.opener;
    if (!opener) {
      setUnsavedError(new Error("Reopen this preview from the CMS editor to send the latest unsaved changes."));
      return;
    }
    const origin = window.location.origin;
    const handlePreviewDocument = (event: MessageEvent<{ type?: string; document?: CmsDocument }>) => {
      if (event.origin !== origin || event.source !== opener || event.data?.type !== "cms-preview-document" || !event.data.document) return;
      createPreviewMutation.mutate(
        { slug, data: { draft: event.data.document } },
        {
          onSuccess: (page) => setUnsavedPage(page),
          onError: (error) => setUnsavedError(error),
        },
      );
    };
    window.addEventListener("message", handlePreviewDocument);
    opener.postMessage({ type: "cms-preview-ready" }, origin);
    return () => window.removeEventListener("message", handlePreviewDocument);
  }, [authLoading, isUnsavedPreview, slug, user]);

  if (authLoading || !user) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f1efe9]"><Loader2 className="h-6 w-6 animate-spin text-[#5d5850]" /></div>;
  }
  if (user.role !== "developer") return null;
  const page = isUnsavedPreview ? unsavedPage : previewQuery.data;
  const previewError = isUnsavedPreview ? unsavedError : previewQuery.error;
  if ((isUnsavedPreview && !unsavedPage && !unsavedError) || (!isUnsavedPreview && previewQuery.isLoading)) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f1efe9]"><Loader2 className="h-6 w-6 animate-spin text-[#5d5850]" /></div>;
  }
  if (previewError || !page) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f1efe9] px-5">
        <div className="max-w-lg border border-[#d7b1a8] bg-[#f8e9e4] p-6 text-[#6e2c25]">
          <h1 className="font-bold">Could not load this {isUnsavedPreview ? "unsaved" : "draft"} preview</h1>
          <p className="mt-2 text-sm">{errorMessage(previewError)}</p>
          <Link href="/developer/cms" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline"><ArrowLeft className="h-4 w-4" /> Back to CMS editor</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f1efe9]">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[#d7d2c7] bg-[#1b1b1b] px-5 py-3 text-[#f8f7f2] md:px-8">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c7c2b8]">{isUnsavedPreview ? "Unsaved preview" : "Draft preview"}</p>
            <p className="text-sm font-semibold">{page.label} · {isUnsavedPreview ? "not saved or published" : "not public"}</p>
          </div>
        </div>
        <Link href="/developer/cms" className="inline-flex items-center gap-2 border border-[#777168] px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#33302c]" data-testid="link-back-to-cms-editor"><ArrowLeft className="h-3.5 w-3.5" /> Back to editor</Link>
      </div>
      {isUnsavedPreview && <div className="border-b border-[#d6bd75] bg-[#fff6d8] px-5 py-3 text-center text-sm font-semibold text-[#6a5214]" data-testid="cms-unsaved-preview-banner">Unsaved preview — these edits have not been saved or published, so the public page is unchanged.</div>}
      <CmsPreviewRenderer slug={page.slug} label={page.label} document={page.draft} />
    </div>
  );
}