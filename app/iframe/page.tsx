import { getIframeConfigForBot } from "@/lib/queries/cached-queries";
import { IframeWrapper } from "@/components/iframe/wrapper";
import { Metadata } from "next";

interface Params {
  searchParams: Promise<{
    botId?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Chat Bot",
  description: "Interactive chat interface",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default async function IframePage({ searchParams }: Params) {
  const { botId } = await searchParams;

  if (!botId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 bg-white">
        <div className="text-center max-w-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Error: No Bot ID Provided
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2">
            Please include a botId parameter in the URL.
          </p>
        </div>
      </div>
    );
  }

  let config = {};
  try {
    const response = await getIframeConfigForBot(botId);
    if (response.success && response.data) {
      config = response.data;
    }
  } catch (error) {
    console.error("Error fetching iframe config:", error);
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <IframeWrapper botId={botId} config={config} />
    </div>
  );
}
