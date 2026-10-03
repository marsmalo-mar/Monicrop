"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Crop, CropLog } from "@/lib/types";
import { FieldGroup, FieldSet, FieldLegend } from "./ui/field";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "./ui/empty";
import {
  ActionLink,
  DeleteRecord,
  formatDate,
  PageHeading,
} from "./page-parts";
import {
  Choice,
  ErrorNotice,
  ImageUpload,
  NoteField,
  request,
  TextField,
} from "./form-controls";
export function localNow() {
  const now = new Date();
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(now)
    .replace(" ", "T");
}
export function LogForm({ crop, log }: { crop: Crop; log?: CropLog }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<string | null>(log?.image ?? null);
  const [fertilized, setFertilized] = useState(log?.fertilized || "no");
  const [pests, setPests] = useState(log?.pest_atk || "no");
  const [harvest, setHarvest] = useState(log?.harvest || "no");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const values = {
      lastFertilization_date: "",
      fertilizer_name: "",
      pest_kind: "",
      lastPesticide_date: "",
      pesticide_solution: "",
      harvest_date: "",
      ...data,
      image,
    };
    try {
      await request(
        `/api/crops/${crop.cropID}/logs${log ? `/${log.logID}` : ""}`,
        log ? "PATCH" : "POST",
        values,
      );
      router.push(`/crops/${crop.cropID}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        title={log ? "Edit care log" : "Add care log"}
        description={`Record growing conditions and crop care for ${crop.cropname}.`}
      />
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorNotice error={error} />
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Growing conditions</FieldLegend>
            <div className="form-grid">
              <TextField
                label="Recorded at"
                name="log_date"
                type="datetime-local"
                defaultValue={
                  log?.log_date.replace(" ", "T").slice(0, 16) || localNow()
                }
                required
              />
              <TextField
                label="Growth stage"
                name="growth_stage"
                defaultValue={log?.growth_stage}
                placeholder="e.g. Vegetative"
                maxLength={100}
                required
              />
              <TextField
                label="Temperature (°C)"
                name="temperature"
                type="number"
                min={-99}
                max={99}
                step="0.01"
                defaultValue={log?.temperature}
                required
              />
              <Choice
                label="Weather"
                name="weather"
                options={[
                  ...new Set([
                    log?.weather || "sunny",
                    "sunny",
                    "cloudy",
                    "rainy",
                    "extremely sunny",
                  ]),
                ]}
                defaultValue={log?.weather}
              />
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Watering and fertilizer</FieldLegend>
            <div className="form-grid">
              <TextField
                label="Last watering date"
                name="lastWatering_date"
                type="date"
                defaultValue={log?.lastWatering_date}
              />
              <Choice
                label="Fertilizer applied?"
                name="fertilized"
                options={["no", "yes"]}
                defaultValue={fertilized}
                onValueChange={setFertilized}
              />
              {fertilized === "yes" && (
                <>
                  <TextField
                    label="Fertilizer name"
                    name="fertilizer_name"
                    defaultValue={log?.fertilizer_name}
                    maxLength={100}
                    required
                  />
                  <TextField
                    label="Last fertilizer application"
                    name="lastFertilization_date"
                    type="date"
                    defaultValue={log?.lastFertilization_date}
                    required
                  />
                </>
              )}
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Pests and harvest</FieldLegend>
            <div className="form-grid">
              <Choice
                label="Pest attack observed?"
                name="pest_atk"
                options={["no", "yes"]}
                defaultValue={pests}
                onValueChange={setPests}
              />
              <Choice
                label="Harvested?"
                name="harvest"
                options={["no", "yes"]}
                defaultValue={harvest}
                onValueChange={setHarvest}
              />
              {pests === "yes" && (
                <>
                  <TextField
                    label="Pest type"
                    name="pest_kind"
                    defaultValue={log?.pest_kind}
                    maxLength={100}
                  />
                  <TextField
                    label="Pesticide solution"
                    name="pesticide_solution"
                    defaultValue={log?.pesticide_solution}
                    maxLength={100}
                  />
                  <TextField
                    label="Last pesticide application"
                    name="lastPesticide_date"
                    type="date"
                    defaultValue={log?.lastPesticide_date}
                  />
                </>
              )}
              {harvest === "yes" && (
                <TextField
                  label="Harvest date"
                  name="harvest_date"
                  type="date"
                  defaultValue={log?.harvest_date}
                  required
                />
              )}
            </div>
          </FieldSet>
          <NoteField
            label="Notes"
            name="notes"
            rows={4}
            maxLength={10000}
            defaultValue={log?.notes}
            placeholder="What did you observe or do for this crop?"
          />
          <ImageUpload
            label="Crop photo"
            value={image}
            onChange={setImage}
            onBusy={setUploading}
          />
        </FieldGroup>
        <div className="form-actions">
          <ActionLink href={`/crops/${crop.cropID}`} variant="outline">
            Cancel
          </ActionLink>
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Saving…" : "Save care log"}
          </Button>
        </div>
      </form>
    </>
  );
}
export function LogDetail({ crop, log }: { crop: Crop; log: CropLog }) {
  const details = [
    ["Temperature", `${log.temperature} °C`],
    ["Weather", log.weather],
    ["Last watering", formatDate(log.lastWatering_date)],
    ["Fertilizer applied", log.fertilized],
    ["Fertilizer", log.fertilizer_name],
    ["Last fertilization", formatDate(log.lastFertilization_date)],
    ["Pest attack", log.pest_atk],
    ["Pest type", log.pest_kind],
    ["Pesticide solution", log.pesticide_solution],
    ["Last pesticide application", formatDate(log.lastPesticide_date)],
    ["Harvested", log.harvest],
    ["Harvest date", formatDate(log.harvest_date)],
  ];
  return (
    <>
      <div className="mb-5">
        <ActionLink href={`/crops/${crop.cropID}`} variant="ghost">
          <ArrowLeft data-icon="inline-start" />
          Back to {crop.cropname}
        </ActionLink>
      </div>
      <PageHeading
        title="Care log"
        description={`${crop.cropname} · ${formatDate(log.log_date, true)}`}
      >
        <div className="flex gap-2">
          <ActionLink
            href={`/crops/${crop.cropID}/logs/${log.logID}/edit`}
            variant="outline"
          >
            Edit log
          </ActionLink>
          <DeleteRecord
            url={`/api/crops/${crop.cropID}/logs/${log.logID}`}
            label="Delete log"
            description="This permanently deletes this care log."
            redirectTo={`/crops/${crop.cropID}`}
          />
        </div>
      </PageHeading>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <section className="panel">
          <div className="flex items-center gap-3 mb-5">
            <h2>Growing conditions</h2>
            <Badge variant="secondary">{log.growth_stage}</Badge>
          </div>
          <dl className="grid sm:grid-cols-2 gap-5">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground mb-1">{label}</dt>
                <dd className="text-sm font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <h3 className="font-semibold mt-7 mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {log.notes || "No additional notes were recorded."}
          </p>
        </section>
        <aside className="panel">
          <h2 className="mb-5">Crop photo</h2>
          {log.image ? (
            <Image
              src={`/api/media?path=${encodeURIComponent(log.image)}`}
              alt={`${crop.cropname} at ${log.growth_stage} stage`}
              width={700}
              height={500}
              unoptimized
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No photo attached</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          <div className="mt-7">
            <h3 className="font-semibold">Need advice?</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Discuss weather, pests, or crop care with a consultant.
            </p>
            <ActionLink href="/consultations">Consult an expert</ActionLink>
          </div>
        </aside>
      </div>
    </>
  );
}
