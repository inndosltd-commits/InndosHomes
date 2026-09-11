   id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  getCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  getCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  getCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  getCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  getCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedAt: zod.coerce.date().nullable(),
  publishedBackupAt: zod.coerce.date().nullable(),
  updatedAt: zod.coerce.date(),
});

/**
 * @summary Save a website page draft
 */
export const UpdateCmsPageParams = zod.object({
  slug: zod.coerce.string(),
});

export const updateCmsPageBodyDraftSectionsItemSettingsLimitMax = 24;

export const updateCmsPageBodyDraftSectionsItemSettingsMapHeightMin = 320;
export const updateCmsPageBodyDraftSectionsItemSettingsMapHeightMax = 900;

export const updateCmsPageBodyDraftSectionsItemSettingsFormSubjectsMax = 20;

export const updateCmsPageBodyDraftSectionsItemSettingsMaxPriceMax = 1000000;

export const UpdateCmsPageBody = zod.object({
  draft: zod.object({
    templateKey: zod
      .enum([
        "home",
        "about",
        "contact",
        "pricing",
        "bnb",
        "terms",
        "privacy",
        "dashboard",
      ])
      .optional(),
    contentVersion: zod.number().optional(),
    pageTitle: zod.string(),
    metaDescription: zod.string(),
    backgroundColor: zod.string(),
    textColor: zod.string(),
    accentColor: zod.string(),
    sections: zod.array(
      zod.object({
        id: zod.string(),
        type: zod.enum(["hero", "content", "feature", "cta"]),
        label: zod.string(),
        eyebrow: zod.string(),
        title: zod.string(),
        body: zod.string(),
        buttonText: zod.string(),
        buttonHref: zod.string(),
        backgroundColor: zod.string(),
        textColor: zod.string(),
        accentColor: zod.string(),
        componentKey: zod
          .enum([
            "home-map-search",
            "home-process",
            "home-property-collection",
            "home-bnb-hotels",
          ])
          .optional(),
        settings: zod
          .object({
            componentKey: zod
              .enum([
                "home-map-search",
                "home-process",
                "home-property-collection",
                "home-bnb-hotels",
              ])
              .optional(),
            collectionType: zod
              .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
              .optional(),
            limit: zod
              .number()
              .min(1)
              .max(updateCmsPageBodyDraftSectionsItemSettingsLimitMax)
              .optional(),
            emptyStateText: zod.string().optional(),
            searchPlaceholder: zod.string().optional(),
            resultCountLabel: zod.string().optional(),
            showLocateButton: zod.boolean().optional(),
            mapHeight: zod
              .number()
              .min(updateCmsPageBodyDraftSectionsItemSettingsMapHeightMin)
              .max(updateCmsPageBodyDraftSectionsItemSettingsMapHeightMax)
              .optional(),
            formSubjects: zod
              .array(zod.string().min(1))
              .max(updateCmsPageBodyDraftSectionsItemSettingsFormSubjectsMax)
              .optional(),
            successTitle: zod.string().optional(),
            successText: zod.string().optional(),
            maxPrice: zod
              .number()
              .min(1)
              .max(updateCmsPageBodyDraftSectionsItemSettingsMaxPriceMax)
              .optional(),
            actions: zod
              .array(
                zod.object({
                  id: zod.string(),
                  label: zod.string(),
                  href: zod.string(),
                  placement: zod.enum(["header", "footer"]),
                  variant: zod.enum(["ghost", "primary", "outline"]),
                }),
              )
              .optional(),
          })
          .optional(),
        items: zod.array(
          zod.object({
            title: zod.string(),
            body: zod.string(),
            href: zod.string().optional(),
            imageSrc: zod.string().optional(),
            imageAlt: zod.string().optional(),
            iconKey: zod
              .enum(["search", "clipboard-list", "link", "home", "star", "bed"])
              .optional(),
            number: zod.string().optional(),
          }),
        ),
        visible: zod.boolean(),
      }),
    ),
  }),
});

export const updateCmsPageResponseDraftSectionsItemSettingsLimitMax = 24;

