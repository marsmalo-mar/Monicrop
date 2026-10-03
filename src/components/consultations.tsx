"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Send } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  Consultant,
  Conversation,
  Message as MessageData,
  User,
} from "@/lib/types";
import { displayName } from "@/lib/types";
import { DataTable } from "./data-table";
import { ActionLink, formatDate, PageHeading } from "./page-parts";
import { ErrorNotice, ImageUpload, NoteField, request } from "./form-controls";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import {
  Message,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "./ui/message";
import { Bubble, BubbleContent } from "./ui/bubble";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./ui/message-scroller";
export function Consultations({
  user,
  consultants,
  conversations,
}: {
  user: User;
  consultants: Consultant[];
  conversations: Conversation[];
}) {
  const columns: ColumnDef<Conversation>[] = [
    {
      accessorKey: "name",
      header: "Contact",
      cell: ({ getValue }) => (
        <strong className="font-semibold">{getValue<string>()}</strong>
      ),
    },
    {
      accessorKey: "message",
      header: "Latest message",
      cell: ({ getValue }) => (
        <p className="truncate max-w-[280px]">{getValue<string>()}</p>
      ),
    },
    {
      accessorKey: "cons_date",
      header: "Last activity",
      cell: ({ getValue }) => formatDate(getValue<string>(), true),
    },
    {
      accessorKey: "unread",
      header: "Status",
      cell: ({ getValue }) =>
        getValue<number>() ? (
          <Badge>{getValue<number>()} unread</Badge>
        ) : (
          <Badge variant="secondary">Read</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionLink
          href={`/consultations/${row.original.cons_ID}/${row.original.user_ID}`}
          variant="outline"
        >
          Open conversation
        </ActionLink>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title={
          user.user_type === "client" ? "Consultations" : "Consultation inbox"
        }
        description={
          user.user_type === "client"
            ? "Connect with agricultural consultants for practical crop guidance."
            : "Read questions from farmers and share your agricultural expertise."
        }
      />
      {user.user_type === "client" && (
        <section className="mb-9">
          <h2 className="text-xl font-semibold mb-4">Find a consultant</h2>
          {consultants.length ? (
            <div className="consultant-list">
              {consultants.map((person) => (
                <article key={person.cons_ID} className="consultant-entry">
                  <div>
                    <h3>{person.prof_name}</h3>
                    <p className="mt-1 font-medium text-primary">
                      {person.expertise}
                    </p>
                  </div>
                  <p>{person.description}</p>
                  <p className="text-xs">{person.certificate}</p>
                  <ActionLink
                    href={`/consultations/${person.cons_ID}/${user.user_ID}`}
                    variant="outline"
                  >
                    Start conversation
                  </ActionLink>
                </article>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No consultants available yet</EmptyTitle>
                <EmptyDescription>
                  Consultants will appear here after completing their
                  credentials.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      )}
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold">
          {user.user_type === "client"
            ? "Your conversations"
            : "Client conversations"}
        </h2>
      </div>
      <DataTable
        data={conversations}
        columns={columns}
        searchLabel="Search your conversations"
        emptyTitle="No conversations yet"
        emptyDescription={
          user.user_type === "client"
            ? "Choose a consultant above to ask your first question."
            : "Farmer questions will appear here when a conversation is started."
        }
      />
    </>
  );
}
export function ConversationView({
  user,
  consultant,
  farmer,
  messages,
}: {
  user: User;
  consultant: Consultant;
  farmer: User;
  messages: MessageData[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const url = `/api/conversations/${consultant.cons_ID}/${farmer.user_ID}`;
  const lastIncomingId = messages.reduce(
    (last, message) =>
      message.tmp_ID === (user.user_type === "client" ? 2 : 1)
        ? Math.max(last, message.msg_no)
        : last,
    0,
  );
  useEffect(() => {
    request(`${url}/read`, "POST").catch((error) =>
      setError(
        error instanceof Error
          ? error.message
          : "Could not mark messages as read. Refresh and try again.",
      ),
    );
  }, [url, lastIncomingId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await request(url, "POST", { ...data, pictu: image });
      form.reset();
      setImage(null);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="mb-5">
        <ActionLink href="/consultations" variant="ghost">
          <ArrowLeft data-icon="inline-start" />
          All consultations
        </ActionLink>
      </div>
      <PageHeading
        title={
          user.user_type === "client"
            ? consultant.prof_name
            : displayName(farmer)
        }
        description={consultant.expertise || "Agricultural consultation"}
      >
        <Button variant="outline" onClick={() => router.refresh()}>
          <RefreshCw data-icon="inline-start" />
          Refresh messages
        </Button>
      </PageHeading>
      <section className="panel max-w-[950px]">
        <div className="h-[min(45dvh,440px)] min-h-[240px] mb-6">
          <MessageScrollerProvider defaultScrollPosition="end">
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.length ? (
                    messages.map((message) => {
                      const own =
                        (user.user_type === "client" ? 1 : 2) ===
                        message.tmp_ID;
                      return (
                        <MessageScrollerItem
                          key={message.msg_no}
                          messageId={String(message.msg_no)}
                        >
                          <Message align={own ? "end" : "start"}>
                            <MessageContent>
                              <MessageHeader>{message.sender}</MessageHeader>
                              <Bubble variant={own ? "default" : "secondary"}>
                                <BubbleContent>
                                  <p className="whitespace-pre-wrap">
                                    {message.message}
                                  </p>
                                  {message.pictu && (
                                    <Image
                                      src={`/api/media?path=${encodeURIComponent(message.pictu)}`}
                                      alt="Consultation attachment"
                                      width={420}
                                      height={280}
                                      unoptimized
                                      className="max-w-full h-auto mt-3 rounded-lg"
                                    />
                                  )}
                                </BubbleContent>
                              </Bubble>
                              <MessageFooter>
                                {formatDate(message.cons_date, true)}
                                {own && ` · ${message.status}`}
                              </MessageFooter>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      );
                    })
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Start the conversation</EmptyTitle>
                        <EmptyDescription>
                          Describe your crop and the question you would like
                          advice on.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>
        <ErrorNotice error={error} />
        <form onSubmit={submit}>
          <FieldGroup>
            <NoteField
              name="message"
              label="Your message"
              required
              rows={3}
              maxLength={10000}
              placeholder="Write your question or reply…"
            />
            <ImageUpload
              label="Attach a crop photo"
              value={image}
              onChange={setImage}
              onBusy={setUploading}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || uploading}>
                <Send data-icon="inline-start" />
                {pending ? "Sending…" : "Send message"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </section>
    </>
  );
}
