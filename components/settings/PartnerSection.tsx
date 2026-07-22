"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { generateInviteCode, redeemInviteCode, unlinkPartner } from "@/app/actions/partner";

interface PartnerSectionProps {
  hasPartner: boolean;
  partnerName: string | null;
}

export function PartnerSection({ hasPartner, partnerName }: PartnerSectionProps) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [redeemCode, setRedeemCode] = React.useState("");
  const [linked, setLinked] = React.useState(hasPartner);
  const [displayName, setDisplayName] = React.useState(partnerName);

  async function handleGenerate() {
    setPending(true);
    const res = await generateInviteCode();
    setPending(false);
    if ("error" in res) {
      toast({ title: "Failed to generate code", description: res.error, variant: "destructive" });
    } else {
      setInviteCode(res.code);
      toast({ title: "Invite code generated" });
    }
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) {
      toast({ title: "Enter a code", description: "Please enter a partner invite code.", variant: "destructive" });
      return;
    }
    setPending(true);
    const res = await redeemInviteCode(redeemCode.trim());
    setPending(false);
    if ("error" in res) {
      toast({ title: "Link failed", description: res.error, variant: "destructive" });
    } else {
      setLinked(true);
      setRedeemCode("");
      setInviteCode(null);
      toast({ title: "Partner linked!" });
    }
  }

  async function handleUnlink() {
    if (!confirm("Unlink your partner? You will no longer be able to view each other's data.")) return;
    setPending(true);
    const res = await unlinkPartner();
    setPending(false);
    if ("error" in res) {
      toast({ title: "Unlink failed", description: res.error, variant: "destructive" });
    } else {
      setLinked(false);
      setDisplayName(null);
      toast({ title: "Partner unlinked" });
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the code manually.", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Partner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {linked ? (
          <div className="space-y-3">
            <p className="text-sm">
              Linked with <span className="font-medium">{displayName ?? "your partner"}</span>
            </p>
            <Button variant="destructive" onClick={handleUnlink} disabled={pending}>
              {pending ? "Unlinking..." : "Unlink partner"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link with a partner to view each other's food, workouts, and progress.
            </p>

            {/* Generate invite code */}
            <div className="space-y-2">
              <Button onClick={handleGenerate} disabled={pending} variant="outline" className="w-full">
                {pending ? "Generating..." : "Generate invite code"}
              </Button>
              {inviteCode && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-center font-mono text-lg tracking-widest">
                    {inviteCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    Copy
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Redeem invite code */}
            <div className="space-y-2">
              <Label htmlFor="partner_code" className="text-xs text-muted-foreground">
                Enter partner's invite code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="partner_code"
                  placeholder="e.g. AbC12xYz"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  maxLength={20}
                />
                <Button onClick={handleRedeem} disabled={pending || !redeemCode.trim()}>
                  {pending ? "Linking..." : "Link"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