export const updateCmsPageResponseDraftSectionsItemSettingsMapHeightMin = 320;
export const updateCmsPageResponseDraftSectionsItemSettingsMapHeightMax = 900;

export const updateCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax = 20;

export const updateCmsPageResponseDraftSectionsItemSettingsMaxPriceMax = 1000000;

export const updateCmsPageResponsePublishedOneSectionsItemSettingsLimitMax = 24;

export const updateCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin = 320;
export const updateCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax = 900;

export const updateCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax = 20;

export const updateCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax = 1000000;

export const updateCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax = 24;

export const updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin = 320;
export const updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax = 900;

export const updateCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax = 20;

export const updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax = 1000000;

export const UpdateCmsPageResponse = zod.object({
  slug: zod.string(),
  label: zod.string(),
  draft: zod.object({
    templateKey: zod
      .enum([
        "home",
        "about",
        "contact",
        "pricing",
        "bnb",
        "terms",
        "privacy",
        "dashboard",
      ])
      .optional(),
    contentVersion: zod.number().optional(),
    pageTitle: zod.string(),
    metaDescription: zod.string(),
    backgroundColor: zod.string(),
    textColor: zod.string(),
    accentColor: zod.string(),
    sections: zod.array(
      zod.object({
        id: zod.string(),
        type: zod.enum(["hero", "content", "feature", "cta"]),
        label: zod.string(),
        eyebrow: zod.string(),
        title: zod.string(),
        body: zod.string(),
        buttonText: zod.string(),
        buttonHref: zod.string(),
        backgroundColor: zod.string(),
        textColor: zod.string(),
        accentColor: zod.string(),
        componentKey: zod
          .enum([
            "home-map-search",
            "home-process",
            "home-property-collection",
            "home-bnb-hotels",
          ])
          .optional(),
        settings: zod
          .object({
            componentKey: zod
              .enum([
                "home-map-search",
                "home-process",
                "home-property-collection",
                "home-bnb-hotels",
              ])
              .optional(),
            collectionType: zod
              .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
              .optional(),
            limit: zod
              .number()
              .min(1)
              .max(updateCmsPageResponseDraftSectionsItemSettingsLimitMax)
              .optional(),
            emptyStateText: zod.string().optional(),
            searchPlaceholder: zod.string().optional(),
            resultCountLabel: zod.string().optional(),
            showLocateButton: zod.boolean().optional(),
            mapHeight: zod
              .number()
              .min(updateCmsPageResponseDraftSectionsItemSettingsMapHeightMin)
              .max(updateCmsPageResponseDraftSectionsItemSettingsMapHeightMax)
              .optional(),
            formSubjects: zod
              .array(zod.string().min(1))
              .max(
                updateCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax,
              )
              .optional(),
            successTitle: zod.string().optional(),
            successText: zod.string().optional(),
            maxPrice: zod
              .number()
              .min(1)
              .max(updateCmsPageResponseDraftSectionsItemSettingsMaxPriceMax)
              .optional(),
            actions: zod
              .array(
                zod.object({
                  id: zod.string(),
                  label: zod.string(),
                  href: zod.string(),
                  placement: zod.enum(["header", "footer"]),
                  variant: zod.enum(["ghost", "primary", "outline"]),
                }),
              )
              .optional(),
          })
          .optional(),
        items: zod.array(
          zod.object({
            title: zod.string(),
            body: zod.string(),
            href: zod.string().optional(),
            imageSrc: zod.string().optional(),
            imageAlt: zod.string().optional(),
            iconKey: zod
              .enum(["search", "clipboard-list", "link", "home", "star", "bed"])
              .optional(),
            number: zod.string().optional(),
          }),
        ),
        visible: zod.boolean(),
      }),
    ),
  }),
  published: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  updateCmsPageResponsePublishedOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  updateCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  updateCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  updateCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  updateCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedBackup: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  updateCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  updateCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  updateCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedAt: zod.coerce.date().nullable(),
  publishedBackupAt: zod.coerce.date().nullable(),
  updatedAt: zod.coerce.date(),
});

