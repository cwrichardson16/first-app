"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updateSettings, deleteAccount } from "@/app/actions/settings";
import type { UserSettings } from "@/types/database";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export function ProfileForm({ settings }: { settings: UserSettings }) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const res = await updateSettings(fd);
    setPending(false);
    if (res.error) toast({ title: "Save failed", description: res.error, variant: "destructive" });
    else toast({ title: "Profile saved" });
  }

  async function onDelete() {
    if (!confirm("Delete your account and ALL data? This cannot be undone.")) return;
    if (!confirm("Really sure? Type the confirmation again.")) return;
    const res = await deleteAccount();
    if (res?.error) toast({ title: "Delete failed", description: res.error, variant: "destructive" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-xs text-muted-foreground">
              Display name
            </Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={settings.display_name ?? ""}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-xs text-muted-foreground">
              Timezone
            </Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Units</Label>
            <p className="text-sm">
              Imperial (lbs / oz). Metric coming soon.
              <input type="hidden" name="units" value="imperial" />
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t space-y-3">
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit" className="w-full">
              Sign out
            </Button>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer text-destructive">Danger zone</summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data.
              </p>
              <Button variant="destructive" onClick={onDelete} type="button">
                Delete account
              </Button>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
