 in to list a property</Text>
          <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>Only authenticated owners and hosts can add property listings</Text>
          <Pressable style={[styles.primaryBtn,{backgroundColor:colors.primary}]} onPress={()=>router.push("/(auth)/login")}>
            <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if(!canList) {
    const isTenant = user.role === "tenant" || user.role === "guest";
    return (
      <>
        <View style={[styles.container,{backgroundColor:colors.background}]}>
          <View style={[styles.header,{paddingTop:topPadding+16}]}>
            <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
          </View>
          <View style={styles.guestContainer}>
            <View style={[styles.iconCircle,{backgroundColor:colors.muted,borderColor:colors.border}]}>
              <Feather name={isTenant ? "repeat" : "lock"} size={40} color={colors.mutedForeground}/>
            </View>
            <Text style={[styles.guestTitle,{color:colors.foreground}]}>
              {isTenant ? "Switch account to list" : "Owner account required"}
            </Text>
            <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>
              {isTenant ? "Choose Property Owner or Host / Agency and start your listing immediately." : "Contact support to upgrade your account to owner or host."}
            </Text>
            {isTenant && (
              <Pressable
                style={[styles.primaryBtn,{backgroundColor:colors.primary}]}
                onPress={() => setShowUpgradeModal(true)}
                testID="open-account-upgrade"
              >
                <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>Switch Account</Text>
              </Pressable>
            )}
          </View>
        </View>
        {isTenant && (
          <AccountUpgradeModal
            visible={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onSuccess={() => router.replace("/(tabs)/list-property" as never)}
          />
        )}
      </>
    );
  }

  if (isEditing && editPropertyError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Edit Listing</Text>
        </View>
        <View style={styles.guestContainer}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Listing unavailable</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            We could not load this listing. Please return to My Listings and try again.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)/my-listings" as never)}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Back to My Listings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isEditing && (isLoadingProperty || loadedEditId !== editId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Edit Listing</Text>
        </View>
        <View style={styles.guestContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Loading your listing…
          </Text>
        </View>
      </View>
    );
  }

  if(submitted && !isEditing) {
    return (
      <View style={[styles.container,{backgroundColor:colors.background}]}>
        <View style={[styles.header,{paddingTop:topPadding+16}]}>
          <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle,{backgroundColor:"#dcfce7",borderColor:"#86efac"}]}>
            <Feather name="check-circle" size={40} color="#16a34a"/>
          </View>
          <Text style={[styles.guestTitle,{color:colors.foreground}]}>Listing Submitted!</Text>
          <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>Your property has been submitted for admin review. It will appear once approved.</Text>
          <Pressable style={[styles.primaryBtn,{backgroundColor:colors.primary}]} onPress={()=>setSubmitted(false)}>
            <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>List Another Property</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function setField<K extends keyof FormState>(key:K, value:FormState[K]) {
    setForm(prev=>({...prev,[key]:value}));
    if(errors[key]) setErrors(prev=>({...prev,[key]:undefined}));
  }

  function handleLocationChange(lat:string, lng:string) {
    setForm(prev=>({...prev,lat,lng}));
    setErrors(prev=>({...prev,lat:undefined,lng:undefined,location:undefined}));
  }

  function handleAddressResolved(resolved:string, options?:{replace?:boolean}) {
    setForm(prev=>{
      const canReplace = options?.replace || prev.address.trim()==="" || prev.address===pickerAddressRef.current;
      if(!canReplace) return prev;
      pickerAddressRef.current = resolved;
      return {...prev,address:resolved};
    });
    setErrors(prev=>({...prev,address:undefined}));
  }

  const toggleAmenity = (id:string)=>setSelectedAmenities(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  // ── Upload via presigned URL ───────────────────────────────────────────────
  // Contract: POST /api/storage/uploads/request-url  body { name, size, contentType }
  //           → response { uploadURL, objectPath }
  //           then PUT the local asset directly to uploadURL.
  //
  // iOS and Android picker URIs are local `file://` (and occasionally
  // `content://`) locations. Reading a video through fetch(...).blob() is
  // browser-oriented and can exhaust memory or fail before the upload begins.
  // Expo's native uploader streams the file instead.
  const uploadAsset = async (item: MediaItem): Promise<string|null>=>{
    const base = getApiBaseUrl();
    let size: number;
    let webBlob: Blob | undefined;

    if (Platform.OS === "web") {
      const blobRes = await fetch(item.uri);
      webBlob = await blobRes.blob();
      size = webBlob.size;
    } else {
      const info = await FileSystem.getInfoAsync(item.uri);
      if (!info.exists || info.isDirectory || !info.size) {
        throw new Error("The selected file is no longer available. Please choose it again.");
      }
      size = info.size;
    }

    const maxBytes = item.isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (size > maxBytes) {
      throw new Error(
        `${item.isVideo ? "Video" : "Photo"} exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`
      );
    }
    // Step 2: request presigned upload URL with exact contract.
    const reqRes = await fetch(`${base}/api/storage/uploads/request-url`,{
      method:"POST",
      headers:{Authorization:"Bearer "+(token||""),"Content-Type":"application/json"},
      body:JSON.stringify({name:item.fileName, size, contentType:item.mimeType}),
    });
    if(!reqRes.ok){
      const errorBody = await reqRes.json().catch(()=>null) as {error?:unknown}|null;
      throw new Error(
        typeof errorBody?.error === "string"
          ? errorBody.error
          : `Failed to prepare upload (HTTP ${reqRes.status})`
      );
    }
    const {uploadURL, objectPath} = await reqRes.json() as {uploadURL:string;objectPath:string};

    // Step 3: stream native files directly; retain browser fetch for web.
    if (Platform.OS === "web") {
      const putRes = await fetch(uploadURL,{
        method:"PUT",
        headers:{"Content-Type":item.mimeType},
        body:webBlob,
      });
      if(!putRes.ok){
        throw new Error(`Upload failed (HTTP ${putRes.status})`);
      }
    } else {
      const result = await FileSystem.uploadAsync(uploadURL, item.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {"Content-Type":item.mimeType},
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (HTTP ${result.status})`);
      }
    }
    return objectPath;
  };

  const currentPhotoCount = media.filter(m=>!m.isVideo).length;
  const currentVideoCount = media.filter(m=>m.isVideo).length;

  // Build a MediaItem from a picker asset, preserving mimeType & fileName.
  const toMediaItem = (a:ImagePicker.ImagePickerAsset, isVideo:boolean): MediaItem => {
    const ext = (a.fileName?.split(".").pop() || a.uri.split(".").pop() || (isVideo?"mp4":"jpg")).toLowerCase();
    const videoMimeByExtension:Record<string,string> = {
      "3g2":"video/3gpp2",
      "3gp":"video/3gpp",
      avi:"video/x-msvideo",
      flv:"video/x-flv",
      m4v:"video/x-m4v",
      mkv:"video/x-matroska",
      mov:"video/quicktime",
      mp4:"video/mp4",
      mpeg:"video/mpeg",
      mpg:"video/mpeg",
      ogv:"video/ogg",
      webm:"video/webm",
      wmv:"video/x-ms-wmv",
    };
    const fallbackMime = isVideo
      ? videoMimeByExtension[ext] ?? "application/octet-stream"
      : `image/${ext==="jpg"?"jpeg":ext}`;
    const pickerMime = a.mimeType?.toLowerCase().split(";")[0]?.trim();
    const mimeType = isVideo && (!pickerMime || pickerMime === "application/octet-stream")
      ? fallbackMime
      : pickerMime ?? fallbackMime;
    return {
      uri: a.uri,
      uploaded: null,
      isVideo,
      mimeType,
      fileName: a.fileName ?? (a.uri.split("/").pop() || `asset.${ext}`),
      durationSeconds: isVideo && typeof a.duration === "number" ? a.duration / 1000 : undefined,
      requiresTrim: isVideo,
    };
  };

  const addPickerAssets = async (assets:ImagePicker.ImagePickerAsset[], isVideo:boolean)=>{
    setIsUploading(true);
    const newItems: MediaItem[] = assets.map(a=>toMediaItem(a, isVideo));
    setMedia(prev=>[...prev,...newItems]);
    const uploadErrors: string[] = [];
    const results = await Promise.all(newItems.map(item=>
      uploadAsset(item).catch((error:unknown): null => {
        uploadErrors.push(error instanceof Error ? error.message : "The upload failed.");
        return null;
      })
    ));
    setMedia(prev=>{
      const updated=[...prev];
      let idx=updated.length-newItems.length;
      results.forEach(path=>{
        if(idx<updated.length){updated[idx]={...updated[idx],uploaded:path};idx++;}
      });
      return updated;
    });
    const failed=results.filter(u=>u===null).length;
    if(failed>0){
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Upload failed",
        uploadErrors[0] ?? `${failed} file(s) could not be uploaded. Please remove and try again.`
      );
    }
    setIsUploading(false);
    if (isVideo && results.some((path) => path !== null)) {
      // Raw uploads are intentionally unusable until the owner opens this
      // editor and applies a server-backed trim.
      const firstNewIndex = media.length;
      setEditingVideoIndex(firstNewIndex);
      Alert.alert("Trim required", "Choose a start and end, then save the edit before submitting this listing.");
    }
  };

  const pickPhotosFromLibrary = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your photo upload limit.");return;}
    if(currentPhotoCount>=imageLimit){Alert.alert("Limit reached",`Your plan allows up to ${imageLimit} photo(s).`);return;}
    // Android uses the system Photo Picker here. Do not request broad
    // READ_MEDIA_* permissions; Google Play requires the picker for uploads.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection:true,
      quality:0.8,
    });
    if(!result.canceled){
      const allowed = result.assets.slice(0,imageLimit-currentPhotoCount);
      if(allowed.length<result.assets.length) Alert.alert("Limit reached",`Only ${imageLimit-currentPhotoCount} more photo(s) can be added.`);
      await addPickerAssets(allowed,false);
    }
  };

  const pickPhotoFromCamera = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your photo upload limit.");return;}
    if(currentPhotoCount>=imageLimit){Alert.alert("Limit reached",`Your plan allows up to ${imageLimit} photo(s).`);return;}
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow camera access.");return;}
    const result = await ImagePicker.launchCameraAsync({quality:0.8});
    if(!result.canceled) await addPickerAssets(result.assets,false);
  };

  const pickVideoFromLibrary = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your video upload limit.");return;}
    if(videoLimit===0){Alert.alert("Upgrade required","Video upload is included with Pro (1 video) and Enterprise (5 videos).");return;}
    if(currentVideoCount>=videoLimit){Alert.alert("Limit reached",`Your plan allows up to ${videoLimit} video(s).`);return;}
    if(Platform.OS==="web"){Alert.alert("Not supported","Video library not available on web.");return;}
    // Android uses the system Photo Picker here. Do not request broad
    // READ_MEDIA_* permissions; Google Play requires the picker for uploads.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection:false,
      videoMaxDuration:VIDEO_MAX_DURATION_MS/1000,
    });
    if(result.canceled) return;
    // Reject library videos longer than the max duration (duration is in ms).
    const tooLong = result.assets.filter(a=>typeof a.duration==="number" && a.duration>VIDEO_MAX_DURATION_MS);
    if(tooLong.length>0){
      Alert.alert("Video too long","Videos must be 5 minutes or shorter.");
      return;
    }
    await addPickerAssets(result.assets,true);
  };

  const recordVideo = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your video upload limit.");return;}
    if(videoLimit===0){Alert.alert("Upgrade required","Video upload is included with Pro (1 video) and Enterprise (5 videos).");return;}
    if(currentVideoCount>=videoLimit){Alert.alert("Limit reached",`Your plan allows up to ${videoLimit} video(s).`);return;}
    if(Platform.OS==="web"){Alert.alert("Not supported","Video recording not available on web.");return;}
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow camera access.");return;}
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration:VIDEO_MAX_DURATION_MS/1000,
    });
    if(result.canceled) return;
    const tooLong = result.assets.some(a=>typeof a.duration==="number" && a.duration>VIDEO_MAX_DURATION_MS);
    if(tooLong){
      Alert.alert("Video too long","Videos must be 5 minutes or shorter.");
      return;
    }
    await addPickerAssets(result.assets,true);
  };

  const removeMedia = (index:number)=>setMedia(prev=>prev.filter((_,i)=>i!==index));

  const saveVideoEdit = async (edit: ListingVideoEdit) => {
    if (editingVideoIndex === null) return;
    const item = media[editingVideoIndex];
    if (!item?.uploaded) {
      Alert.alert("Video still uploading", "Wait for the video upload to finish before editing it.");
      return;
    }
    setIsProcessingVideo(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/properties/videos/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourcePath: item.uploaded,
          trimStart: edit.trimStart,
          trimEnd: edit.trimEnd,
          cropAspect: edit.cropAspect,
          caption: edit.caption,
          captionPosition: edit.captionPosition,
        }),
      });
      const data = await response.json() as { objectPath?: string; duration?: number; error?: string };
      if (!response.ok || !data.objectPath) {
        throw new Error(data.error ?? "The video edit could not be saved.");
      }
      if (typeof data.duration === "number" && data.duration > FINAL_VIDEO_MAX_DURATION_SECONDS) {
        throw new Error("The saved video must be 1 minute or shorter.");
      }
      const base = getApiBaseUrl();
      setMedia((previous) => previous.map((entry, index) => index === editingVideoIndex
        ? {
            ...entry,
            uploaded: data.objectPath!,
            uri: `${base}/api/storage${data.objectPath}`,
            mimeType: "video/mp4",
            fileName: entry.fileName.replace(/\.[^.]+$/, "") + "-edited.mp4",
            durationSeconds: data.duration ?? entry.durationSeconds,
            requiresTrim: false,
          }
        : entry,
      ));
      setErrors((previous) => {
        const next = {...previous};
        delete next.video;
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingVideoIndex(null);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Could not save edit", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const moveMedia = (index:number, dir:-1|1)=>{
    setMedia(prev=>{
      const to=index+dir;
      if(to<0||to>=prev.length) return prev;
      const next=[...prev];
      [next[index],next[to]]=[next[to],next[index]];
      return next;
    });
  };

  function validate(): boolean {
    const newErrors: Partial<Record<ErrorField,string>>={};
    if(!form.title.trim()) newErrors.title="Title is required";
    if(!form.address.trim()) newErrors.address="Address is required";
    if(!form.description.trim()) newErrors.description="Description is required";
    if(!form.listingType) newErrors.listingType="Select a listing type";
    if(form.listingType && !toApiSubtype(form.listingType, form.subtype)) newErrors.subtype="Select a property category";
    if((PRICE_UNITS_BY_TYPE[form.listingType] ?? []).length>0 && !form.priceUnit.trim()) newErrors.priceUnit="Select a price period";
    const photos=media.filter(m=>!m.isVideo);
    const videos=media.filter(m=>m.isVideo);
    if(photos.length===0) newErrors.imageUrl="At least one photo is required";
    else if(photos.some(m=>m.uploaded===null)) newErrors.imageUrl="Wait for photos to finish uploading";
    else if(mediaLimitsLoaded && photos.length>imageLimit) newErrors.imageUrl=`Your plan allows up to ${imageLimit} photo(s)`;
    if(videos.some(m=>m.uploaded===null)) newErrors.video="Wait for videos to finish uploading";
    else if(videos.some(m=>m.requiresTrim)) newErrors.video="Trim and apply every newly selected video before submitting";
    else if(videos.some(m=>typeof m.durationSeconds==="number" && m.durationSeconds>FINAL_VIDEO_MAX_DURATION_SECONDS)) newErrors.video="Final videos must be 1 minute or shorter";
    else if(mediaLimitsLoaded && videos.length>videoLimit) newErrors.video=`Your plan allows up to ${videoLimit} video(s)`;
    const price=parseFloat(form.price);
    if(!form.price.trim()||isNaN(price)||price<=0) newErrors.price="Enter a valid price";
    if(isLandType(form.listingType)){
      const acres = Number(form.acres);
      if(form.acres.trim() && (isNaN(acres) || acres <= 0)) newErrors.acres="Acres must be a positive number";
      if(!form.acres.trim() && !form.plotSizeFt.trim()) {
        newErrors.acres="Enter positive acres or a plot size";
        newErrors.plotSizeFt="Enter positive acres or a plot size";
      }
    }
    if(!hideBedsBaths(form.listingType)){
      if(!form.beds.trim()||isNaN(parseInt(form.beds))||parseInt(form.beds)<0) newErrors.beds="Enter the number of bedrooms";
      if(!form.baths.trim()||isNaN(parseInt(form.baths))||parseInt(form.baths)<0) newErrors.baths="Enter the number of bathrooms";
      if(form.sqft&&(isNaN(parseInt(form.sqft))||parseInt(form.sqft)<0)) newErrors.sqft="Enter a valid number";
    }
    if(form.lat.trim()){
      const latVal=parseFloat(form.lat);
      if(isNaN(latVal)||latVal<-90||latVal>90) newErrors.lat="Latitude must be -90 to 90";
    }
    if(form.lng.trim()){
      const lngVal=parseFloat(form.lng);
      if(isNaN(lngVal)||lngVal<-180||lngVal>180) newErrors.lng="Longitude must be -180 to 180";
    }
    setErrors(newErrors);
    scrollToFirstError(newErrors);
    return Object.keys(newErrors).length===0;
  }

  function handleSubmit() {
    if(isUploading){Alert.alert("Please wait","Media is still uploading.");return;}
    if(isProcessingVideo){Alert.alert("Video processing","Wait for the video trim to finish.");return;}
    if(media.some(m=>m.isVideo&&m.requiresTrim)){
      Alert.alert("Trim required","Open each newly selected video and save its trim before submitting.");
      return;
    }
    if(media.some(m=>m.isVideo&&typeof m.durationSeconds==="number"&&m.durationSeconds>FINAL_VIDEO_MAX_DURATION_SECONDS)){
      const videoError: Partial<Record<ErrorField,string>> = {video:"Final videos must be 1 minute or shorter"};
      setErrors(videoError);
      scrollToFirstError(videoError);
      Alert.alert("Video too long","Edit every video to 1 minute or shorter before submitting.");
      return;
    }
    if(!validate()){
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if(Platform.OS==="ios"){
        Alert.alert(
          "Please fix the highlighted fields",
          "Missing or invalid fields are outlined in red. Correct them, then submit again.",
        );
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isLand=isLandType(form.listingType);
    // Land listings send beds:0 (not acres) to avoid fractional values in the
    // integer bedrooms column; acres lives exclusively in details.land.
    const parsedBeds = !hideBedsBaths(form.listingType)&&form.beds ? parseInt(form.beds) : isLand ? 0 : undefined;
    const parsedBaths = !hideBedsBaths(form.listingType)&&form.baths ? parseInt(form.baths) : isLand ? 0 : undefined;

    let parsedSqft: number|undefined = undefined;
    if(!hideBedsBaths(form.listingType)&&form.sqft){
      parsedSqft = parseInt(form.sqft)||undefined;
    }

    const photos=media.filter(m=>!m.isVideo).map(m=>m.uploaded).filter((u):u is string=>u!==null);
    const videos=media.filter(m=>m.isVideo).map(m=>m.uploaded).filter((u):u is string=>u!==null);
    const totalUnits=isLand?1:Math.max(1,parseInt(form.totalUnits)||1);
    const guests=form.guests?parseInt(form.guests):undefined;
    const hourlyRate=form.hourlyRate?parseInt(form.hourlyRate):undefined;

    // Build land-specific details object aligned with web: { land: { ... } }.
    // acres is stored as a number (parseFloat || null) inside details.land — not
    // in the beds column.  Description also gets a human-readable block for
    // backwards compatibility with readers that render it as plain text.
    let finalDesc = form.description.trim();
    let propertyDetails: Record<string,unknown>|undefined = undefined;
    if(isLand){
      propertyDetails = {
        land: {
          acres:             parseFloat(form.acres) || null,
          // Plot dimensions are intentionally stored as display text. Do not
          // multiply values such as "50 by 60", "60*80", or "60x70".
          plotSizeFt:        form.plotSizeFt.trim() || null,
          soilType:          form.soilType          || null,
          surveyMaps:        form.surveyMaps        || null,
          titleDeed:         form.titleDeed         || null,
          legalRates:        form.legalRates        || null,
          legalEncumbrances: form.legalEncumbrances || null,
          paymentPlan:       form.paymentPlan       || null,
          pricePerUnit:      form.pricePerUnit      || null,
          utilities:   LAND_UTILITIES.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
          surrounding: LAND_SURROUNDING.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
          zoning:      LAND_ZONING.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
        },
      };
      // Human-readable fallback in description.
      const extras:string[]=[];
      if(form.soilType)         extras.push(`Soil type: ${form.soilType}`);
      if(form.surveyMaps)       extras.push(`Survey maps & beacons: ${form.surveyMaps}`);
      if(form.titleDeed)        extras.push(`Ready title deed: ${form.titleDeed}`);
      if(form.legalRates)       extras.push(`Rates / land rent status: ${form.legalRates}`);
      if(form.legalEncumbrances)extras.push(`Encumbrances or disputes: ${form.legalEncumbrances}`);
      if(form.paymentPlan)      extras.push(`Payment plan: ${form.paymentPlan}`);
      if(form.pricePerUnit)     extras.push(`Price per unit: ${form.pricePerUnit}`);
      if(!isEditing && extras.length>0) {
        finalDesc=[finalDesc,extras.join("\n")].filter(Boolean).join("\n\n");
      }
    }

    const data = {
      title: form.title.trim(),
      type: toApiType(form.listingType),
      price: parseFloat(form.price),
      address: form.address.trim(),
      ...(parsedBeds != null ? { beds: parsedBeds } : {}),
      ...(parsedBaths != null ? { baths: parsedBaths } : {}),
      ...(parsedSqft != null ? { sqft: parsedSqft } : {}),
      ...(guests ? { guests } : {}),
      ...(hourlyRate ? { hourlyRate } : {}),
      ...((form.listingType === "bnb" ? "night" : form.priceUnit.trim())
        ? { priceUnit: form.listingType === "bnb" ? "night" : form.priceUnit.trim() }
        : {}),
      subtype: toApiSubtype(form.listingType, form.subtype),
      totalUnits,
      ...(finalDesc ? { description: finalDesc } : { description: "" }),
      image: photos[0] || "",
      images: photos,
      ...(isEditing ? { videos } : videos.length > 0 ? { videos } : {}),
      tags: selectedAmenities,
      ...(isEditing
        ? { details: propertyDetails ?? {} }
        : propertyDetails ? { details: propertyDetails } : {}),
      ...(form.lat.trim() && form.lng.trim()
        ? { lat: form.lat.trim(), lng: form.lng.trim() }
        : {}),
    };

    if (isEditing && editId) {
      updateProperty({ id: editId, data });
    } else {
      createProperty({ data });
    }
  }

  const isSaving = isCreating || isUpdating;
  const lt = form.listingType;
  const subtypeOptions = SUBTYPES[lt] ?? [];
  const priceUnitOptions = PRICE_UNITS_BY_TYPE[lt] ?? [];
  const showHourlyRate = lt==="bnb"||lt==="hotel";
  const showGuests = lt==="bnb"||lt==="hotel"||lt==="hostel";
  const showTotalUnits = !isLandType(lt);
  const showBedsBaths = !hideBedsBaths(lt);
  const isLand = isLandType(lt);
  const amenityLists = hasStandardAmenities(lt) ? getAmenityLists(lt) : null;
  const photos = media.filter(m=>!m.isVideo);
  const videoMedia = media.filter(m=>m.isVideo);

  return (
    <View style={[styles.container,{backgroundColor:colors.background}]}>
      <View style={[styles.header,{paddingTop:topPadding+16}]}>
        <Text style={[styles.title,{color:colors.foreground}]}>{isEditing ? "Edit Listing" : "List a Property"}</Text>
        <Text style={[styles.subtitle,{color:colors.mutedForeground}]}>
          {isEditing ? "Update your listing details and save your changes." : "Fill in the details. Your listing goes to admin review before publishing."}
        </Text>
      </View>

      {/* Draft controls */}
      {draftSource !== null && (
        <View style={[styles.draftBar,{backgroundColor:colors.muted,borderColor:colors.border}]}>
          <View style={{flex:1,gap:2}}>
            <Text style={[styles.draftText,{color:colors.foreground}]}>Saved draft found</Text>
            <Text style={{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground}}>
              {draftSource==="server" ? "☁ Saved to your account" : "📱 Saved on this device only"}
            </Text>
          </View>
          <View style={{flexDirection:"row",gap:8}}>
            <Pressable style={[styles.draftBtn,{backgroundColor:colors.primary}]} onPress={restoreDraft}>
              <Text style={[styles.draftBtnText,{color:colors.primaryForeground}]}>Restore</Text>
            </Pressable>
            <Pressable style={[styles.draftBtn,{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border}]} onPress={discardDraft}>
              <Text style={[styles.draftBtnText,{color:colors.foreground}]}>Discard</Text>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
        <ScrollView
          ref={formScrollRef}
          contentContainerStyle={[styles.content,{paddingBottom:isWeb?34+84:insets.bottom+100}]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Info ── */}
          <SectionLabel text="Basic Info" colors={colors}/>

          <Field label="Property Title *" error={errors.title} colors={colors} onLayout={registerFieldPosition("title")}>
            <TextInput
              style={[styles.input,{color:colors.foreground,borderColor:errors.title?colors.destructive:colors.border,backgroundColor:colors.card}]}
              placeholder="e.g. Modern 2BR Apartment in Westlands"
              placeholderTextColor={colors.mutedForeground}
              value={form.title}
              onChangeText={v=>setField("title",v)}
              returnKeyType="next"
            />
          </Field>

          <Field label="Listing Type *" error={errors.listingType} colors={colors} onLayout={registerFieldPosition("listingType")}>
            <ChipSelector
              options={LISTING_TYPES.map(t=>({label:t.label,value:t.value}))}
              value={lt}
              onChange={v=>{setField("listingType",v as ListingType);setField("subtype","");setField("priceUnit","");}}
              colors={colors}
              small
              error={errors.listingType}
            />
          </Field>

          {/* Sub-type */}
          {subtypeOptions.length>0 && (
            <Field label={lt==="rent"?"Apartment Type":lt==="bnb"?"B&B Property Type":"Sub-type"} error={errors.subtype} colors={colors}
              onLayout={registerFieldPosition("subtype")}
              hint="Helps guests find your property in the right category.">
              <ChipSelector
                options={subtypeOptions}
                value={form.subtype}
                onChange={v=>setField("subtype",v===form.subtype?"":v)}
                colors={colors}
                small
                error={errors.subtype}
              />
            </Field>
          )}

          {/* Price */}
          <View style={{flexDirection:"row",gap:10}} onLayout={registerFieldsPosition("price", "priceUnit")}>
            <View style={{flex:1}}>
              <Field label="Price (KES) *" error={errors.price} colors={colors}>
                <TextInput
                  style={[styles.input,{color:colors.foreground,borderColor:errors.price?colors.destructive:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. 8500"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.price}
                  onChangeText={v=>setField("price",v)}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            {priceUnitOptions.length>0 && (
              <View style={{flex:1}}>
                <Field label="Price Per" error={errors.priceUnit} colors={colors}>
                  <ChipSelector
                    options={priceUnitOptions}
                    value={form.priceUnit}
                    onChange={v=>setField("priceUnit",form.priceUnit===v?"":v)}
                    colors={colors}
                    small
                    error={errors.priceUnit}
                  />
                </Field>
              </View>
            )}
          </View>

          {/* B&B pricing */}
          {showHourlyRate && (
            <Field label="Hourly Rate (KES, optional)" colors={colors} hint="Leave blank if hourly is not available.">
              <TextInput
                style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                placeholder="e.g. 800"
                placeholderTextColor={colors.mutedForeground}
                value={form.hourlyRate}
                onChangeText={v=>setField("hourlyRate",v)}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </Field>
          )}

          <Field label="Address * (auto-filled when you pin a location)" error={errors.address} colors={colors} onLayout={registerFieldPosition("address")}>
            <TextInput
              style={[styles.input,{color:colors.foreground,borderColor:errors.address?colors.destructive:colors.border,backgroundColor:colors.card}]}
              placeholder="e.g. 14 Lenana Road, Nairobi"
              placeholderTextColor={colors.mutedForeground}
              value={form.address}
              onChangeText={v=>{pickerAddressRef.current=null;setField("address",v);}}
              returnKeyType="next"
            />
          </Field>

          {/* ── Features & Amenities ── */}
          <SectionLabel text="Features & Amenities" colors={colors}/>

          {/* Beds / Baths / Sqft (hidden for land + commercial) */}
          {showBedsBaths && (
            <View style={styles.row} onLayout={registerFieldsPosition("beds", "baths", "sqft")}>
              <View style={{flex:1}}>
                <Field label={lt==="hostel"?"Beds/Units":"Bedrooms"} error={errors.beds} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.beds?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="2" placeholderTextColor={colors.mutedForeground} value={form.beds}
                    onChangeText={v=>setField("beds",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
              <View style={{flex:1}}>
                <Field label="Bathrooms" error={errors.baths} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.baths?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.baths}
                    onChangeText={v=>setField("baths",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
              <View style={{flex:1}}>
                <Field label="Sq Ft" error={errors.sqft} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.sqft?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="900" placeholderTextColor={colors.mutedForeground} value={form.sqft}
                    onChangeText={v=>setField("sqft",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
            </View>
          )}

          {/* Land-specific fields */}
          {isLand && (
            <View
              style={[styles.landBox,{backgroundColor:colors.muted,borderColor:colors.border}]}
              onLayout={registerFieldsPosition("acres", "plotSizeFt")}
            >
              <Text style={[styles.landSectionTitle,{color:colors.foreground}]}>Size of Land</Text>
              <View style={styles.row}>
                <View style={{flex:1}}>
                  <Field label="Acres (optional if plot size is entered)" error={errors.acres} colors={colors}>
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.acres?colors.destructive:colors.border,backgroundColor:colors.card}]}
                      placeholder="e.g. 0.5" placeholderTextColor={colors.mutedForeground}
                      value={form.acres} onChangeText={v=>setField("acres",v)} keyboardType="decimal-pad" returnKeyType="next"/>
                  </Field>
                </View>
                <View style={{flex:1}}>
                  <Field
                    label="Plot size (optional if acres is entered)"
                    error={errors.plotSizeFt}
                    colors={colors}
                    hint="Enter 50 by 60, 60*80, or 60x70. It will display exactly as entered."
                  >
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.plotSizeFt?colors.destructive:colors.border,backgroundColor:colors.card}]}
                      placeholder="e.g. 50 by 60, 60*80, 60x70" placeholderTextColor={colors.mutedForeground}
                      value={form.plotSizeFt}
                      onChangeText={v=>setField("plotSizeFt",v)}
                      keyboardType={Platform.OS==="ios"?"default":undefined}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"/>
                  </Field>
                </View>
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Land / Parcel Features</Text>
              <Field label="Soil type" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Red clay, Sandy loam" placeholderTextColor={colors.mutedForeground}
                  value={form.soilType} onChangeText={v=>setField("soilType",v)} returnKeyType="next"/>
              </Field>
              <View style={styles.row}>
                <View style={{flex:1}}>
                  <Field label="Survey maps & beacons" colors={colors}>
                    <YesNoSelector value={form.surveyMaps} onChange={v=>setField("surveyMaps",v)} colors={colors}/>
                  </Field>
                </View>
                <View style={{flex:1}}>
                  <Field label="Ready title deed" colors={colors}>
                    <YesNoSelector value={form.titleDeed} onChange={v=>setField("titleDeed",v)} colors={colors}/>
                  </Field>
                </View>
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Utilities on the Land</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_UTILITIES.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Premise & Surrounding Amenities</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_SURROUNDING.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Zoning Classification</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_ZONING.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Legal / Financial</Text>
              <Field label="Rates / land rent status" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Up to date" placeholderTextColor={colors.mutedForeground}
                  value={form.legalRates} onChangeText={v=>setField("legalRates",v)} returnKeyType="next"/>
              </Field>
              <Field label="Encumbrances or disputes" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. None" placeholderTextColor={colors.mutedForeground}
                  value={form.legalEncumbrances} onChangeText={v=>setField("legalEncumbrances",v)} returnKeyType="next"/>
              </Field>
              <Field label="Payment plan options" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Installments available" placeholderTextColor={colors.mutedForeground}
                  value={form.paymentPlan} onChangeText={v=>setField("paymentPlan",v)} returnKeyType="next"/>
              </Field>
              <Field label="Price per unit (acre / sqm)" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. KES 2M per acre" placeholderTextColor={colors.mutedForeground}
                  value={form.pricePerUnit} onChangeText={v=>setField("pricePerUnit",v)} returnKeyType="next"/>
              </Field>
            </View>
          )}

          {/* Total Units (hidden for land) */}
          {showTotalUnits && (
            <View style={styles.row}>
              {showGuests && (
                <View style={{flex:1}}>
                  <Field label="Max Guests" colors={colors}>
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                      placeholder="4" placeholderTextColor={colors.mutedForeground} value={form.guests}
                      onChangeText={v=>setField("guests",v)} keyboardType="number-pad" returnKeyType="next"/>
                  </Field>
                </View>
              )}
              <View style={{flex:1}}>
                <Field label="Total Units" colors={colors} hint="How many identical units you have.">
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                    placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.totalUnits}
                    onChangeText={v=>setField("totalUnits",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
            </View>
          )}

          {/* Dynamic amenities (non-land) */}
          {amenityLists && (
            <>
              <Text style={[{fontSize:12,fontFamily:"Outfit_500Medium",color:colors.foreground,marginTop:4}]}>Unit Amenities</Text>
              <Text style={[{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginBottom:4}]}>Features inside the individual unit/space</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {amenityLists.unit.map(a=>(
                  <AmenityChip key={a.id} label={a.label} selected={selectedAmenities.includes(a.id)} onToggle={()=>toggleAmenity(a.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[{fontSize:12,fontFamily:"Outfit_500Medium",color:colors.foreground,marginTop:12}]}>Premise Amenities</Text>
              <Text style={[{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginBottom:4}]}>Shared facilities on the property</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {amenityLists.premise.map(a=>(
                  <AmenityChip key={a.id} label={a.label} selected={selectedAmenities.includes(a.id)} onToggle={()=>toggleAmenity(a.id)} colors={colors}/>
                ))}
              </View>
            </>
          )}

          {selectedAmenities.length>0 && (
            <View style={[{backgroundColor:colors.muted,padding:10,borderRadius:8}]}>
              <Text style={{fontSize:11,color:colors.mutedForeground,fontFamily:"Outfit_400Regular"}}>
                Selected: {selectedAmenities.length} feature(s)
              </Text>
            </View>
          )}

          <Field label="Description *" error={errors.description} colors={colors} onLayout={registerFieldPosition("description")}>
            <TextInput
              style={[styles.input,styles.textarea,{color:colors.foreground,borderColor:errors.description?colors.destructive:colors.border,backgroundColor:colors.card}]}
              placeholder="Describe your property — amenities, location, rules…"
              placeholderTextColor={colors.mutedForeground}
              value={form.description}
              onChangeText={v=>setField("description",v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* ── Photos ── */}
          <View onLayout={registerFieldPosition("imageUrl")}>
          <SectionLabel text={`Photos * (${photos.length}/${imageLimit})`} colors={colors}/>
          <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginTop:-8}}>
            {mediaLimitsLoaded
              ? "At least one photo required. Use arrows to reorder."
              : "Checking your photo upload allowance…"}
          </Text>
          <View style={{flexDirection:"row",gap:8}}>
            <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:errors.imageUrl?colors.destructive:colors.border,opacity:isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit?0.5:1}]}
              onPress={pickPhotosFromLibrary} disabled={isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit}>
              <Feather name="image" size={18} color={colors.foreground}/>
              <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Gallery</Text>
            </Pressable>
            <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:errors.imageUrl?colors.destructive:colors.border,opacity:isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit?0.5:1}]}
              onPress={pickPhotoFromCamera} disabled={isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit}>
              <Feather name="camera" size={18} color={colors.foreground}/>
              <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Camera</Text>
            </Pressable>
          </View>

          {isUploading && (
            <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
              <ActivityIndicator size="small" color={colors.primary}/>
              <Text style={{fontSize:13,fontFamily:"Outfit_400Regular",color:colors.mutedForeground}}>Uploading...</Text>
            </View>
          )}
          {errors.imageUrl ? <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.destructive}}>{errors.imageUrl}</Text> : null}

          {photos.length>0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
              {photos.map((photo,index)=>{
                // Find real index in media array
                const mediaIndex = media.indexOf(photo);
                const isFirst = index===0;
                const isLast = index===photos.length-1;
                return (
                  <View key={mediaIndex} style={{width:90,height:90,position:"relative"}}>
                    <Image source={{uri:photo.uri}} style={{width:90,height:90,borderRadius:8}} resizeMode="cover"/>
                    {isFirst && (
                      <View style={{position:"absolute",bottom:4,left:4,backgroundColor:colors.primary,paddingHorizontal:5,paddingVertical:2,borderRadius:4}}>
                        <Text style={{fontSize:9,color:colors.primaryForeground,fontFamily:"Outfit_600SemiBold"}}>Cover</Text>
                      </View>
                    )}
                    {photo.uploaded===null && !isUploading && (
                      <View style={{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.4)",borderRadius:8,alignItems:"center",justifyContent:"center"}}>
                        <Feather name="alert-circle" size={16} color="#fff"/>
                      </View>
                    )}
                    <Pressable style={{position:"absolute",top:-6,right:-6,backgroundColor:"#ef4444",borderRadius:10,width:20,height:20,alignItems:"center",justifyContent:"center"}}
                      onPress={()=>removeMedia(mediaIndex)}>
                      <Feather name="x" size={12} color="#fff"/>
                    </Pressable>
                    {photos.length>1 && (
                      <View style={{position:"absolute",bottom:4,right:4,flexDirection:"row",gap:2}}>
                        {!isFirst && (
                          <Pressable style={{backgroundColor:"rgba(0,0,0,0.65)",borderRadius:3,padding:3}}
                            onPress={()=>moveMedia(mediaIndex,-1)}>
                            <Feather name="arrow-left" size={10} color="#fff"/>
                          </Pressable>
                        )}
                        {!isLast && (
                          <Pressable style={{backgroundColor:"rgba(0,0,0,0.65)",borderRadius:3,padding:3}}
                            onPress={()=>moveMedia(mediaIndex,1)}>
                            <Feather name="arrow-right" size={10} color="#fff"/>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          </View>

          {/* ── Videos ── */}
          <View
            onLayout={registerFieldPosition("video")}
            style={errors.video ? {borderWidth:2,borderColor:colors.destructive,borderRadius:10,padding:8} : undefined}
          >
          <SectionLabel text={`Videos (${videoMedia.length}/${videoLimit})`} colors={colors}/>
          {!mediaLimitsLoaded ? (
            <View style={[{backgroundColor:colors.muted,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:12,flexDirection:"row",alignItems:"center",gap:8}]}>
              <ActivityIndicator size="small" color={colors.primary}/>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,flex:1}}>
                Checking your video upload allowance…
              </Text>
            </View>
          ) : videoLimit===0 ? (
            <View style={[{backgroundColor:colors.muted,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:12,flexDirection:"row",alignItems:"center",gap:8}]}>
              <Feather name="alert-circle" size={16} color={colors.mutedForeground}/>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,flex:1}}>
                Video upload is included with Pro (1 video) and Enterprise (5 videos).
              </Text>
            </View>
          ) : (
            <>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginTop:-8}}>Max 5 minutes per source · apply an explicit trim (max 1 minute) · {videoMedia.length}/{videoLimit} used</Text>
              <View style={{flexDirection:"row",gap:8}}>
                <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:errors.video?colors.destructive:colors.border,opacity:currentVideoCount>=videoLimit||isUploading?0.5:1}]}
                  onPress={pickVideoFromLibrary} disabled={isUploading||currentVideoCount>=videoLimit}>
                  <Feather name="video" size={18} color={colors.foreground}/>
                  <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Video Library</Text>
                </Pressable>
                <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:errors.video?colors.destructive:colors.border,opacity:currentVideoCount>=videoLimit||isUploading?0.5:1}]}
                  onPress={recordVideo} disabled={isUploading||currentVideoCount>=videoLimit}>
                  <Feather name="aperture" size={18} color={colors.foreground}/>
                  <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Record</Text>
                </Pressable>
              </View>
              {videoMedia.length>0 && (
                <View style={{gap:8}}>
                  {videoMedia.map((v,index)=>{
                    const mediaIndex=media.indexOf(v);
                    return (
                      <View key={mediaIndex} style={[{backgroundColor:colors.card,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:10,gap:10}]}>
                        <ListingVideoPreview source={v.uri}/>
                        <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                          <Feather name="video" size={20} color={colors.primary}/>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:13,fontFamily:"Outfit_500Medium",color:colors.foreground}}>Video {index+1}</Text>
                            {v.uploaded===null && !isUploading && (
                              <Text style={{fontSize:11,color:colors.destructive,fontFamily:"Outfit_400Regular"}}>Upload failed</Text>
                            )}
                            {v.uploaded===null && isUploading && (
                              <Text style={{fontSize:11,color:colors.mutedForeground,fontFamily:"Outfit_400Regular"}}>Uploading…</Text>
                            )}
                            {v.uploaded!==null && (
                              <Text style={{fontSize:11,color:v.requiresTrim?"#b45309":"#16a34a",fontFamily:"Outfit_400Regular"}}>{v.requiresTrim ? "Trim required before submission" : "Trim applied"}</Text>
                            )}
                          </View>
                           <Pressable
                             onPress={()=>setEditingVideoIndex(mediaIndex)}
                             disabled={!v.uploaded || isUploading || isProcessingVideo}
                             style={{opacity: !v.uploaded || isUploading || isProcessingVideo ? 0.45 : 1}}
                           >
                             <Feather name="edit-3" size={17} color={colors.primary}/>
                           </Pressable>
                          <Pressable onPress={()=>removeMedia(mediaIndex)}>
                            <Feather name="trash-2" size={16} color={colors.destructive}/>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {errors.video ? <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.destructive}}>{errors.video}</Text> : null}
            </>
          )}
          </View>

          {/* ── Location ── */}
          <View onLayout={registerFieldPosition("location")} style={[errors.location || errors.lat || errors.lng ? {borderWidth:1,borderColor:colors.destructive,borderRadius:8,padding:8} : undefined]}>
            <SectionLabel text="Location" colors={colors}/>
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              onLocationChange={handleLocationChange}
              onAddressResolved={handleAddressResolved}
              latError={errors.lat ?? errors.location}
              lngError={errors.lng ?? errors.location}
            />
            {errors.location ? <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.destructive}}>{errors.location}</Text> : null}
          </View>

          {/* ── Actions ── */}
          <View style={{flexDirection:"row",gap:10}}>
            {!isEditing && (
              <Pressable
                style={[styles.saveDraftBtn,{borderColor:colors.border,backgroundColor:colors.card}]}
                onPress={saveDraft}
              >
                <Feather name="save" size={16} color={colors.foreground}/>
                <Text style={[styles.saveDraftText,{color:colors.foreground}]}>Save Draft</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.submitBtn,{backgroundColor:isSaving||isUploading||isProcessingVideo||media.some(m=>m.isVideo&&m.requiresTrim)?colors.muted:colors.primary,flex:1}]}
              onPress={handleSubmit}
              disabled={isSaving||isUploading||isProcessingVideo||media.some(m=>m.isVideo&&m.requiresTrim)}
            >
              {isSaving ? <ActivityIndicator size="small" color={colors.mutedForeground}/> : (
                <>
                  <Feather name={isEditing ? "save" : "upload"} size={18} color={colors.primaryForeground}/>
                  <Text style={[styles.submitBtnText,{color:colors.primaryForeground}]}>
                    {isEditing ? "Save Changes" : "Submit Listing"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
        {editingVideoIndex !== null && media[editingVideoIndex] ? (
          <ListingVideoEditor
            source={media[editingVideoIndex].uri}
            durationSeconds={media[editingVideoIndex].durationSeconds}
            processing={isProcessingVideo}
            onClose={() => !isProcessingVideo && setEditingVideoIndex(null)}
            onSave={saveVideoEdit}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container:{flex:1},
    header:{paddingHorizontal:20,paddingBottom:12,gap:4},
    title:{fontSize:24,fontFamily:"Outfit_700Bold"},
    subtitle:{fontSize:13,fontFamily:"Outfit_400Regular",lineHeight:18},
    content:{paddingHorizontal:20,paddingTop:8,gap:16},
    guestContainer:{flex:1,alignItems:"center",justifyContent:"center",gap:14,paddingHorizontal:40},
    iconCircle:{width:88,height:88,borderRadius:44,alignItems:"center",justifyContent:"center",borderWidth:1,marginBottom:8},
    guestTitle:{fontSize:22,fontFamily:"Outfit_700Bold",textAlign:"center"},
    guestSubtitle:{fontSize:14,fontFamily:"Outfit_400Regular",textAlign:"center",lineHeight:20},
    primaryBtn:{paddingHorizontal:48,paddingVertical:14,marginTop:8,width:"100%",alignItems:"center",flexDirection:"row",justifyContent:"center",gap:8,borderRadius:8},
    primaryBtnText:{fontSize:15,fontFamily:"Outfit_600SemiBold"},
    input:{borderWidth:1,paddingHorizontal:14,paddingVertical:12,fontSize:14,fontFamily:"Outfit_400Regular",borderRadius:8},
    textarea:{height:100,paddingTop:12},
    row:{flexDirection:"row",gap:10},
    submitBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:15,marginTop:8,borderRadius:8},
    submitBtnText:{fontSize:16,fontFamily:"Outfit_600SemiBold"},
    saveDraftBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:15,marginTop:8,borderRadius:8,borderWidth:1,paddingHorizontal:16},
    saveDraftText:{fontSize:14,fontFamily:"Outfit_500Medium"},
    mediaPickerBtn:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:14,borderWidth:1,borderRadius:8},
    mediaPickerText:{fontSize:13,fontFamily:"Outfit_600SemiBold"},
    draftBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginHorizontal:20,marginBottom:4,padding:12,borderRadius:8,borderWidth:1},
    draftText:{fontSize:13,fontFamily:"Outfit_500Medium"},
    draftBtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:6},
    draftBtnText:{fontSize:12,fontFamily:"Outfit_600SemiBold"},
    landBox:{borderWidth:1,borderRadius:10,padding:14,gap:12},
    landSectionTitle:{fontSize:13,fontFamily:"Outfit_600SemiBold"},
  });
}