/**
 * @summary Publish a website page draft
 */
export const PublishCmsPageParams = zod.object({
  slug: zod.coerce.string(),
});

export const publishCmsPageResponseDraftSectionsItemSettingsLimitMax = 24;

export const publishCmsPageResponseDraftSectionsItemSettingsMapHeightMin = 320;
export const publishCmsPageResponseDraftSectionsItemSettingsMapHeightMax = 900;

export const publishCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax = 20;

export const publishCmsPageResponseDraftSectionsItemSettingsMaxPriceMax = 1000000;

export const publishCmsPageResponsePublishedOneSectionsItemSettingsLimitMax = 24;

export const publishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin = 320;
export const publishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax = 900;

export const publishCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax = 20;

export const publishCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax = 1000000;

export const publishCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax = 24;

export const publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin = 320;
export const publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax = 900;

export const publishCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax = 20;

export const publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax = 1000000;

export const PublishCmsPageResponse = zod.object({
  slug: zod.string(),
  label: zod.string(),
  draft: zod.object({
    templateKey: zod
      .enum([
        "home",
        "about",
        "contact",
        "pricing",
        "bnb",
        "terms",
        "privacy",
        "dashboard",
      ])
      .optional(),
    contentVersion: zod.number().optional(),
    pageTitle: zod.string(),
    metaDescription: zod.string(),
    backgroundColor: zod.string(),
    textColor: zod.string(),
    accentColor: zod.string(),
    sections: zod.array(
      zod.object({
        id: zod.string(),
        type: zod.enum(["hero", "content", "feature", "cta"]),
        label: zod.string(),
        eyebrow: zod.string(),
        title: zod.string(),
        body: zod.string(),
        buttonText: zod.string(),
        buttonHref: zod.string(),
        backgroundColor: zod.string(),
        textColor: zod.string(),
        accentColor: zod.string(),
        componentKey: zod
          .enum([
            "home-map-search",
            "home-process",
            "home-property-collection",
            "home-bnb-hotels",
          ])
          .optional(),
        settings: zod
          .object({
            componentKey: zod
              .enum([
                "home-map-search",
                "home-process",
                "home-property-collection",
                "home-bnb-hotels",
              ])
              .optional(),
            collectionType: zod
              .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
              .optional(),
            limit: zod
              .number()
              .min(1)
              .max(publishCmsPageResponseDraftSectionsItemSettingsLimitMax)
              .optional(),
            emptyStateText: zod.string().optional(),
            searchPlaceholder: zod.string().optional(),
            resultCountLabel: zod.string().optional(),
            showLocateButton: zod.boolean().optional(),
            mapHeight: zod
              .number()
              .min(publishCmsPageResponseDraftSectionsItemSettingsMapHeightMin)
              .max(publishCmsPageResponseDraftSectionsItemSettingsMapHeightMax)
              .optional(),
            formSubjects: zod
              .array(zod.string().min(1))
              .max(
                publishCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax,
              )
              .optional(),
            successTitle: zod.string().optional(),
            successText: zod.string().optional(),
            maxPrice: zod
              .number()
              .min(1)
              .max(publishCmsPageResponseDraftSectionsItemSettingsMaxPriceMax)
              .optional(),
            actions: zod
              .array(
                zod.object({
                  id: zod.string(),
                  label: zod.string(),
                  href: zod.string(),
                  placement: zod.enum(["header", "footer"]),
                  variant: zod.enum(["ghost", "primary", "outline"]),
                }),
              )
              .optional(),
          })
          .optional(),
        items: zod.array(
          zod.object({
            title: zod.string(),
            body: zod.string(),
            href: zod.string().optional(),
            imageSrc: zod.string().optional(),
            imageAlt: zod.string().optional(),
            iconKey: zod
              .enum(["search", "clipboard-list", "link", "home", "star", "bed"])
              .optional(),
            number: zod.string().optional(),
          }),
        ),
        visible: zod.boolean(),
      }),
    ),
  }),
  published: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  publishCmsPageResponsePublishedOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  publishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  publishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  publishCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  publishCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedBackup: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  publishCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  publishCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  publishCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedAt: zod.coerce.date().nullable(),
  publishedBackupAt: zod.coerce.date().nullable(),
  updatedAt: zod.coerce.date(),
});

