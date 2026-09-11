             </CardContent>
              </Card>

              {/* Configuration form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-zinc-500" /> SMS Configuration
                  </CardTitle>
                  <CardDescription>Select your SMS provider and enter credentials. Changes take effect immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Provider selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Provider</label>
                    <div className="flex gap-3">
                      {[
                        { value: "airtouch",      label: "Airtouch",          hint: "Username + Password" },
                        { value: "africastalking", label: "Africa's Talking",  hint: "API Key" },
                      ].map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setSmsForm(f => ({ ...f, provider: p.value }))}
                          className={`flex-1 border-2 rounded-lg px-4 py-3 text-left transition-all
                            ${smsForm.provider === p.value
                              ? 'border-zinc-900 bg-zinc-50'
                              : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <p className="text-sm font-semibold">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sender ID — always shown */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Sender Name / ID</label>
                    <input
                      type="text"
                      value={smsForm.senderId}
                      onChange={e => setSmsForm(f => ({ ...f, senderId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder="e.g. inndos"
                    />
                    <p className="text-xs text-gray-400">
                      {smsForm.provider === 'africastalking'
                        ? "Alphanumeric sender ID registered with Africa's Talking (or leave blank to use default shortcode)."
                        : "Alphanumeric sender ID registered with Airtouch."}
                    </p>
                  </div>

                  {/* Africa's Talking fields */}
                  {smsForm.provider === 'africastalking' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">API Key</label>
                        <input
                          type="password"
                          value={smsForm.apiKey}
                          onChange={e => setSmsForm(f => ({ ...f, apiKey: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.apiKeySet ? "Leave blank to keep current API key" : "Enter your Africa's Talking API key"}
                        />
                        {smsSettings?.apiKeySet && <p className="text-xs text-gray-400">API key is set. Leave blank to keep it unchanged.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Username</label>
                        <input
                          type="text"
                          value={smsForm.username}
                          onChange={e => setSmsForm(f => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder="Your Africa's Talking username (e.g. inndos)"
                        />
                        <p className="text-xs text-gray-400">Your registered Africa's Talking account username.</p>
                      </div>
                    </div>
                  )}

                  {/* Airtouch fields */}
                  {smsForm.provider === 'airtouch' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Username</label>
                        <input
                          type="text"
                          value={smsForm.username}
                          onChange={e => setSmsForm(f => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder="Parent account username (e.g. webexpert)"
                        />
                        <p className="text-xs text-amber-600 font-medium">⚠ Use the parent/master account credentials, not your sub-account username.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Password</label>
                        <input
                          type="password"
                          value={smsForm.password}
                          onChange={e => setSmsForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.passwordSet ? "Leave blank to keep current password" : "Enter your Airtouch password"}
                        />
                        {smsSettings?.passwordSet && <p className="text-xs text-gray-400">Password is set. Leave blank to keep it unchanged.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">API Key <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="password"
                          value={smsForm.apiKey}
                          onChange={e => setSmsForm(f => ({ ...f, apiKey: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.apiKeySet ? "Leave blank to keep current API key" : "Enter your Airtouch API key (if required)"}
                        />
                        {smsSettings?.apiKeySet && <p className="text-xs text-gray-400">API key is set. Leave blank to keep it unchanged.</p>}
                        <p className="text-xs text-gray-400">Some Airtouch accounts use an API key instead of or alongside the password.</p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto gap-2"
                    disabled={isSavingSmsSettings}
                    onClick={async () => {
                      setIsSavingSmsSettings(true);
                      try {
                        const body: Record<string, string | undefined> = {
                          provider: smsForm.provider,
                          senderId: smsForm.senderId,
                        };
                        if (smsForm.provider === 'airtouch') {
                          body.username = smsForm.username;
                          if (smsForm.password) body.password = smsForm.password;
                        } else {
                          body.username = smsForm.username;
                          if (smsForm.apiKey) body.apiKey = smsForm.apiKey;
                        }
                        const res = await fetch("/api/admin/sms-settings", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify(body),
                        });
                        if (!res.ok) throw new Error("Failed to save");
                        const providerLabel = smsForm.provider === 'africastalking' ? "Africa's Talking" : "Airtouch";
                        toast({ title: "SMS settings saved", description: `${providerLabel} configuration updated.` });
                        setSmsForm(f => ({ ...f, password: "", apiKey: "" }));
                        fetchSmsSettings();
                      } catch {
                        toast({ title: "Save failed", description: "Could not update SMS settings.", variant: "destructive" });
                      } finally { setIsSavingSmsSettings(false); }
                    }}
                  >
                    {isSavingSmsSettings ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Save Settings</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Test SMS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-zinc-500" /> Send Test SMS
                  </CardTitle>
                  <CardDescription>Send a test message to verify your SMS integration is working.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Phone Number</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={smsTestPhone}
                        onChange={e => setSmsTestPhone(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        placeholder="07XXXXXXXX or +254XXXXXXXXX"
                      />
                      <Button
                        className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shrink-0"
                        disabled={isSendingTestSms || !smsTestPhone.trim()}
                        onClick={async () => {
                          setIsSendingTestSms(true);
                          try {
                            const res = await fetch("/api/admin/sms-test", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ phone: smsTestPhone.trim() }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error((data as { error?: string }).error || "Send failed");
                            toast({ title: "Test SMS sent!", description: (data as { message?: string }).message ?? `Message sent to ${smsTestPhone}` });
                          } catch (err) {
                            toast({ title: "Test failed", description: err instanceof Error ? err.message : "Could not send test SMS.", variant: "destructive" });
                          } finally { setIsSendingTestSms(false); }
                        }}
                      >
                        {isSendingTestSms ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send Test"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Admin: Reviews Moderation Tab ───────────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="admin-reviews" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Moderation</h1>
                  <p className="text-gray-500 text-sm">View and remove inappropriate or spam reviews across all properties</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAdminReviews} disabled={isLoadingAdminReviews} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingAdminReviews ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by property or reviewer…"
                    value={adminReviewsSearch}
                    onChange={e => setAdminReviewsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {[null, 1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r ?? 'all'}
                      onClick={() => setAdminReviewsRatingFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                        ${adminReviewsRatingFilter === r
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {r === null ? 'All' : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Reviews", value: adminReviews.length },
                  { label: "1–2 Star", value: adminReviews.filter(r => r.rating <= 2).length },
                  { label: "Avg Rating", value: adminReviews.length > 0 ? (adminReviews.reduce((s, r) => s + r.rating, 0) / adminReviews.length).toFixed(1) : "—" },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Reviews table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Reviews</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminReviews ? (
                    <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
                  ) : (() => {
                    const filtered = adminReviews.filter(r => {
                      const searchLower = adminReviewsSearch.toLowerCase();
                      const matchSearch = !adminReviewsSearch
                        || r.propertyTitle?.toLowerCase().includes(searchLower)
                        || r.reviewerName?.toLowerCase().includes(searchLower)
                        || r.reviewerEmail?.toLowerCase().includes(searchLower)
                        || r.comment?.toLowerCase().includes(searchLower);
                      const matchRating = adminReviewsRatingFilter === null || r.rating === adminReviewsRatingFilter;
                      return matchSearch && matchRating;
                    }).sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
                    return filtered.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">No reviews found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Reviewer</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Property</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Rating</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Comment</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((review: any) => (
                              <tr key={review.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{review.reviewerName ?? "—"}</div>
                                  <div className="text-xs text-gray-400">{review.reviewerEmail ?? ""}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                                  <div className="truncate">{review.propertyTitle ?? "—"}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1">
                                    <Star className={`h-3.5 w-3.5 ${review.rating <= 2 ? 'text-red-400' : 'text-yellow-400'} fill-current`} />
                                    <span className={`font-semibold ${review.rating <= 2 ? 'text-red-600' : 'text-gray-800'}`}>{review.rating}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                                  <p className="line-clamp-2 text-xs">{review.comment || <span className="italic text-gray-400">No comment</span>}</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                    onClick={async () => {
                                      if (!confirm(`Delete this review by ${review.reviewerName ?? "user"}? This cannot be undone.`)) return;
                                      try {
                                        const res = await fetch(`/api/reviews/${review.id}`, {
                                          method: "DELETE",
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        if (!res.ok) throw new Error("Failed to delete");
                                        setAdminReviews(prev => prev.filter(r => r.id !== review.id));
                                        fetchAdminProperties();
                                        toast({ title: "Review deleted", description: "The review has been removed." });
                                      } catch {
                                        toast({ title: "Delete failed", description: "Could not delete the review.", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Subscription Tab */}
      {(user.role === 'owner' || user.role === 'host') && (
        <TabsContent value="subscription" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
              <p className="text-gray-500 text-sm">Manage your listing plan and billing</p>
            </div>
          </div>

          {/* Current Plan Banner */}
          {isLoadingSubscription ? (
            <Card className="border-2 border-zinc-200">
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </CardContent>
            </Card>
          ) : subscription && (
            <Card className={`border-2 ${subscription.plan === 'enterprise' ? 'border-purple-400 bg-purple-50' : subscription.plan === 'pro' ? 'border-yellow-400 bg-yellow-50' : subscription.plan === 'basic' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
              <CardContent className="py-5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {subscription.plan === 'enterprise' ? <Crown className="h-7 w-7 text-gray-500" /> : subscription.plan === 'pro' ? <Crown className="h-7 w-7 text-gray-500" /> : subscription.plan === 'basic' ? <Zap className="h-7 w-7 text-zinc-500" /> : <Gift className="h-7 w-7 text-zinc-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{subscription.plan} Plan</span>
                        <Badge className={subscription.plan === 'enterprise' ? 'bg-gray-100 text-gray-800 border-gray-300' : subscription.plan === 'pro' ? 'bg-gray-100 text-gray-800 border-gray-200' : subscription.plan === 'basic' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'}>
                          {subscription.status}
                        </Badge>
                      </div>
                      {subscription.plan !== 'free' && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Valid until {subscription.endDate} · {subscription.billingCycle === 'custom' ? `${subscription.billingMonths} months` : subscription.billingCycle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">
                      {subscription.listingCount} / {subscription.listingLimit >= 2147483647 ? '∞' : subscription.listingLimit} listings used
                    </div>
                    <div className="w-40 bg-gray-200 rounded-full h-2 mt-1.5">
                      <div
                        className={`h-2 rounded-full ${subscription.plan === 'enterprise' ? 'bg-purple-500' : subscription.plan === 'pro' ? 'bg-yellow-400' : subscription.plan === 'basic' ? 'bg-zinc-500' : 'bg-zinc-800'}`}
                        style={{ width: subscription.listingLimit >= 2147483647 ? `${Math.min((subscription.listingCount / 10) * 100, 100)}%` : `${Math.min((subscription.listingCount / subscription.listingLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-black/5 px-3 py-2 text-gray-700">
                      Media: {subscription.imageLimit >= 2147483647 ? "Unlimited" : subscription.imageLimit} photos · {subscription.videoLimit} video{subscription.videoLimit === 1 ? "" : "s"} per listing
                    </div>
                    <div className="rounded-lg bg-black/5 px-3 py-2 text-gray-700">
                      Featured this month: {subscription.featuredUsed}/{subscription.featuredAllowance} used · {subscription.featuredRemaining} remaining
                    </div>
                  </div>
                {subscription.plan !== 'free' && (
                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between gap-3">
                    <Button variant="outline" size="sm" disabled={subscription.featuredRemaining < 1} onClick={() => setFeatureSelectionOpen(true)}>
                      Choose featured listings
                    </Button>
                    <button
                      onClick={handleDowngradeToFree}
                      disabled={isUpgrading}
                      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                    >
                      Downgrade to Free
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Free */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'free' ? 'border-zinc-800 ring-2 ring-zinc-800 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-5 w-5 text-zinc-400" />
                  <CardTitle className="text-base font-bold">{freePlan.displayName}</CardTitle>
                  {subscription?.plan === 'free' && <Badge className="ml-auto text-[10px] bg-zinc-800 text-white">Current</Badge>}
                </div>
                <CardDescription className="text-2xl font-black text-zinc-900">KES {Number(freePlan.pricePerMonth).toLocaleString()}<span className="text-gray-400 text-sm font-normal"> / month</span></CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> {freePlan.listingLimit} active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>{freePlan.imageLimit} photos</strong> per listing</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> 0 featured listings / mo</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No brand-profile search</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No dedicated phone support</li>
                </ul>
                <Button variant="outline" disabled className="w-full mt-auto">
                  {subscription?.plan === 'free' ? 'Active Plan' : 'Free Tier'}
                </Button>
              </CardContent>
            </Card>

            {/* Basic */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'basic' ? 'border-zinc-500 ring-2 ring-zinc-500 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-zinc-500" />
                  <CardTitle className="text-base font-bold">{basicPlan.displayName}</CardTitle>
                  {subscription?.plan === 'basic' && <Badge className="ml-auto text-[10px] bg-zinc-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES {basicPrice.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> {basicPlan.listingLimit} listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>{basicPlan.imageLimit} photos</strong> per listing</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 1 featured listing / mo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Brand-profile search</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No dedicated phone support</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-zinc-800 hover:bg-zinc-700 text-white"
                  onClick={() => { setUpgradeDialogPlan("basic"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'basic'}
                >
                  {subscription?.plan === 'basic' ? 'Active Plan' : subscription?.plan === 'pro' || subscription?.plan === 'enterprise' ? 'Downgrade to Basic' : 'Upgrade to Basic'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'pro' ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 bg-yellow-50' : 'border-yellow-300'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-bold">{proPlan.displayName}</CardTitle>
                  <Badge className="text-[10px] bg-gray-100 text-gray-800 border-gray-200">Popular</Badge>
                  {subscription?.plan === 'pro' && <Badge className="ml-auto text-[10px] bg-yellow-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES {proPrice.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> {proPlan.listingLimit} listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>{proPlan.imageLimit} photos</strong> per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>1 video</strong> / virtual tour per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 3 featured listings / mo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Brand-profile search</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-yellow-500 hover:bg-yellow-400 text-white font-semibold"
                  onClick={() => { setUpgradeDialogPlan("pro"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'pro'}
                >
                  {subscription?.plan === 'pro' ? 'Active Plan' : subscription?.plan === 'enterprise' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'enterprise' ? 'border-purple-400 ring-2 ring-purple-400 ring-offset-2 bg-purple-50' : 'border-purple-300'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-bold">{enterprisePlan.displayName}</CardTitle>
                  {subscription?.plan === 'enterprise' && <Badge className="ml-auto text-[10px] bg-purple-500 text-white">Current</Badge>}
                </div>
                <CardDescription className="text-2xl font-black text-zinc-900">Custom<span className="text-gray-400 text-sm font-normal"> pricing</span></CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Unlimited active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>Unlimited photos</strong> per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>5 videos</strong> / virtual tours per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Negotiated featured allocation</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Brand-profile search</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 24/7 phone support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Dedicated account manager</li>
                </ul>
                {subscription?.plan === 'enterprise' ? (
                  <Button variant="outline" disabled className="w-full mt-auto">Active Plan</Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-auto border-purple-300 text-gray-700 hover:bg-purple-50"
                    onClick={() => { setUpgradeDialogPlan("enterprise"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  >
                    Contact Admin
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Dialog */}
          <Dialog open={!!upgradeDialogPlan} onOpenChange={(open) => { if (!open) setUpgradeDialogPlan(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {upgradeDialogPlan === 'enterprise' ? <Crown className="h-5 w-5 text-gray-500" /> : upgradeDialogPlan === 'pro' ? <Crown className="h-5 w-5 text-gray-500" /> : <Zap className="h-5 w-5 text-zinc-500" />}
                  Activate {upgradeDialogPlan === 'enterprise' ? 'Enterprise' : upgradeDialogPlan === 'pro' ? 'Pro' : 'Basic'} Plan
                </DialogTitle>
              </DialogHeader>
              {upgradeDialogPlan === 'enterprise' ? (
                <div className="space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">Enterprise pricing is custom and requires admin approval. Contact the inndos team to get started.</p>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-2 text-sm text-purple-800">
                    <p className="font-semibold">Enterprise includes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Unlimited listings + unlimited photos</li>
                      <li>• 5 video / virtual tours per listing</li>
                      <li>• Dedicated account manager</li>
                      <li>• Brand-profile search + 24/7 phone support</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUpgradeDialogPlan(null)}>Close</Button>
                  </DialogFooter>
                </div>
              ) : (
              <div className="space-y-5 py-2">
                <p className="text-sm text-muted-foreground">
                  {upgradeDialogPlan === 'pro'
                    ? `KES ${proPrice.toLocaleString()}/month · ${proPlan.listingLimit} listings · ${proPlan.imageLimit} photos · ${proPlan.videoLimit ?? 0} video · ${proPlan.featuredLimit ?? 0} featured listings`
                    : `KES ${basicPrice.toLocaleString()}/month · ${basicPlan.listingLimit} listings · ${basicPlan.imageLimit} photos · ${basicPlan.featuredLimit ?? 0} featured listing`}
                </p>

                {/* Billing cycle selector */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Billing Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['monthly', 'yearly', 'custom'] as const).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => setBillingCycle(cycle)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors capitalize ${billingCycle === cycle ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                      >
                        {cycle === 'yearly' ? 'Yearly' : cycle === 'monthly' ? 'Monthly' : 'Custom'}
                      </button>
                    ))}
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs text-gray-600 font-medium">
                       Save KES {upgradeDialogPlan === 'pro' ? Math.round(proPrice * 0.1 * 12) : Math.round(basicPrice * 0.1 * 12)} with yearly billing!
                    </p>
                  )}
                </div>

                {/* Custom months input */}
                {billingCycle === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Number of Months</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCustomMonths(m => Math.max(1, m - 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >−</button>
                      <span className="w-10 text-center font-bold text-lg">{customMonths}</span>
                      <button
                        onClick={() => setCustomMonths(m => Math.min(24, m + 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >+</button>
                      <span className="text-sm text-gray-500">months</span>
                    </div>
                  </div>
                )}

                {/* Price summary */}
                <div className="bg-gray-50 rounded-lg p-4 border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rate</span>
                       <span className="font-medium">KES {upgradeDialogPlan === 'pro' ? proPrice.toLocaleString() : basicPrice.toLocaleString()}/month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">
                      {billingCycle === 'monthly' ? '1 month' : billingCycle === 'yearly' ? '12 months' : `${customMonths} months`}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Yearly discount (10%)</span>
                       <span>− KES {upgradeDialogPlan === 'pro' ? Math.round(proPrice * 0.1 * 12) : Math.round(basicPrice * 0.1 * 12)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>
                      KES {(() => {
                         const base = upgradeDialogPlan === 'pro' ? proPrice : basicPrice;
                        const months = billingCycle === 'monthly' ? 1 : billingCycle === 'yearly' ? 12 : customMonths;
                        const discount = billingCycle === 'yearly' ? Math.round(base * 0.1 * 12) : 0;
                        return (base * months - discount).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              )}
              {upgradeDialogPlan !== 'enterprise' && (
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                  disabled={isUpgrading}
                  onClick={async () => {
                    if (!upgradeDialogPlan || !token) return;
                    setIsUpgrading(true);
                    try {
                      const res = await fetch("/api/subscriptions/checkout", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: upgradeDialogPlan, billingCycle, months: customMonths }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast({ title: "Checkout failed", description: data.error || "Could not initiate payment.", variant: "destructive" });
                        return;
                      }
                      window.location.href = data.redirectUrl;
                    } catch {
                      toast({ title: "Error", description: "Could not connect to payment gateway.", variant: "destructive" });
                    } finally {
                      setIsUpgrading(false);
                    }
                  }}
                >
                  {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Pay via PesaPal
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setUpgradeDialogPlan(null)} disabled={isUpgrading}>
                  Cancel
                </Button>
              </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      )}
        </div>
      </div>

      {/* Private owner management calendar dialog */}
      <Dialog open={!!calendarProperty} onOpenChange={(open) => { if (!open) setCalendarProperty(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Private Management Calendar
            </DialogTitle>
            {calendarProperty && (
              <p className="text-sm text-muted-foreground">{calendarProperty.title} · Private to you; never changes the customer display or Link-Ups.</p>
            )}
          </DialogHeader>
          {calendarProperty && (
            <ManagementCalendar propertyId={calendarProperty.id} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePropertyId} onOpenChange={(open) => { if (!open) setDeletePropertyId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently delete listing?</DialogTitle>
            <DialogDescription>This cannot be undone. The listing and its associated data will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePropertyId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletePropertyId && handleDeleteProperty(deletePropertyId)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={featureSelectionOpen} onOpenChange={setFeatureSelectionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose featured listings</DialogTitle>
            <DialogDescription>
              {subscription?.featuredRemaining ?? 0} featured slot{(subscription?.featuredRemaining ?? 0) === 1 ? "" : "s"} remain this month. Each chosen listing is highlighted for exactly seven days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {ownerProperties.filter((property: any) => property.isVerified && property.propertyStatus === "approved").length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground text-center">Approved, available listings will appear here after an administrator verifies them.</p>
            ) : ownerProperties.filter((property: any) => property.isVerified && property.propertyStatus === "approved").map((property: any) => (
              <div key={property.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{property.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                  {property.isFeatured && property.featuredUntil && new Date(property.featuredUntil) > new Date() && <p className="text-xs text-primary mt-1">Featured until {new Date(property.featuredUntil).toLocaleDateString()}</p>}
                </div>
                <Button size="sm" variant={property.isFeatured ? "secondary" : "outline"} disabled={featureLoading[property.id] || (!property.isFeatured && (subscription?.featuredRemaining ?? 0) < 1)} onClick={() => handleFeatureListing(property)}>
                  {featureLoading[property.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : property.isFeatured ? "Remove" : "Feature"}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFeatureSelectionOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialogId} onOpenChange={(open) => { if (!open) { setFlagDialogId(null); setFlagComment(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700"><AlertTriangle className="h-5 w-5" /> Flag Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">This listing will be returned to the owner as "Flagged". It will not be visible on the platform until they fix the issues and resubmit.</p>
            <div className="space-y-1">
              <Label htmlFor="flag_comment" className="text-sm font-semibold">What needs to be corrected?</Label>
              <Textarea
                id="flag_comment"
                placeholder="e.g. The photos are blurry, please upload clearer images. Also the price seems inconsistent with the description..."
                value={flagComment}
                onChange={e => setFlagComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">The owner will see exactly this message.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFlagDialogId(null); setFlagComment(""); }}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={!flagComment.trim() || isFlagging}
              onClick={handleFlag}
            >
              {isFlagging ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Flag & Return to Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!reviewModal?.open} onOpenChange={(o) => { if (!o) setReviewModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Rate Your Stay</DialogTitle>
            <DialogDescription>
              {reviewModal?.booking?.propertyTitle ?? "this property"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Star picker */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  onMouseEnter={() => setReviewHover(s)}
                  onMouseLeave={() => setReviewHover(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${s <= (reviewHover || reviewRating) ? "fill-gray-900 text-gray-900" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
            {reviewRating > 0 && (
              <p className="text-center text-sm text-gray-600 -mt-2">
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
              </p>
            )}
            {/* Comment */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-900 min-h-[80px]"
                placeholder="Tell the owner what you loved or what could be improved…"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={500}
              />
              <p className="text-[10px] text-gray-400 text-right">{reviewComment.length}/500</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewModal(null)} disabled={isSubmittingReview}>Cancel</Button>
            <Button
              disabled={reviewRating < 1 || isSubmittingReview}
              onClick={submitReview}
              className="gap-1"
            >
              {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Assign Plan dialog — at Tabs root so it opens instantly from any tab ── */}
      <Dialog open={!!assignSubDialog} onOpenChange={(open) => { if (!open) setAssignSubDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Update <span className="font-semibold">{assignSubDialog?.userName}</span>. Paid plans require the details of money already received offline; online PesaPal payments continue to activate automatically after verification.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="assign-plan">Plan</Label>
              <select
                id="assign-plan"
                value={assignSubForm.plan}
                onChange={(event) => setAssignSubForm((current) => ({ ...current, plan: event.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            {assignSubForm.plan !== "free" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-months">Months</Label>
                    <Input id="assign-months" type="number" min={1} max={120} value={assignSubForm.billingMonths} onChange={(event) => setAssignSubForm((current) => ({ ...current, billingMonths: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-amount">Amount received (KES)</Label>
                    <Input id="assign-amount" type="number" min={1} value={assignSubForm.amount} onChange={(event) => setAssignSubForm((current) => ({ ...current, amount: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assign-reference">Receipt / transaction reference</Label>
                  <Input id="assign-reference" value={assignSubForm.reference} onChange={(event) => setAssignSubForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Bank, M-Pesa, cash receipt, or card reference" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assign-method">Payment method</Label>
                  <select
                    id="assign-method"
                    value={assignSubForm.paymentMethod}
                    onChange={(event) => setAssignSubForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {assignSubForm.plan === "enterprise" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-featured">Featured listings per month</Label>
                    <Input id="assign-featured" type="number" min={0} value={assignSubForm.featuredLimitOverride} onChange={(event) => setAssignSubForm((current) => ({ ...current, featuredLimitOverride: event.target.value }))} placeholder="0" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="assign-note">Admin note (optional)</Label>
                  <Input id="assign-note" value={assignSubForm.note} onChange={(event) => setAssignSubForm((current) => ({ ...current, note: event.target.value }))} placeholder="Where or how payment was confirmed" />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignSubDialog(null)}>Cancel</Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={isAssigning}
              onClick={async () => {
                if (!assignSubDialog || !token) return;
                setIsAssigning(true);
                try {
                  const isFree = assignSubForm.plan === "free";
                  const r = await fetch(isFree ? "/api/admin/subscriptions/assign" : "/api/admin/subscriptions/offline-payment", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(isFree
                      ? { userId: assignSubDialog.userId, plan: "free" }
                      : {
                          userId: assignSubDialog.userId,
                          plan: assignSubForm.plan,
                          billingMonths: Number(assignSubForm.billingMonths),
                          amount: Number(assignSubForm.amount),
                          reference: assignSubForm.reference,
                          paymentMethod: assignSubForm.paymentMethod,
                          featuredLimitOverride: assignSubForm.featuredLimitOverride === "" ? null : Number(assignSubForm.featuredLimitOverride),
                          note: assignSubForm.note,
                        }),
                  });
                  if (r.ok) {
                    await Promise.all([fetchAdminSubscriptions(), fetchAdminPayments()]);
                     if (selectedProfileUser?.id === assignSubDialog.userId) {
                       setProfileUserSubscriptionRetry((retry) => retry + 1);
                     }
                    setAssignSubDialog(null);
                    setAssignSubForm({ plan: "free", billingMonths: "1", amount: "", reference: "", paymentMethod: "mobile_money", featuredLimitOverride: "", note: "" });
                    toast({
                      title: "Plan updated",
                      description: isFree
                        ? `${assignSubDialog.userName} is now on the Free plan.`
                        : `Offline payment recorded. ${assignSubDialog.userName} is now on the ${assignSubForm.plan.charAt(0).toUpperCase() + assignSubForm.plan.slice(1)} plan.`,
                      className: "bg-gray-50 border-gray-200 text-gray-800",
                    });
                  } else {
                    const d = await r.json();
                    toast({ title: "Failed", description: d.error, variant: "destructive" });
                  }
                } finally { setIsAssigning(false); }
              }}
            >
              {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {assignSubForm.plan === "free" ? "Move to Free" : "Record Payment & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
