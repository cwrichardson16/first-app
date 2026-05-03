"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { resizeImageForUpload } from "@/lib/image";
import { recordPhoto } from "@/app/actions/photo";

export function UploadButton({
  defaultDate,
  defaultWeight,
}: {
  defaultDate: string;
  defaultWeight: number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [date, setDate] = React.useState(defaultDate);
  const [pose, setPose] = React.useState<"front" | "side" | "back" | "other">("front");
  const [weight, setWeight] = React.useState<string>(defaultWeight?.toString() ?? "");
  const [pending, setPending] = React.useState(false);

  async function onSubmit() {
    if (!file) {
      toast({ title: "Select a photo first", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const blob = await resizeImageForUpload(file);
      const fname = `${crypto.randomUUID()}.jpg`;
      const path = `${u.user.id}/${fname}`;
      const { error: upErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const res = await recordPhoto({
        photo_date: date,
        storage_path: path,
        pose,
        weight_at_time: weight === "" ? null : parseFloat(weight),
      });
      if (res?.error) throw new Error(res.error);
      toast({ title: "Photo uploaded" });
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Couldn't upload", description: msg, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4 mr-1" /> Upload
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload progress photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="photo-date">Date</Label>
                <Input
                  id="photo-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pose</Label>
                <Select value={pose} onValueChange={(v) => setPose(v as typeof pose)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">Front</SelectItem>
                    <SelectItem value="side">Side</SelectItem>
                    <SelectItem value="back">Back</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-weight">Weight at time (optional)</Label>
              <Input
                id="photo-weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={defaultWeight?.toString() ?? "—"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
