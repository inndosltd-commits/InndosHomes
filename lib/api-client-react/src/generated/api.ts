UseQueryOptions<
    Awaited<ReturnType<typeof getPropertyAvailability>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetPropertyAvailabilityQueryResult = NonNullable<
  Awaited<ReturnType<typeof getPropertyAvailability>>
>;
export type GetPropertyAvailabilityQueryError = ErrorType<void>;

/**
 * @summary Get booked date ranges for a property
 */

export function useGetPropertyAvailability<
  TData = Awaited<ReturnType<typeof getPropertyAvailability>>,
  TError = ErrorType<void>,
>(
  id: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPropertyAvailability>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetPropertyAvailabilityQueryOptions(id, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Deactivate, reactivate, or mark an eligible sale listing as sold
 */
export const getUpdatePropertyStatusUrl = (id: string) => {
  return `/api/properties/${id}/status`;
};

export const updatePropertyStatus = async (
  id: string,
  propertyStatusActionInput: PropertyStatusActionInput,
  options?: RequestInit,
): Promise<Property> => {
  return customFetch<Property>(getUpdatePropertyStatusUrl(id), {
    ...options,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(propertyStatusActionInput),
  });
};

export const getUpdatePropertyStatusMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updatePropertyStatus>>,
    TError,
    { id: string; data: BodyType<PropertyStatusActionInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof updatePropertyStatus>>,
  TError,
  { id: string; data: BodyType<PropertyStatusActionInput> },
  TContext
> => {
  const mutationKey = ["updatePropertyStatus"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof updatePropertyStatus>>,
    { id: string; data: BodyType<PropertyStatusActionInput> }
  > = (props) => {
    const { id, data } = props ?? {};

    return updatePropertyStatus(id, data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type UpdatePropertyStatusMutationResult = NonNullable<
  Awaited<ReturnType<typeof updatePropertyStatus>>
>;
export type UpdatePropertyStatusMutationBody =
  BodyType<PropertyStatusActionInput>;
export type UpdatePropertyStatusMutationError = ErrorType<unknown>;

/**
 * @summary Deactivate, reactivate, or mark an eligible sale listing as sold
 */
export const useUpdatePropertyStatus = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updatePropertyStatus>>,
    TError,
    { id: string; data: BodyType<PropertyStatusActionInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof updatePropertyStatus>>,
  TError,
  { id: string; data: BodyType<PropertyStatusActionInput> },
  TContext
> => {
  return useMutation(getUpdatePropertyStatusMutationOptions(options));
};

/**
 * @summary Get a non-sale property's private management calendar and Link-Up history
 */
export const getGetPropertyManagementCalendarUrl = (id: string) => {
  return `/api/properties/${id}/management-calendar`;
};

export const getPropertyManagementCalendar = async (
  id: string,
  options?: RequestInit,
): Promise<PropertyManagementCalendar> => {
  return customFetch<PropertyManagementCalendar>(
    getGetPropertyManagementCalendarUrl(id),
    {
      ...options,
      method: "GET",
    },
  );
};

export const getGetPropertyManagementCalendarQueryKey = (id: string) => {
  return [`/api/properties/${id}/management-calendar`] as const;
};

export const getGetPropertyManagementCalendarQueryOptions = <
  TData = Awaited<ReturnType<typeof getPropertyManagementCalendar>>,
  TError = ErrorType<unknown>,
>(
  id: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPropertyManagementCalendar>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey =
    queryOptions?.queryKey ?? getGetPropertyManagementCalendarQueryKey(id);

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getPropertyManagementCalendar>>
  > = ({ signal }) =>
    getPropertyManagementCalendar(id, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!id,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getPropertyManagementCalendar>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetPropertyManagementCalendarQueryResult = NonNullable<
  Awaited<ReturnType<typeof getPropertyManagementCalendar>>
>;
export type GetPropertyManagementCalendarQueryError = ErrorType<unknown>;

/**
 * @summary Get a non-sale property's private management calendar and Link-Up history
 */

export function useGetPropertyManagementCalendar<
  TData = Awaited<ReturnType<typeof getPropertyManagementCalendar>>,
  TError = ErrorType<unknown>,
>(
  id: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPropertyManagementCalendar>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetPropertyManagementCalendarQueryOptions(
    id,
    options,
  );

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Add a private owner date or note to a non-sale property
 */
export const getCreatePropertyManagementCalendarEntryUrl = (id: string) => {
  return `/api/properties/${id}/management-calendar`;
};

export const createPropertyManagementCalendarEntry = async (
  id: string,
  propertyManagementCalendarEntryInput: PropertyManagementCalendarEntryInput,
  options?: RequestInit,
): Promise<PropertyManagementCalendarEntry> => {
  return customFetch<PropertyManagementCalendarEntry>(
    getCreatePropertyManagementCalendarEntryUrl(id),
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(propertyManagementCalendarEntryInput),
    },
  );
};

export const getCreatePropertyManagementCalendarEntryMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>,
    TError,
    { id: string; data: BodyType<PropertyManagementCalendarEntryInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>,
  TError,
  { id: string; data: BodyType<PropertyManagementCalendarEntryInput> },
  TContext
> => {
  const mutationKey = ["createPropertyManagementCalendarEntry"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>,
    { id: string; data: BodyType<PropertyManagementCalendarEntryInput> }
  > = (props) => {
    const { id, data } = props ?? {};

    return createPropertyManagementCalendarEntry(id, data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type CreatePropertyManagementCalendarEntryMutationResult = NonNullable<
  Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>
>;
export type CreatePropertyManagementCalendarEntryMutationBody =
  BodyType<PropertyManagementCalendarEntryInput>;
export type CreatePropertyManagementCalendarEntryMutationError =
  ErrorType<unknown>;

/**
 * @summary Add a private owner date or note to a non-sale property
 */
export const useCreatePropertyManagementCalendarEntry = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>,
    TError,
    { id: string; data: BodyType<PropertyManagementCalendarEntryInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof createPropertyManagementCalendarEntry>>,
  TError,
  { id: string; data: BodyType<PropertyManagementCalendarEntryInput> },
  TContext
> => {
  return useMutation(
    getCreatePropertyManagementCalendarEntryMutationOptions(options),
  );
};

/**
 * @summary Delete an owner-entered private management calendar entry
 */
export const getDeletePropertyManagementCalendarEntryUrl = (
  id: string,
  entryId: string,
) => {
  return `/api/properties/${id}/management-calendar/${entryId}`;
};

export const deletePropertyManagementCalendarEntry = async (
  id: string,
  entryId: string,
  options?: RequestInit,
): Promise<void> => {
  return customFetch<void>(
    getDeletePropertyManagementCalendarEntryUrl(id, entryId),
    {
      ...options,
      method: "DELETE",
    },
  );
};

export const getDeletePropertyManagementCalendarEntryMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>,
    TError,
    { id: string; entryId: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>,
  TError,
  { id: string; entryId: string },
  TContext
> => {
  const mutationKey = ["deletePropertyManagementCalendarEntry"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>,
    { id: string; entryId: string }
  > = (props) => {
    const { id, entryId } = props ?? {};

    return deletePropertyManagementCalendarEntry(id, entryId, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type DeletePropertyManagementCalendarEntryMutationResult = NonNullable<
  Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>
>;

export type DeletePropertyManagementCalendarEntryMutationError =
  ErrorType<unknown>;

/**
 * @summary Delete an owner-entered private management calendar entry
 */
export const useDeletePropertyManagementCalendarEntry = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>,
    TError,
    { id: string; entryId: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof deletePropertyManagementCalendarEntry>>,
  TError,
  { id: string; entryId: string },
  TContext
> => {
  return useMutation(
    getDeletePropertyManagementCalendarEntryMutationOptions(options),
  );
};

/**
 * Returns a short-lived presigned GCS URL for an authenticated upload.
The server validates file metadata, account eligibility, request rate,
and listing-video plan access before issuing the URL.

 * @summary Request a presigned URL for file upload
 */
export const getRequestUploadUrlUrl = () => {
  return `/api/storage/uploads/request-url`;
};

export const requestUploadUrl = async (
  uploadUrlRequest: UploadUrlRequest,
  options?: RequestInit,
): Promise<UploadUrlResponse> => {
  return customFetch<UploadUrlResponse>(getRequestUploadUrlUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(uploadUrlRequest),
  });
};

export const getRequestUploadUrlMutationOptions = <
  TError = ErrorType<ErrorEnvelope | void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof requestUploadUrl>>,
    TError,
    { data: BodyType<UploadUrlRequest> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof requestUploadUrl>>,
  TError,
  { data: BodyType<UploadUrlRequest> },
  TContext
> => {
  const mutationKey = ["requestUploadUrl"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof requestUploadUrl>>,
    { data: BodyType<UploadUrlRequest> }
  > = (props) => {
    const { data } = props ?? {};

    return requestUploadUrl(data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type RequestUploadUrlMutationResult = NonNullable<
  Awaited<ReturnType<typeof requestUploadUrl>>
>;
export type RequestUploadUrlMutationBody = BodyType<UploadUrlRequest>;
export type RequestUploadUrlMutationError = ErrorType<ErrorEnvelope | void>;

/**
 * @summary Request a presigned URL for file upload
 */
export const useRequestUploadUrl = <
  TError = ErrorType<ErrorEnvelope | void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof requestUploadUrl>>,
    TError,
    { data: BodyType<UploadUrlRequest> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof requestUploadUrl>>,
  TError,
  { data: BodyType<UploadUrlRequest> },
  TContext
> => {
  return useMutation(getRequestUploadUrlMutationOptions(options));
};

/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export const getGetPublicObjectUrl = (filePath: string) => {
  return `/api/storage/public-objects/${filePath}`;
};

export const getPublicObject = async (
  filePath: string,
  options?: RequestInit,
): Promise<Blob> => {
  return customFetch<Blob>(getGetPublicObjectUrl(filePath), {
    ...options,
    method: "GET",
  });
};

export const getGetPublicObjectQueryKey = (filePath: string) => {
  return [`/api/storage/public-objects/${filePath}`] as const;
};

export const getGetPublicObjectQueryOptions = <
  TData = Awaited<ReturnType<typeof getPublicObject>>,
  TError = ErrorType<ErrorEnvelope>,
>(
  filePath: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPublicObject>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey =
    queryOptions?.queryKey ?? getGetPublicObjectQueryKey(filePath);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof getPublicObject>>> = ({
    signal,
  }) => getPublicObject(filePath, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!filePath,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getPublicObject>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetPublicObjectQueryResult = NonNullable<
  Awaited<ReturnType<typeof getPublicObject>>
>;
export type GetPublicObjectQueryError = ErrorType<ErrorEnvelope>;

/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */

export function useGetPublicObject<
  TData = Awaited<ReturnType<typeof getPublicObject>>,
  TError = ErrorType<ErrorEnvelope>,
>(
  filePath: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPublicObject>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetPublicObjectQueryOptions(filePath, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export const getGetStorageObjectUrl = (objectPath: string) => {
  return `/api/storage/objects/${objectPath}`;
};

export const getStorageObject = async (
  objectPath: string,
  options?: RequestInit,
): Promise<Blob> => {
  return customFetch<Blob>(getGetStorageObjectUrl(objectPath), {
    ...options,
    method: "GET",
  });
};

export const getGetStorageObjectQueryKey = (objectPath: string) => {
  return [`/api/storage/objects/${objectPath}`] as const;
};

export const getGetStorageObjectQueryOptions = <
  TData = Awaited<ReturnType<typeof getStorageObject>>,
  TError = ErrorType<ErrorEnvelope>,
>(
  objectPath: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getStorageObject>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey =
    queryOptions?.queryKey ?? getGetStorageObjectQueryKey(objectPath);

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getStorageObject>>
  > = ({ signal }) =>
    getStorageObject(objectPath, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!objectPath,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getStorageObject>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetStorageObjectQueryResult = NonNullable<
  Awaited<ReturnType<typeof getStorageObject>>
>;
export type GetStorageObjectQueryError = ErrorType<ErrorEnvelope>;

/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */

export function useGetStorageObject<
  TData = Awaited<ReturnType<typeof getStorageObject>>,
  TError = ErrorType<ErrorEnvelope>,
>(
  objectPath: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getStorageObject>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetStorageObjectQueryOptions(objectPath, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List current user's favorited properties
 */
export const getListFavoritesUrl = () => {
  return `/api/favorites`;
};

export const listFavorites = async (
  options?: RequestInit,
): Promise<Property[]> => {
  return customFetch<Property[]>(getListFavoritesUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListFavoritesQueryKey = () => {
  return [`/api/favorites`] as const;
};

export const getListFavoritesQueryOptions = <
  TData = Awaited<ReturnType<typeof listFavorites>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listFavorites>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getListFavoritesQueryKey();

  const queryFn: QueryFunction<Awaited<ReturnType<typeof listFavorites>>> = ({
    signal,
  }) => listFavorites({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listFavorites>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type ListFavoritesQueryResult = NonNullable<
  Awaited<ReturnType<typeof listFavorites>>
>;
export type ListFavoritesQueryError = ErrorType<unknown>;

/**
 * @summary List current user's favorited properties
 */

export function useListFavorites<
  TData = Awaited<ReturnType<typeof listFavorites>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listFavorites>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListFavoritesQueryOptions(options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Add a property to favorites
 */
export const getAddFavoriteUrl = () => {
  return `/api/favorites`;
};

export const addFavorite = async (
  favoriteInput: FavoriteInput,
  options?: RequestInit,
): Promise<FavoriteStatus> => {
  return customFetch<FavoriteStatus>(getAddFavoriteUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(favoriteInput),
  });
};

export const getAddFavoriteMutationOptions = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof addFavorite>>,
    TError,
    { data: BodyType<FavoriteInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof addFavorite>>,
  TError,
  { data: BodyType<FavoriteInput> },
  TContext
> => {
  const mutationKey = ["addFavorite"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof addFavorite>>,
    { data: BodyType<FavoriteInput> }
  > = (props) => {
    const { data } = props ?? {};

    return addFavorite(data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type AddFavoriteMutationResult = NonNullable<
  Awaited<ReturnType<typeof addFavorite>>
>;
export type AddFavoriteMutationBody = BodyType<FavoriteInput>;
export type AddFavoriteMutationError = ErrorType<void>;

/**
 * @summary Add a property to favorites
 */
export const useAddFavorite = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof addFavorite>>,
    TError,
    { data: BodyType<FavoriteInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof addFavorite>>,
  TError,
  { data: BodyType<FavoriteInput> },
  TContext
> => {
  return useMutation(getAddFavoriteMutationOptions(options));
};

/**
 * @summary Remove a property from favorites
 */
export const getRemoveFavoriteUrl = (propertyId: string) => {
  return `/api/favorites/${propertyId}`;
};

export const removeFavorite = async (
  propertyId: string,
  options?: RequestInit,
): Promise<FavoriteStatus> => {
  return customFetch<FavoriteStatus>(getRemoveFavoriteUrl(propertyId), {
    ...options,
    method: "DELETE",
  });
};

export const getRemoveFavoriteMutationOptions = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof removeFavorite>>,
    TError,
    { propertyId: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof removeFavorite>>,
  TError,
  { propertyId: string },
  TContext
> => {
  const mutationKey = ["removeFavorite"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof removeFavorite>>,
    { propertyId: string }
  > = (props) => {
    const { propertyId } = props ?? {};

    return removeFavorite(propertyId, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type RemoveFavoriteMutationResult = NonNullable<
  Awaited<ReturnType<typeof removeFavorite>>
>;

export type RemoveFavoriteMutationError = ErrorType<void>;

/**
 * @summary Remove a property from favorites
 */
export const useRemoveFavorite = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof removeFavorite>>,
    TError,
    { propertyId: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof removeFavorite>>,
  TError,
  { propertyId: string },
  TContext
> => {
  return useMutation(getRemoveFavoriteMutationOptions(options));
};

/**
 * @summary Check if a property is in favorites
 */
export const getCheckFavoriteUrl = (propertyId: string) => {
  return `/api/favorites/check/${propertyId}`;
};

export const checkFavorite = async (
  propertyId: string,
  options?: RequestInit,
): Promise<FavoriteStatus> => {
  return customFetch<FavoriteStatus>(getCheckFavoriteUrl(propertyId), {
    ...options,
    method: "GET",
  });
};

export const getCheckFavoriteQueryKey = (propertyId: string) => {
  return [`/api/favorites/check/${propertyId}`] as const;
};

export const getCheckFavoriteQueryOptions = <
  TData = Awaited<ReturnType<typeof checkFavorite>>,
  TError = ErrorType<unknown>,
>(
  propertyId: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof checkFavorite>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey =
    queryOptions?.queryKey ?? getCheckFavoriteQueryKey(propertyId);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof checkFavorite>>> = ({
    signal,
  }) => checkFavorite(propertyId, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!propertyId,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof checkFavorite>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type CheckFavoriteQueryResult = NonNullable<
  Awaited<ReturnType<typeof checkFavorite>>
>;
export type CheckFavoriteQueryError = ErrorType<unknown>;

/**
 * @summary Check if a property is in favorites
 */

export function useCheckFavorite<
  TData = Awaited<ReturnType<typeof checkFavorite>>,
  TError = ErrorType<unknown>,
>(
  propertyId: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof checkFavorite>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getCheckFavoriteQueryOptions(propertyId, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary List current user's bookings
 */
export const getListBookingsUrl = () => {
  return `/api/bookings`;
};

export const listBookings = async (
  options?: RequestInit,
): Promise<Booking[]> => {
  return customFetch<Booking[]>(getListBookingsUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListBookingsQueryKey = () => {
  return [`/api/bookings`] as const;
};

export const getListBookingsQueryOptions = <
  TData = Awaited<ReturnType<typeof listBookings>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listBookings>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getListBookingsQueryKey();

  const queryFn: QueryFunction<Awaited<ReturnType<typeof listBookings>>> = ({
    signal,
  }) => listBookings({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listBookings>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type ListBookingsQueryResult = NonNullable<
  Awaited<ReturnType<typeof listBookings>>
>;
export type ListBookingsQueryError = ErrorType<unknown>;

/**
 * @summary List current user's bookings
 */

export function useListBookings<
  TData = Awaited<ReturnType<typeof listBookings>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listBookings>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListBookingsQueryOptions(options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Create a booking
 */
export const getCreateBookingUrl = () => {
  return `/api/bookings`;
};

export const createBooking = async (
  createBookingInput: CreateBookingInput,
  options?: RequestInit,
): Promise<Booking> => {
  return customFetch<Booking>(getCreateBookingUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(createBookingInput),
  });
};

export const getCreateBookingMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createBooking>>,
    TError,
    { data: BodyType<CreateBookingInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof createBooking>>,
  TError,
  { data: BodyType<CreateBookingInput> },
  TContext
> => {
  const mutationKey = ["createBooking"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof createBooking>>,
    { data: BodyType<CreateBookingInput> }
  > = (props) => {
    const { data } = props ?? {};

    return createBooking(data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type CreateBookingMutationResult = NonNullable<
  Awaited<ReturnType<typeof createBooking>>
>;
export type CreateBookingMutationBody = BodyType<CreateBookingInput>;
export type CreateBookingMutationError = ErrorType<unknown>;

/**
 * @summary Create a booking
 */
export const useCreateBooking = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createBooking>>,
    TError,
    { data: BodyType<CreateBookingInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof createBooking>>,
  TError,
  { data: BodyType<CreateBookingInput> },
  TContext
> => {
  return useMutation(getCreateBookingMutationOptions(options));
};

/**
 * @summary List Link-Ups received on the current lister's properties
 */
export const getListReceivedBookingsUrl = () => {
  return `/api/bookings/received`;
};

export const listReceivedBookings = async (
  options?: RequestInit,
): Promise<Booking[]> => {
  return customFetch<Booking[]>(getListReceivedBookingsUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListReceivedBookingsQueryKey = () => {
  return [`/api/bookings/received`] as const;
};

export const getListReceivedBookingsQueryOptions = <
  TData = Awaited<ReturnType<typeof listReceivedBookings>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listReceivedBookings>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getListReceivedBookingsQueryKey();

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof listReceivedBookings>>
  > = ({ signal }) => listReceivedBookings({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listReceivedBookings>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type ListReceivedBookingsQueryResult = NonNullable<
  Awaited<ReturnType<typeof listReceivedBookings>>
>;
export type ListReceivedBookingsQueryError = ErrorType<unknown>;

/**
 * @summary List Link-Ups received on the current lister's properties
 */

export function useListReceivedBookings<
  TData = Awaited<ReturnType<typeof listReceivedBookings>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listReceivedBookings>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListReceivedBookingsQueryOptions(options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Cancel a booking
 */
export const getCancelBookingUrl = (id: string) => {
  return `/api/bookings/${id}/cancel`;
};

export const cancelBooking = async (
  id: string,
  options?: RequestInit,
): Promise<Booking> => {
  return customFetch<Booking>(getCancelBookingUrl(id), {
    ...options,
    method: "PATCH",
  });
};

export const getCancelBookingMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof cancelBooking>>,
    TError,
    { id: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof cancelBooking>>,
  TError,
  { id: string },
  TContext
> => {
  const mutationKey = ["cancelBooking"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof cancelBooking>>,
    { id: string }
  > = (props) => {
    const { id } = props ?? {};

    return cancelBooking(id, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type CancelBookingMutationResult = NonNullable<
  Awaited<ReturnType<typeof cancelBooking>>
>;

export type CancelBookingMutationError = ErrorType<unknown>;

/**
 * @summary Cancel a booking
 */
export const useCancelBooking = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof cancelBooking>>,
    TError,
    { id: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof cancelBooking>>,
  TError,
  { id: string },
  TContext
> => {
  return useMutation(getCancelBookingMutationOptions(options));
};

/**
 * @summary Get the signed-in user's subscription payment status
 */
export const getGetSubscriptionPaymentUrl = (paymentId: string) => {
  return `/api/subscriptions/payments/${paymentId}`;
};

export const getSubscriptionPayment = async (
  paymentId: string,
  options?: RequestInit,
): Promise<SubscriptionPayment> => {
  return customFetch<SubscriptionPayment>(
    getGetSubscriptionPaymentUrl(paymentId),
    {
      ...options,
      method: "GET",
    },
  );
};

export const getGetSubscriptionPaymentQueryKey = (paymentId: string) => {
  return [`/api/subscriptions/payments/${paymentId}`] as const;
};

export const getGetSubscriptionPaymentQueryOptions = <
  TData = Awaited<ReturnType<typeof getSubscriptionPayment>>,
  TError = ErrorType<unknown>,
>(
  paymentId: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getSubscriptionPayment>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey =
    queryOptions?.queryKey ?? getGetSubscriptionPaymentQueryKey(paymentId);

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getSubscriptionPayment>>
  > = ({ signal }) =>
    getSubscriptionPayment(paymentId, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!paymentId,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getSubscriptionPayment>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetSubscriptionPaymentQueryResult = NonNullable<
  Awaited<ReturnType<typeof getSubscriptionPayment>>
>;
export type GetSubscriptionPaymentQueryError = ErrorType<unknown>;

/**
 * @summary Get the signed-in user's subscription payment status
 */

export function useGetSubscriptionPayment<
  TData = Awaited<ReturnType<typeof getSubscriptionPayment>>,
  TError = ErrorType<unknown>,
>(
  paymentId: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getSubscriptionPayment>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetSubscriptionPaymentQueryOptions(
    paymentId,
    options,
  );

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get an administrator's selected user profile details
 */
export const getGetAdminUserProfileUrl = (id: string) => {
  return `/api/admin/users/${id}/profile`;
};

export const getAdminUserProfile = async (
  id: string,
  options?: RequestInit,
): Promise<AdminUserProfile> => {
  return customFetch<AdminUserProfile>(getGetAdminUserProfileUrl(id), {
    ...options,
    method: "GET",
  });
};

export const getGetAdminUserProfileQueryKey = (id: string) => {
  return [`/api/admin/users/${id}/profile`] as const;
};

export const getGetAdminUserProfileQueryOptions = <
  TData = Awaited<ReturnType<typeof getAdminUserProfile>>,
  TError = ErrorType<void>,
>(
  id: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getAdminUserProfile>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getGetAdminUserProfileQueryKey(id);

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getAdminUserProfile>>
  > = ({ signal }) => getAdminUserProfile(id, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!id,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getAdminUserProfile>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetAdminUserProfileQueryResult = NonNullable<
  Awaited<ReturnType<typeof getAdminUserProfile>>
>;
export type GetAdminUserProfileQueryError = ErrorType<void>;

/**
 * @summary Get an administrator's selected user profile details
 */

export function useGetAdminUserProfile<
  TData = Awaited<ReturnType<typeof getAdminUserProfile>>,
  TError = ErrorType<void>,
>(
  id: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getAdminUserProfile>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetAdminUserProfileQueryOptions(id, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a published website page
 */
export const getGetPublicCmsPageUrl = (slug: string) => {
  return `/api/cms/public/${slug}`;
};

export const getPublicCmsPage = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPublicPage> => {
  return customFetch<CmsPublicPage>(getGetPublicCmsPageUrl(slug), {
    ...options,
    method: "GET",
  });
};

export const getGetPublicCmsPageQueryKey = (slug: string) => {
  return [`/api/cms/public/${slug}`] as const;
};

export const getGetPublicCmsPageQueryOptions = <
  TData = Awaited<ReturnType<typeof getPublicCmsPage>>,
  TError = ErrorType<void>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPublicCmsPage>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getGetPublicCmsPageQueryKey(slug);

  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getPublicCmsPage>>
  > = ({ signal }) => getPublicCmsPage(slug, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!slug,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getPublicCmsPage>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetPublicCmsPageQueryResult = NonNullable<
  Awaited<ReturnType<typeof getPublicCmsPage>>
>;
export type GetPublicCmsPageQueryError = ErrorType<void>;

/**
 * @summary Get a published website page
 */

export function useGetPublicCmsPage<
  TData = Awaited<ReturnType<typeof getPublicCmsPage>>,
  TError = ErrorType<void>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getPublicCmsPage>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetPublicCmsPageQueryOptions(slug, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a developer-only preview of a website page draft
 */
export const getGetCmsPreviewUrl = (slug: string) => {
  return `/api/cms/preview/${slug}`;
};

export const getCmsPreview = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPreviewPage> => {
  return customFetch<CmsPreviewPage>(getGetCmsPreviewUrl(slug), {
    ...options,
    method: "GET",
  });
};

export const getGetCmsPreviewQueryKey = (slug: string) => {
  return [`/api/cms/preview/${slug}`] as const;
};

export const getGetCmsPreviewQueryOptions = <
  TData = Awaited<ReturnType<typeof getCmsPreview>>,
  TError = ErrorType<void>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getCmsPreview>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getGetCmsPreviewQueryKey(slug);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof getCmsPreview>>> = ({
    signal,
  }) => getCmsPreview(slug, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!slug,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getCmsPreview>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetCmsPreviewQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCmsPreview>>
>;
export type GetCmsPreviewQueryError = ErrorType<void>;

/**
 * @summary Get a developer-only preview of a website page draft
 */

export function useGetCmsPreview<
  TData = Awaited<ReturnType<typeof getCmsPreview>>,
  TError = ErrorType<void>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getCmsPreview>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetCmsPreviewQueryOptions(slug, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Preview an unsaved website page draft
 */
export const getCreateCmsPreviewUrl = (slug: string) => {
  return `/api/cms/preview/${slug}`;
};

export const createCmsPreview = async (
  slug: string,
  cmsPreviewInput: CmsPreviewInput,
  options?: RequestInit,
): Promise<CmsPreviewPage> => {
  return customFetch<CmsPreviewPage>(getCreateCmsPreviewUrl(slug), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(cmsPreviewInput),
  });
};

export const getCreateCmsPreviewMutationOptions = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createCmsPreview>>,
    TError,
    { slug: string; data: BodyType<CmsPreviewInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof createCmsPreview>>,
  TError,
  { slug: string; data: BodyType<CmsPreviewInput> },
  TContext
> => {
  const mutationKey = ["createCmsPreview"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof createCmsPreview>>,
    { slug: string; data: BodyType<CmsPreviewInput> }
  > = (props) => {
    const { slug, data } = props ?? {};

    return createCmsPreview(slug, data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type CreateCmsPreviewMutationResult = NonNullable<
  Awaited<ReturnType<typeof createCmsPreview>>
>;
export type CreateCmsPreviewMutationBody = BodyType<CmsPreviewInput>;
export type CreateCmsPreviewMutationError = ErrorType<void>;

/**
 * @summary Preview an unsaved website page draft
 */
export const useCreateCmsPreview = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createCmsPreview>>,
    TError,
    { slug: string; data: BodyType<CmsPreviewInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof createCmsPreview>>,
  TError,
  { slug: string; data: BodyType<CmsPreviewInput> },
  TContext
> => {
  return useMutation(getCreateCmsPreviewMutationOptions(options));
};

/**
 * @summary List editable website pages
 */
export const getListCmsPagesUrl = () => {
  return `/api/cms/pages`;
};

export const listCmsPages = async (
  options?: RequestInit,
): Promise<CmsPage[]> => {
  return customFetch<CmsPage[]>(getListCmsPagesUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListCmsPagesQueryKey = () => {
  return [`/api/cms/pages`] as const;
};

export const getListCmsPagesQueryOptions = <
  TData = Awaited<ReturnType<typeof listCmsPages>>,
  TError = ErrorType<void>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listCmsPages>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getListCmsPagesQueryKey();

  const queryFn: QueryFunction<Awaited<ReturnType<typeof listCmsPages>>> = ({
    signal,
  }) => listCmsPages({ signal, ...requestOptions });

  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof listCmsPages>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type ListCmsPagesQueryResult = NonNullable<
  Awaited<ReturnType<typeof listCmsPages>>
>;
export type ListCmsPagesQueryError = ErrorType<void>;

/**
 * @summary List editable website pages
 */

export function useListCmsPages<
  TData = Awaited<ReturnType<typeof listCmsPages>>,
  TError = ErrorType<void>,
>(options?: {
  query?: UseQueryOptions<
    Awaited<ReturnType<typeof listCmsPages>>,
    TError,
    TData
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListCmsPagesQueryOptions(options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Get a website page draft
 */
export const getGetCmsPageUrl = (slug: string) => {
  return `/api/cms/pages/${slug}`;
};

export const getCmsPage = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPage> => {
  return customFetch<CmsPage>(getGetCmsPageUrl(slug), {
    ...options,
    method: "GET",
  });
};

export const getGetCmsPageQueryKey = (slug: string) => {
  return [`/api/cms/pages/${slug}`] as const;
};

export const getGetCmsPageQueryOptions = <
  TData = Awaited<ReturnType<typeof getCmsPage>>,
  TError = ErrorType<unknown>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getCmsPage>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};

  const queryKey = queryOptions?.queryKey ?? getGetCmsPageQueryKey(slug);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof getCmsPage>>> = ({
    signal,
  }) => getCmsPage(slug, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!slug,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getCmsPage>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetCmsPageQueryResult = NonNullable<
  Awaited<ReturnType<typeof getCmsPage>>
>;
export type GetCmsPageQueryError = ErrorType<unknown>;

/**
 * @summary Get a website page draft
 */

export function useGetCmsPage<
  TData = Awaited<ReturnType<typeof getCmsPage>>,
  TError = ErrorType<unknown>,
>(
  slug: string,
  options?: {
    query?: UseQueryOptions<
      Awaited<ReturnType<typeof getCmsPage>>,
      TError,
      TData
    >;
    request?: SecondParameter<typeof customFetch>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetCmsPageQueryOptions(slug, options);

  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
  };

  return { ...query, queryKey: queryOptions.queryKey };
}

/**
 * @summary Save a website page draft
 */
export const getUpdateCmsPageUrl = (slug: string) => {
  return `/api/cms/pages/${slug}`;
};

export const updateCmsPage = async (
  slug: string,
  updateCmsPageInput: UpdateCmsPageInput,
  options?: RequestInit,
): Promise<CmsPage> => {
  return customFetch<CmsPage>(getUpdateCmsPageUrl(slug), {
    ...options,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(updateCmsPageInput),
  });
};

export const getUpdateCmsPageMutationOptions = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateCmsPage>>,
    TError,
    { slug: string; data: BodyType<UpdateCmsPageInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof updateCmsPage>>,
  TError,
  { slug: string; data: BodyType<UpdateCmsPageInput> },
  TContext
> => {
  const mutationKey = ["updateCmsPage"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof updateCmsPage>>,
    { slug: string; data: BodyType<UpdateCmsPageInput> }
  > = (props) => {
    const { slug, data } = props ?? {};

    return updateCmsPage(slug, data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type UpdateCmsPageMutationResult = NonNullable<
  Awaited<ReturnType<typeof updateCmsPage>>
>;
export type UpdateCmsPageMutationBody = BodyType<UpdateCmsPageInput>;
export type UpdateCmsPageMutationError = ErrorType<void>;

/**
 * @summary Save a website page draft
 */
export const useUpdateCmsPage = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateCmsPage>>,
    TError,
    { slug: string; data: BodyType<UpdateCmsPageInput> },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof updateCmsPage>>,
  TError,
  { slug: string; data: BodyType<UpdateCmsPageInput> },
  TContext
> => {
  return useMutation(getUpdateCmsPageMutationOptions(options));
};

/**
 * @summary Publish a website page draft
 */
export const getPublishCmsPageUrl = (slug: string) => {
  return `/api/cms/pages/${slug}/publish`;
};

export const publishCmsPage = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPage> => {
  return customFetch<CmsPage>(getPublishCmsPageUrl(slug), {
    ...options,
    method: "POST",
  });
};

export const getPublishCmsPageMutationOptions = <
  TError = ErrorType<void | CmsPreviewRequiredError>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof publishCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof publishCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  const mutationKey = ["publishCmsPage"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof publishCmsPage>>,
    { slug: string }
  > = (props) => {
    const { slug } = props ?? {};

    return publishCmsPage(slug, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type PublishCmsPageMutationResult = NonNullable<
  Awaited<ReturnType<typeof publishCmsPage>>
>;

export type PublishCmsPageMutationError =
  ErrorType<void | CmsPreviewRequiredError>;

/**
 * @summary Publish a website page draft
 */
export const usePublishCmsPage = <
  TError = ErrorType<void | CmsPreviewRequiredError>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof publishCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof publishCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  return useMutation(getPublishCmsPageMutationOptions(options));
};

/**
 * @summary Remove the published website page and restore its legacy page
 */
export const getUnpublishCmsPageUrl = (slug: string) => {
  return `/api/cms/pages/${slug}/unpublish`;
};

export const unpublishCmsPage = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPage> => {
  return customFetch<CmsPage>(getUnpublishCmsPageUrl(slug), {
    ...options,
    method: "POST",
  });
};

export const getUnpublishCmsPageMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof unpublishCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof unpublishCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  const mutationKey = ["unpublishCmsPage"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof unpublishCmsPage>>,
    { slug: string }
  > = (props) => {
    const { slug } = props ?? {};

    return unpublishCmsPage(slug, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type UnpublishCmsPageMutationResult = NonNullable<
  Awaited<ReturnType<typeof unpublishCmsPage>>
>;

export type UnpublishCmsPageMutationError = ErrorType<unknown>;

/**
 * @summary Remove the published website page and restore its legacy page
 */
export const useUnpublishCmsPage = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof unpublishCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof unpublishCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  return useMutation(getUnpublishCmsPageMutationOptions(options));
};

/**
 * @summary Restore the website page version that was live before the last publish
 */
export const getRestoreCmsPageUrl = (slug: string) => {
  return `/api/cms/pages/${slug}/restore`;
};

export const restoreCmsPage = async (
  slug: string,
  options?: RequestInit,
): Promise<CmsPage> => {
  return customFetch<CmsPage>(getRestoreCmsPageUrl(slug), {
    ...options,
    method: "POST",
  });
};

export const getRestoreCmsPageMutationOptions = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof restoreCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<
  Awaited<ReturnType<typeof restoreCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  const mutationKey = ["restoreCmsPage"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation &&
      "mutationKey" in options.mutation &&
      options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof restoreCmsPage>>,
    { slug: string }
  > = (props) => {
    const { slug } = props ?? {};

    return restoreCmsPage(slug, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type RestoreCmsPageMutationResult = NonNullable<
  Awaited<ReturnType<typeof restoreCmsPage>>
>;

export type RestoreCmsPageMutationError = ErrorType<void>;

/**
 * @summary Restore the website page version that was live before the last publish
 */
export const useRestoreCmsPage = <
  TError = ErrorType<void>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof restoreCmsPage>>,
    TError,
    { slug: string },
    TContext
  >;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<
  Awaited<ReturnType<typeof restoreCmsPage>>,
  TError,
  { slug: string },
  TContext
> => {
  return useMutation(getRestoreCmsPageMutationOptions(options));
};
