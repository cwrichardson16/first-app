"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deletePhoto, updatePhoto } from "@/app/actions/photo";

export type PhotoItem = {
  id: string;
  photo_date: string;
  pose: string;
  weight_at_time: number | null;
  notes?: string | null;
  url: string;
};

export function PhotoGrid({ photos }: { photos: PhotoItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [compareMode, setCompareMode] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [view, setView] = React.useState<PhotoItem | null>(null);
  const [editing, setEditing] = React.useState<PhotoItem | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    const res = await deletePhoto(id);
    if (res.error) {
      toast({ title: "Delete failed", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Photo deleted" });
      setView(null);
      router.refresh();
    }
  }

  if (photos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border border-dashed rounded-lg">
        No photos yet. Upload one to start tracking visually.
      </div>
    );
  }

  const comparePair =
    compareMode && selected.length === 2
      ? (selected
          .map((id) => photos.find((p) => p.id === id))
          .filter(Boolean) as PhotoItem[])
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{photos.length} photos</p>
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setCompareMode((v) => !v);
            setSelected([]);
          }}
        >
          {compareMode ? "Done" : "Compare"}
        </Button>
      </div>

      {compareMode && (
        <p className="text-xs text-muted-foreground">
          Select 2 photos to compare. {selected.length}/2 selected.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => (compareMode ? toggle(p.id) : setView(p))}
              className={`relative aspect-square rounded-lg overflow-hidden bg-muted ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`${p.pose} ${p.photo_date}`}
                className="object-cover w-full h-full"
                loading="lazy"
              />
              <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 px-1 rounded tabular-nums truncate">
                {format(parseISO(p.photo_date), "MMM d")}
                {p.weight_at_time !== null && ` \u00b7 ${p.weight_at_time}lb`}
              </span>
              {isSelected && (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {selected.indexOf(p.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compare view */}
      <Dialog open={!!comparePair} onOpenChange={(v) => !v && setSelected([])}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogTitle className="sr-only">Compare photos</DialogTitle>
          {comparePair && (
            <div className="grid grid-cols-2 gap-2">
              {comparePair.map((p) => (
                <div key={p.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full rounded-lg" />
                  <p className="text-xs text-center tabular-nums">
                    {format(parseISO(p.photo_date), "MMM d, yyyy")}
                    {p.weight_at_time !== null && ` \u00b7 ${p.weight_at_time} lb`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single view */}
      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {view && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.url} alt="" className="w-full rounded-lg" />
              <div className="flex items-center justify-between">
                <p className="text-sm tabular-nums">
                  {format(parseISO(view.photo_date), "EEEE, MMM d, yyyy")} \u00b7 {view.pose}
                  {view.weight_at_time !== null && ` \u00b7 ${view.weight_at_time} lb`}
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setView(null); setEditing(view); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(view.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="hidden" />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editing && (
        <EditPhotoDialog
          photo={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditPhotoDialog({
  photo,
  onClose,
}: {
  photo: PhotoItem;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [pose, setPose] = React.useState(photo.pose);
  const [weight, setWeight] = React.useState(photo.weight_at_time?.toString() ?? "");
  const [notes, setNotes] = React.useState(photo.notes ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await updatePhoto(photo.id, {
      pose,
      weight_at_time: weight === "" ? null : Number(weight),
      notes: notes.trim() || null,
    });
    setPending(false);
    if (res?.error) {
      toast({ title: "Save failed", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Photo updated" });
      router.refresh();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit photo</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Pose</Label>
            <select
              value={pose}
              onChange={(e) => setPose(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Weight at time</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving\u2026" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
