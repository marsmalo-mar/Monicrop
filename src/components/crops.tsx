"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Crop, CropLog } from "@/lib/types";
import { DataTable } from "./data-table";
import {
  ActionLink,
  DeleteRecord,
  formatDate,
  PageHeading,
} from "./page-parts";
import { ErrorNotice, request, TextField } from "./form-controls";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Badge } from "./ui/badge";
export function Crops({ crops }: { crops: Crop[] }) {
  const columns: ColumnDef<Crop>[] = [
    {
      accessorKey: "cropname",
      header: "Crop",
      cell: ({ row }) => (
        <div>
          <strong className="font-semibold">{row.original.cropname}</strong>
          <p className="text-xs text-muted-foreground mt-1">
            {row.original.log_count || 0} care logs
          </p>
        </div>
      ),
    },
    { accessorKey: "variant", header: "Variety" },
    {
      accessorKey: "dateplanted",
      header: "Date planted",
      cell: ({ getValue }) => formatDate(getValue<string>()),
    },
    { accessorKey: "crop_location", header: "Location" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionLink href={`/crops/${row.original.cropID}`} variant="outline">
          View crop
        </ActionLink>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="My crops"
        description="Keep planting details and field activity together."
      >
        <ActionLink href="/crops/new">
          <Plus data-icon="inline-start" />
          Add crop
        </ActionLink>
      </PageHeading>
      <DataTable
        data={crops}
        columns={columns}
        searchLabel="Search crop, variety, or location"
        emptyTitle="Your growing season starts here"
        emptyDescription="Add your first crop to record its planting details and track care from planting to harvest."
      />
    </>
  );
}
export function CropForm({ crop }: { crop?: Crop }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await request(
        `/api/crops${crop ? `/${crop.cropID}` : ""}`,
        crop ? "PATCH" : "POST",
        data,
      );
      router.push(`/crops/${result.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        title={crop ? "Edit crop" : "Add a crop"}
        description="Record what you planted, when you planted it, and where it is growing."
      />
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorNotice error={error} />
        <FieldGroup>
          <div className="form-grid">
            <TextField
              label="Crop name"
              name="cropname"
              defaultValue={crop?.cropname}
              maxLength={100}
              placeholder="e.g. Rice"
              required
            />
            <TextField
              label="Variety"
              name="variant"
              defaultValue={crop?.variant}
              maxLength={100}
              placeholder="e.g. Jasmine"
            />
            <TextField
              label="Date planted"
              name="dateplanted"
              type="date"
              defaultValue={crop?.dateplanted}
              required
            />
            <TextField
              label="Field or location"
              name="crop_location"
              defaultValue={crop?.crop_location}
              maxLength={255}
              placeholder="e.g. North rice field"
              required
            />
          </div>
        </FieldGroup>
        <div className="form-actions">
          <ActionLink
            href={crop ? `/crops/${crop.cropID}` : "/crops"}
            variant="outline"
          >
            Cancel
          </ActionLink>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save crop"}
          </Button>
        </div>
      </form>
    </>
  );
}
export function CropDetail({ crop, logs }: { crop: Crop; logs: CropLog[] }) {
  const columns: ColumnDef<CropLog>[] = [
    {
      accessorKey: "log_date",
      header: "Recorded",
      cell: ({ getValue }) => formatDate(getValue<string>(), true),
    },
    {
      accessorKey: "growth_stage",
      header: "Growth stage",
      cell: ({ getValue }) => (
        <Badge variant="secondary">{getValue<string>()}</Badge>
      ),
    },
    { accessorKey: "weather", header: "Weather" },
    {
      accessorKey: "temperature",
      header: "Temperature",
      cell: ({ getValue }) => `${getValue<string>()} °C`,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ getValue }) => (
        <p className="max-w-[220px] truncate">{getValue<string>() || "—"}</p>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionLink
          href={`/crops/${crop.cropID}/logs/${row.original.logID}`}
          variant="outline"
        >
          View log
        </ActionLink>
      ),
    },
  ];
  return (
    <>
      <div className="mb-5">
        <ActionLink href="/crops" variant="ghost">
          <ArrowLeft data-icon="inline-start" />
          All crops
        </ActionLink>
      </div>
      <PageHeading
        title={crop.cropname}
        description="Planting details and care activity for this crop."
      >
        <div className="flex gap-2">
          <ActionLink href={`/crops/${crop.cropID}/edit`} variant="outline">
            Edit crop
          </ActionLink>
          <DeleteRecord
            url={`/api/crops/${crop.cropID}`}
            label="Delete crop"
            description="This permanently deletes the crop and all of its care logs."
            redirectTo="/crops"
          />
        </div>
      </PageHeading>
      <dl className="detail-strip">
        <div>
          <dt>Variety</dt>
          <dd>{crop.variant || "—"}</dd>
        </div>
        <div>
          <dt>Planted</dt>
          <dd>{formatDate(crop.dateplanted)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{crop.crop_location}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">Care logs</h2>
        <ActionLink href={`/crops/${crop.cropID}/logs/new`}>
          <Plus data-icon="inline-start" />
          Add care log
        </ActionLink>
      </div>
      <DataTable
        data={logs}
        columns={columns}
        searchLabel="Search care logs"
        emptyTitle="Keep a record of crop care"
        emptyDescription="Add a care log to track growth, weather, watering, fertilizer, pests, and harvest."
      />
    </>
  );
}