/**
 * @summary Remove the published website page and restore its legacy page
 */
export const UnpublishCmsPageParams = zod.object({
  slug: zod.coerce.string(),
});

export const unpublishCmsPageResponseDraftSectionsItemSettingsLimitMax = 24;

export const unpublishCmsPageResponseDraftSectionsItemSettingsMapHeightMin = 320;
export const unpublishCmsPageResponseDraftSectionsItemSettingsMapHeightMax = 900;

export const unpublishCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax = 20;

export const unpublishCmsPageResponseDraftSectionsItemSettingsMaxPriceMax = 1000000;

export const unpublishCmsPageResponsePublishedOneSectionsItemSettingsLimitMax = 24;

export const unpublishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin = 320;
export const unpublishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax = 900;

export const unpublishCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax = 20;

export const unpublishCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax = 1000000;

export const unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax = 24;

export const unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin = 320;
export const unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax = 900;

export const unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax = 20;

export const unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax = 1000000;

export const UnpublishCmsPageResponse = zod.object({
  slug: zod.string(),
  label: zod.string(),
  draft: zod.object({
    templateKey: zod
      .enum([
        "home",
        "about",
        "contact",
        "pricing",
        "bnb",
        "terms",
        "privacy",
        "dashboard",
      ])
      .optional(),
    contentVersion: zod.number().optional(),
    pageTitle: zod.string(),
    metaDescription: zod.string(),
    backgroundColor: zod.string(),
    textColor: zod.string(),
    accentColor: zod.string(),
    sections: zod.array(
      zod.object({
        id: zod.string(),
        type: zod.enum(["hero", "content", "feature", "cta"]),
        label: zod.string(),
        eyebrow: zod.string(),
        title: zod.string(),
        body: zod.string(),
        buttonText: zod.string(),
        buttonHref: zod.string(),
        backgroundColor: zod.string(),
        textColor: zod.string(),
        accentColor: zod.string(),
        componentKey: zod
          .enum([
            "home-map-search",
            "home-process",
            "home-property-collection",
            "home-bnb-hotels",
          ])
          .optional(),
        settings: zod
          .object({
            componentKey: zod
              .enum([
                "home-map-search",
                "home-process",
                "home-property-collection",
                "home-bnb-hotels",
              ])
              .optional(),
            collectionType: zod
              .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
              .optional(),
            limit: zod
              .number()
              .min(1)
              .max(unpublishCmsPageResponseDraftSectionsItemSettingsLimitMax)
              .optional(),
            emptyStateText: zod.string().optional(),
            searchPlaceholder: zod.string().optional(),
            resultCountLabel: zod.string().optional(),
            showLocateButton: zod.boolean().optional(),
            mapHeight: zod
              .number()
              .min(
                unpublishCmsPageResponseDraftSectionsItemSettingsMapHeightMin,
              )
              .max(
                unpublishCmsPageResponseDraftSectionsItemSettingsMapHeightMax,
              )
              .optional(),
            formSubjects: zod
              .array(zod.string().min(1))
              .max(
                unpublishCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax,
              )
              .optional(),
            successTitle: zod.string().optional(),
            successText: zod.string().optional(),
            maxPrice: zod
              .number()
              .min(1)
              .max(unpublishCmsPageResponseDraftSectionsItemSettingsMaxPriceMax)
              .optional(),
            actions: zod
              .array(
                zod.object({
                  id: zod.string(),
                  label: zod.string(),
                  href: zod.string(),
                  placement: zod.enum(["header", "footer"]),
                  variant: zod.enum(["ghost", "primary", "outline"]),
                }),
              )
              .optional(),
          })
          .optional(),
        items: zod.array(
          zod.object({
            title: zod.string(),
            body: zod.string(),
            href: zod.string().optional(),
            imageSrc: zod.string().optional(),
            imageAlt: zod.string().optional(),
            iconKey: zod
              .enum(["search", "clipboard-list", "link", "home", "star", "bed"])
              .optional(),
            number: zod.string().optional(),
          }),
        ),
        visible: zod.boolean(),
      }),
    ),
  }),
  published: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  unpublishCmsPageResponsePublishedOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  unpublishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  unpublishCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  unpublishCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  unpublishCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedBackup: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  unpublishCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedAt: zod.coerce.date().nullable(),
  publishedBackupAt: zod.coerce.date().nullable(),
  updatedAt: zod.coerce.date(),
});

