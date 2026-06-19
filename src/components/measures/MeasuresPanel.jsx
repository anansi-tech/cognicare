"use client";
import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MeasureForm } from "./MeasureForm";
import { MeasureTrend } from "./MeasureTrend";

export function MeasuresPanel({ clientId, sessionId, onSaved: onSavedProp }) {
  const [instruments, setInstruments] = useState([]);
  const [chosenId, setChosenId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/instruments")
      .then((r) => r.json())
      .then((list) => {
        setInstruments(list);
        if (list.length > 0) setChosenId((id) => id || list[0].id);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1 sm:flex-1">
          <span className="text-sm font-medium text-gray-700">Administer measure</span>
          <Select value={chosenId} onValueChange={setChosenId}>
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder="Choose a measure">
                {(value) => {
                  const inst = instruments.find((i) => i.id === value);
                  return inst ? `${inst.name} (${inst.construct})` : "Choose a measure";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {instruments.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} ({i.construct})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} disabled={!chosenId}>
          Start
        </Button>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:w-[28rem]">
          <SheetHeader>
            <SheetTitle>
              {instruments.find((i) => i.id === chosenId)?.name ?? "Measure"}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {chosenId && formOpen && (
              <MeasureForm
                clientId={clientId}
                instrumentId={chosenId}
                sessionId={sessionId}
                onSaved={() => { setRefreshKey((k) => k + 1); onSavedProp?.(chosenId); }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {instruments.map((i) => (
          <MeasureTrend
            key={i.id}
            clientId={clientId}
            instrumentId={i.id}
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </div>
  );
}
