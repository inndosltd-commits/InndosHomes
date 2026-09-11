import { useGetPublicCmsPage, getGetPublicCmsPageQueryKey } from "@workspace/api-client-react";
import type { CmsPublicPage } from "@workspace/api-client-react";

export function usePublicCmsDocument(slug: string) {
  const result = useGetPublicCmsPage(slug, {
    query: {
      queryKey: getGetPublicCmsPageQueryKey(slug),
      retry: false,
      staleTime: 60_000,
    },
  });
  return { ...result, page: result.data ?? null, document: result.data?.published ?? null };
}

/**
 * Keep the legacy page visible until the CMS has a published document.
 *
 * A draft is intentionally not enough to replace public content. Keeping this
 * decision in one shared helper prevents individual public pages from drifting
 * into exposing drafts or treating an unpublished page as live.
 */
export function isPublishedCmsPage(page: CmsPublicPage | null | undefined): page is CmsPublicPage {
  return Boolean(page?.published);
}