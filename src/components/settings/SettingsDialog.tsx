"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreferences } from "@/features/preferences/usePreferences";
import {
  useSectionOrder,
  useUpdatePreferences,
  type SectionKey,
} from "@/features/preferences/useSectionOrder";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SortableItem } from "./SortableItem";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SECTION_LABELS: Record<SectionKey, string> = {
  account: "Account",
  category: "Category",
  subcategory: "Subcategory",
  amount: "Amount",
  description: "Description",
};

export function SettingsDialog({ open, onOpenChange }: Props) {
  const { theme, updateTheme } = usePreferences();

  // Section order state
  const { data: serverOrderArray } = useSectionOrder();
  // Theme is handled via usePreferences(); no separate theme query
  const initialOrder = Array.isArray(serverOrderArray) ? serverOrderArray : [];
  const [order, setOrder] = useState<SectionKey[]>(() =>
    initialOrder.length ? initialOrder : []
  );
  const [activeId, setActiveId] = useState<SectionKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updatePreferences = useUpdatePreferences();

  useEffect(() => {
    if (Array.isArray(serverOrderArray) && open)
      setOrder(serverOrderArray as SectionKey[]);
  }, [serverOrderArray, open]);

  const canSave = useMemo(() => {
    const so = Array.isArray(serverOrderArray) ? serverOrderArray : null;
    if (!so) return false;
    if (order.length !== so.length) return true;
    return order.some((k, i) => k !== so[i]);
  }, [order, serverOrderArray]);

  function move(idx: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  function resetToDefault() {
    const so = Array.isArray(serverOrderArray) ? serverOrderArray : null;
    if (!so) return;
    // rely on hook defaulting logic by clearing to server default if it had one,
    // or derive from labels order fallback
    setOrder(
      (so as SectionKey[]) ?? [
        "account",
        "category",
        "subcategory",
        "amount",
        "description",
      ]
    );
  }

  async function handleSave() {
    try {
      await updatePreferences.mutateAsync({ section_order: order });
    } catch (e) {
      // Swallow; toast could be added later
      console.error(e);
    }
  }

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as SectionKey);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id as SectionKey);
        const newIndex = items.indexOf(over.id as SectionKey);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Personalize your appearance and layout preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Theme</h3>
                <p className="text-xs text-muted-foreground">
                  Choose how the app looks on your device.
                </p>
              </div>
              <RadioGroup
                value={theme}
                onValueChange={(v) => updateTheme(v as any)}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ].map((opt) => (
                  <div
                    key={opt.value}
                    className="flex items-center gap-2 rounded-md border p-3"
                  >
                    <RadioGroupItem
                      id={`theme-${opt.value}`}
                      value={opt.value}
                    />
                    <Label htmlFor={`theme-${opt.value}`}>{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Expense form order</h3>
                <p className="text-xs text-muted-foreground">
                  Drag and drop sections to reorder your expense form layout.
                </p>
              </div>

              <Separator className="my-4" />

              <div className="relative h-[280px] border rounded-md">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  modifiers={[restrictToParentElement, restrictToVerticalAxis]}
                >
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {!serverOrderArray || serverOrderArray.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                          Loading preferences...
                        </div>
                      ) : (
                        <SortableContext
                          items={order}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="space-y-3">
                            {order.map((key) => (
                              <SortableItem key={key} id={key}>
                                {SECTION_LABELS[key]}
                              </SortableItem>
                            ))}
                          </ul>
                        </SortableContext>
                      )}
                    </div>
                  </ScrollArea>
                  {/* DragOverlay removed. Using modifiers to constrain drag within the container. */}
                </DndContext>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset order
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || updatePreferences.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updatePreferences.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