/**
 * @summary Restore the website page version that was live before the last publish
 */
export const RestoreCmsPageParams = zod.object({
  slug: zod.coerce.string(),
});

export const restoreCmsPageResponseDraftSectionsItemSettingsLimitMax = 24;

export const restoreCmsPageResponseDraftSectionsItemSettingsMapHeightMin = 320;
export const restoreCmsPageResponseDraftSectionsItemSettingsMapHeightMax = 900;

export const restoreCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax = 20;

export const restoreCmsPageResponseDraftSectionsItemSettingsMaxPriceMax = 1000000;

export const restoreCmsPageResponsePublishedOneSectionsItemSettingsLimitMax = 24;

export const restoreCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin = 320;
export const restoreCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax = 900;

export const restoreCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax = 20;

export const restoreCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax = 1000000;

export const restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax = 24;

export const restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin = 320;
export const restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax = 900;

export const restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax = 20;

export const restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax = 1000000;

export const RestoreCmsPageResponse = zod.object({
  slug: zod.string(),
  label: zod.string(),
  draft: zod.object({
    templateKey: zod
      .enum([
        "home",
        "about",
        "contact",
        "pricing",
        "bnb",
        "terms",
        "privacy",
        "dashboard",
      ])
      .optional(),
    contentVersion: zod.number().optional(),
    pageTitle: zod.string(),
    metaDescription: zod.string(),
    backgroundColor: zod.string(),
    textColor: zod.string(),
    accentColor: zod.string(),
    sections: zod.array(
      zod.object({
        id: zod.string(),
        type: zod.enum(["hero", "content", "feature", "cta"]),
        label: zod.string(),
        eyebrow: zod.string(),
        title: zod.string(),
        body: zod.string(),
        buttonText: zod.string(),
        buttonHref: zod.string(),
        backgroundColor: zod.string(),
        textColor: zod.string(),
        accentColor: zod.string(),
        componentKey: zod
          .enum([
            "home-map-search",
            "home-process",
            "home-property-collection",
            "home-bnb-hotels",
          ])
          .optional(),
        settings: zod
          .object({
            componentKey: zod
              .enum([
                "home-map-search",
                "home-process",
                "home-property-collection",
                "home-bnb-hotels",
              ])
              .optional(),
            collectionType: zod
              .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
              .optional(),
            limit: zod
              .number()
              .min(1)
              .max(restoreCmsPageResponseDraftSectionsItemSettingsLimitMax)
              .optional(),
            emptyStateText: zod.string().optional(),
            searchPlaceholder: zod.string().optional(),
            resultCountLabel: zod.string().optional(),
            showLocateButton: zod.boolean().optional(),
            mapHeight: zod
              .number()
              .min(restoreCmsPageResponseDraftSectionsItemSettingsMapHeightMin)
              .max(restoreCmsPageResponseDraftSectionsItemSettingsMapHeightMax)
              .optional(),
            formSubjects: zod
              .array(zod.string().min(1))
              .max(
                restoreCmsPageResponseDraftSectionsItemSettingsFormSubjectsMax,
              )
              .optional(),
            successTitle: zod.string().optional(),
            successText: zod.string().optional(),
            maxPrice: zod
              .number()
              .min(1)
              .max(restoreCmsPageResponseDraftSectionsItemSettingsMaxPriceMax)
              .optional(),
            actions: zod
              .array(
                zod.object({
                  id: zod.string(),
                  label: zod.string(),
                  href: zod.string(),
                  placement: zod.enum(["header", "footer"]),
                  variant: zod.enum(["ghost", "primary", "outline"]),
                }),
              )
              .optional(),
          })
          .optional(),
        items: zod.array(
          zod.object({
            title: zod.string(),
            body: zod.string(),
            href: zod.string().optional(),
            imageSrc: zod.string().optional(),
            imageAlt: zod.string().optional(),
            iconKey: zod
              .enum(["search", "clipboard-list", "link", "home", "star", "bed"])
              .optional(),
            number: zod.string().optional(),
          }),
        ),
        visible: zod.boolean(),
      }),
    ),
  }),
  published: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  restoreCmsPageResponsePublishedOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  restoreCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  restoreCmsPageResponsePublishedOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  restoreCmsPageResponsePublishedOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  restoreCmsPageResponsePublishedOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedBackup: zod
    .object({
      templateKey: zod
        .enum([
          "home",
          "about",
          "contact",
          "pricing",
          "bnb",
          "terms",
          "privacy",
          "dashboard",
        ])
        .optional(),
      contentVersion: zod.number().optional(),
      pageTitle: zod.string(),
      metaDescription: zod.string(),
      backgroundColor: zod.string(),
      textColor: zod.string(),
      accentColor: zod.string(),
      sections: zod.array(
        zod.object({
          id: zod.string(),
          type: zod.enum(["hero", "content", "feature", "cta"]),
          label: zod.string(),
          eyebrow: zod.string(),
          title: zod.string(),
          body: zod.string(),
          buttonText: zod.string(),
          buttonHref: zod.string(),
          backgroundColor: zod.string(),
          textColor: zod.string(),
          accentColor: zod.string(),
          componentKey: zod
            .enum([
              "home-map-search",
              "home-process",
              "home-property-collection",
              "home-bnb-hotels",
            ])
            .optional(),
          settings: zod
            .object({
              componentKey: zod
                .enum([
                  "home-map-search",
                  "home-process",
                  "home-property-collection",
                  "home-bnb-hotels",
                ])
                .optional(),
              collectionType: zod
                .enum(["featured", "all", "rent", "sale", "bnb-hotels"])
                .optional(),
              limit: zod
                .number()
                .min(1)
                .max(
                  restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsLimitMax,
                )
                .optional(),
              emptyStateText: zod.string().optional(),
              searchPlaceholder: zod.string().optional(),
              resultCountLabel: zod.string().optional(),
              showLocateButton: zod.boolean().optional(),
              mapHeight: zod
                .number()
                .min(
                  restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMin,
                )
                .max(
                  restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMapHeightMax,
                )
                .optional(),
              formSubjects: zod
                .array(zod.string().min(1))
                .max(
                  restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsFormSubjectsMax,
                )
                .optional(),
              successTitle: zod.string().optional(),
              successText: zod.string().optional(),
              maxPrice: zod
                .number()
                .min(1)
                .max(
                  restoreCmsPageResponsePublishedBackupOneSectionsItemSettingsMaxPriceMax,
                )
                .optional(),
              actions: zod
                .array(
                  zod.object({
                    id: zod.string(),
                    label: zod.string(),
                    href: zod.string(),
                    placement: zod.enum(["header", "footer"]),
                    variant: zod.enum(["ghost", "primary", "outline"]),
                  }),
                )
                .optional(),
            })
            .optional(),
          items: zod.array(
            zod.object({
              title: zod.string(),
              body: zod.string(),
              href: zod.string().optional(),
              imageSrc: zod.string().optional(),
              imageAlt: zod.string().optional(),
              iconKey: zod
                .enum([
                  "search",
                  "clipboard-list",
                  "link",
                  "home",
                  "star",
                  "bed",
                ])
                .optional(),
              number: zod.string().optional(),
            }),
          ),
          visible: zod.boolean(),
        }),
      ),
    })
    .nullable(),
  publishedAt: zod.coerce.date().nullable(),
  publishedBackupAt: zod.coerce.date().nullable(),
  updatedAt: zod.coerce.date(),
});
